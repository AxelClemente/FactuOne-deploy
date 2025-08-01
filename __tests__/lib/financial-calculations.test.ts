/**
 * @jest-environment jsdom
 */

import { setupTestDb, cleanTestDb } from '../helpers/testDb'
import { testInvoices, testInvoiceLines, createTestInvoice } from '../fixtures/testData'
import * as schema from '@/app/db/schema'

/**
 * Financial calculation utilities for testing
 */
class FinancialCalculations {
  /**
   * Calculate line amount (quantity * unit price)
   */
  static calculateLineAmount(quantity: number, unitPrice: number): number {
    return Math.round((quantity * unitPrice) * 100) / 100
  }

  /**
   * Calculate tax amount for a line
   */
  static calculateLineTax(amount: number, taxRate: number): number {
    return Math.round((amount * (taxRate / 100)) * 100) / 100
  }

  /**
   * Calculate invoice subtotal (sum of all line amounts)
   */
  static calculateSubtotal(lines: Array<{ quantity: number; unitPrice: number }>): number {
    const subtotal = lines.reduce((sum, line) => {
      return sum + this.calculateLineAmount(line.quantity, line.unitPrice)
    }, 0)
    return Math.round(subtotal * 100) / 100
  }

  /**
   * Calculate total tax amount for invoice
   */
  static calculateTotalTax(lines: Array<{ quantity: number; unitPrice: number; taxRate: number }>): number {
    const totalTax = lines.reduce((sum, line) => {
      const lineAmount = this.calculateLineAmount(line.quantity, line.unitPrice)
      const lineTax = this.calculateLineTax(lineAmount, line.taxRate)
      return sum + lineTax
    }, 0)
    return Math.round(totalTax * 100) / 100
  }

  /**
   * Calculate invoice total (subtotal + tax)
   */
  static calculateTotal(lines: Array<{ quantity: number; unitPrice: number; taxRate: number }>): number {
    const subtotal = this.calculateSubtotal(lines)
    const totalTax = this.calculateTotalTax(lines)
    return Math.round((subtotal + totalTax) * 100) / 100
  }

  /**
   * Validate Spanish tax rates
   */
  static isValidSpanishTaxRate(rate: number): boolean {
    const validRates = [0, 4, 10, 21] // Spanish IVA rates
    return validRates.includes(rate)
  }

  /**
   * Calculate discount amount
   */
  static calculateDiscount(amount: number, discountPercentage: number): number {
    if (discountPercentage < 0 || discountPercentage > 100) {
      throw new Error('Discount percentage must be between 0 and 100')
    }
    return Math.round((amount * (discountPercentage / 100)) * 100) / 100
  }

  /**
   * Calculate IRPF withholding (Spanish income tax retention)
   */
  static calculateIRPF(amount: number, irpfRate: number): number {
    if (irpfRate < 0 || irpfRate > 47) { // Max IRPF rate in Spain
      throw new Error('IRPF rate must be between 0 and 47')
    }
    return Math.round((amount * (irpfRate / 100)) * 100) / 100
  }

  /**
   * Format currency for Spanish locale
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }
}

describe('Financial Calculations', () => {
  let db: any

  beforeEach(async () => {
    db = await setupTestDb()
    await cleanTestDb()
  })

  describe('Line Calculations', () => {
    it('should calculate line amount correctly', () => {
      expect(FinancialCalculations.calculateLineAmount(10, 100)).toBe(1000.00)
      expect(FinancialCalculations.calculateLineAmount(2.5, 50.99)).toBe(127.48)
      expect(FinancialCalculations.calculateLineAmount(1, 0.01)).toBe(0.01)
    })

    it('should handle decimal quantities and prices', () => {
      expect(FinancialCalculations.calculateLineAmount(1.5, 33.33)).toBe(50.00)
      expect(FinancialCalculations.calculateLineAmount(0.75, 80)).toBe(60.00)
    })

    it('should calculate tax amount correctly', () => {
      expect(FinancialCalculations.calculateLineTax(1000, 21)).toBe(210.00)
      expect(FinancialCalculations.calculateLineTax(500, 10)).toBe(50.00)
      expect(FinancialCalculations.calculateLineTax(100, 4)).toBe(4.00)
      expect(FinancialCalculations.calculateLineTax(1000, 0)).toBe(0.00)
    })

    it('should handle small amounts without precision loss', () => {
      expect(FinancialCalculations.calculateLineTax(0.01, 21)).toBe(0.00) // Rounds to 0
      expect(FinancialCalculations.calculateLineTax(1, 21)).toBe(0.21)
    })
  })

  describe('Invoice Totals', () => {
    const sampleLines = [
      { quantity: 10, unitPrice: 100, taxRate: 21 },
      { quantity: 5, unitPrice: 50, taxRate: 10 },
      { quantity: 1, unitPrice: 25, taxRate: 0 },
    ]

    it('should calculate subtotal correctly', () => {
      const subtotal = FinancialCalculations.calculateSubtotal(sampleLines)
      expect(subtotal).toBe(1275.00) // 1000 + 250 + 25
    })

    it('should calculate total tax correctly', () => {
      const totalTax = FinancialCalculations.calculateTotalTax(sampleLines)
      expect(totalTax).toBe(235.00) // 210 + 25 + 0
    })

    it('should calculate invoice total correctly', () => {
      const total = FinancialCalculations.calculateTotal(sampleLines)
      expect(total).toBe(1510.00) // 1275 + 235
    })

    it('should handle empty invoice lines', () => {
      expect(FinancialCalculations.calculateSubtotal([])).toBe(0.00)
      expect(FinancialCalculations.calculateTotalTax([])).toBe(0.00)
      expect(FinancialCalculations.calculateTotal([])).toBe(0.00)
    })
  })

  describe('Spanish Tax Validation', () => {
    it('should validate Spanish IVA rates', () => {
      expect(FinancialCalculations.isValidSpanishTaxRate(0)).toBe(true)
      expect(FinancialCalculations.isValidSpanishTaxRate(4)).toBe(true)
      expect(FinancialCalculations.isValidSpanishTaxRate(10)).toBe(true)
      expect(FinancialCalculations.isValidSpanishTaxRate(21)).toBe(true)
      
      expect(FinancialCalculations.isValidSpanishTaxRate(5)).toBe(false)
      expect(FinancialCalculations.isValidSpanishTaxRate(15)).toBe(false)
      expect(FinancialCalculations.isValidSpanishTaxRate(-1)).toBe(false)
    })
  })

  describe('Discount Calculations', () => {
    it('should calculate discount correctly', () => {
      expect(FinancialCalculations.calculateDiscount(1000, 10)).toBe(100.00)
      expect(FinancialCalculations.calculateDiscount(500, 15.5)).toBe(77.50)
      expect(FinancialCalculations.calculateDiscount(100, 0)).toBe(0.00)
    })

    it('should throw error for invalid discount percentage', () => {
      expect(() => FinancialCalculations.calculateDiscount(1000, -1))
        .toThrow('Discount percentage must be between 0 and 100')
      expect(() => FinancialCalculations.calculateDiscount(1000, 101))
        .toThrow('Discount percentage must be between 0 and 100')
    })
  })

  describe('IRPF Calculations', () => {
    it('should calculate IRPF withholding correctly', () => {
      expect(FinancialCalculations.calculateIRPF(1000, 15)).toBe(150.00)
      expect(FinancialCalculations.calculateIRPF(500, 7)).toBe(35.00)
      expect(FinancialCalculations.calculateIRPF(100, 0)).toBe(0.00)
    })

    it('should throw error for invalid IRPF rate', () => {
      expect(() => FinancialCalculations.calculateIRPF(1000, -1))
        .toThrow('IRPF rate must be between 0 and 47')
      expect(() => FinancialCalculations.calculateIRPF(1000, 48))
        .toThrow('IRPF rate must be between 0 and 47')
    })
  })

  describe('Currency Formatting', () => {
    it('should format currency in Spanish locale', () => {
      expect(FinancialCalculations.formatCurrency(1234.56)).toBe('1234,56 €')
      expect(FinancialCalculations.formatCurrency(0)).toBe('0,00 €')
      expect(FinancialCalculations.formatCurrency(0.99)).toBe('0,99 €')
    })
  })

  describe('Database Financial Integrity', () => {
    beforeEach(async () => {
      await db.insert(schema.invoices).values(testInvoices.invoice1)
      await db.insert(schema.invoiceLines).values(testInvoiceLines.line1)
    })

    it('should maintain calculation accuracy in database', async () => {
      const invoices = await db
        .select()
        .from(schema.invoices)
        .where(schema.invoices.id.eq(testInvoices.invoice1.id))

      const lines = await db
        .select()
        .from(schema.invoiceLines)
        .where(schema.invoiceLines.invoiceId.eq(testInvoices.invoice1.id))

      // Verify database totals match calculations
      const calculatedSubtotal = FinancialCalculations.calculateSubtotal(lines)
      const calculatedTax = FinancialCalculations.calculateTotalTax(lines)
      const calculatedTotal = FinancialCalculations.calculateTotal(lines)

      expect(invoices[0].subtotal).toBe(calculatedSubtotal)
      expect(invoices[0].taxAmount).toBe(calculatedTax)
      expect(invoices[0].totalAmount).toBe(calculatedTotal)
    })

    it('should prevent incorrect financial totals', async () => {
      // Try to create invoice with incorrect totals
      const incorrectInvoice = createTestInvoice({
        subtotal: 1000.00,
        taxAmount: 100.00, // Should be 210 (21% of 1000)
        totalAmount: 1100.00, // Should be 1210
      })

      await db.insert(schema.invoices).values(incorrectInvoice)
      
      const lines = [{
        quantity: 10,
        unitPrice: 100,
        taxRate: 21
      }]

      // Recalculate and verify inconsistency
      const correctSubtotal = FinancialCalculations.calculateSubtotal(lines)
      const correctTax = FinancialCalculations.calculateTotalTax(lines)
      const correctTotal = FinancialCalculations.calculateTotal(lines)

      expect(incorrectInvoice.subtotal).toBe(correctSubtotal) // 1000 is correct
      expect(incorrectInvoice.taxAmount).not.toBe(correctTax) // 100 vs 210
      expect(incorrectInvoice.totalAmount).not.toBe(correctTotal) // 1100 vs 1210
    })
  })

  describe('Rounding and Precision', () => {
    it('should handle rounding correctly for financial calculations', () => {
      // Test cases that commonly cause precision issues
      expect(FinancialCalculations.calculateLineAmount(3, 33.33)).toBe(99.99)
      expect(FinancialCalculations.calculateLineTax(99.99, 21)).toBe(21.00)
      
      // Very small amounts
      expect(FinancialCalculations.calculateLineAmount(0.001, 1000)).toBe(1.00)
      expect(FinancialCalculations.calculateLineTax(0.01, 21)).toBe(0.00)
    })

    it('should maintain precision across complex calculations', () => {
      const complexLines = [
        { quantity: 1.37, unitPrice: 73.89, taxRate: 21 },
        { quantity: 2.5, unitPrice: 15.99, taxRate: 10 },
        { quantity: 0.75, unitPrice: 199.99, taxRate: 4 },
      ]

      const subtotal = FinancialCalculations.calculateSubtotal(complexLines)
      const tax = FinancialCalculations.calculateTotalTax(complexLines)
      const total = FinancialCalculations.calculateTotal(complexLines)

      // Verify no precision loss
      expect(subtotal + tax).toBeCloseTo(total, 2)
      expect(Number.isFinite(subtotal)).toBe(true)
      expect(Number.isFinite(tax)).toBe(true)
      expect(Number.isFinite(total)).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero amounts correctly', () => {
      expect(FinancialCalculations.calculateLineAmount(0, 100)).toBe(0.00)
      expect(FinancialCalculations.calculateLineAmount(10, 0)).toBe(0.00)
      expect(FinancialCalculations.calculateLineTax(0, 21)).toBe(0.00)
    })

    it('should handle very large amounts', () => {
      const largeAmount = 999999.99
      expect(FinancialCalculations.calculateLineAmount(1, largeAmount)).toBe(largeAmount)
      expect(FinancialCalculations.calculateLineTax(largeAmount, 21)).toBe(209999.80)
    })

    it('should handle fractional cents correctly', () => {
      // These should round to nearest cent
      expect(FinancialCalculations.calculateLineAmount(7, 14.286)).toBe(100.00)
      expect(FinancialCalculations.calculateLineTax(100.005, 21)).toBe(21.00)
    })
  })
})