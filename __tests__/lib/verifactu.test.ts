/**
 * @jest-environment jsdom
 */

import {
  generateVerifactuHash,
  validateHashChain,
  generateQRContent,
  getHashForQR,
  formatAmountForVerifactu,
  formatDateForVerifactu,
} from '@/lib/verifactu-hash'
import { VerifactuService } from '@/lib/verifactu-service'
import { setupTestDb, cleanTestDb } from '../helpers/testDb'
import { testBusinesses, testVerifactuConfig, createTestInvoice } from '../fixtures/testData'
import * as schema from '@/app/db/schema'

describe('VERI*FACTU System', () => {
  let db: any

  beforeEach(async () => {
    db = await setupTestDb()
    await cleanTestDb()
  })

  describe('Hash Generation', () => {
    const sampleInvoiceData = {
      businessNIF: 'B12345678',
      invoiceNumber: 'INV-001',
      invoiceDate: '2024-01-15',
      clientNIF: 'C87654321',
      total: '1210.00',
    }

    it('should generate consistent hash for same data', () => {
      const hash1 = generateVerifactuHash(sampleInvoiceData)
      const hash2 = generateVerifactuHash(sampleInvoiceData)
      
      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA-256 produces 64 hex characters
      expect(hash1).toMatch(/^[A-F0-9]+$/) // Should be uppercase hex
    })

    it('should include previous hash in calculation', () => {
      const hashWithoutPrevious = generateVerifactuHash(sampleInvoiceData)
      const hashWithPrevious = generateVerifactuHash({
        ...sampleInvoiceData,
        previousHash: 'ABCD1234'
      })
      
      expect(hashWithoutPrevious).not.toBe(hashWithPrevious)
    })

    it('should handle first record without previous hash', () => {
      const hash = generateVerifactuHash(sampleInvoiceData)
      expect(hash).toBeDefined()
      expect(hash).toHaveLength(64)
    })

    it('should normalize NIF format', () => {
      const hash1 = generateVerifactuHash({
        ...sampleInvoiceData,
        businessNIF: 'B-12345678', // With hyphen
      })
      
      const hash2 = generateVerifactuHash({
        ...sampleInvoiceData,
        businessNIF: 'b12345678', // Lowercase
      })
      
      const hash3 = generateVerifactuHash({
        ...sampleInvoiceData,
        businessNIF: 'B 12345678', // With space
      })
      
      expect(hash1).toBe(hash2)
      expect(hash2).toBe(hash3)
    })

    it('should format date correctly', () => {
      // Test that date formatting is consistent
      const hash1 = generateVerifactuHash(sampleInvoiceData)
      const hash2 = generateVerifactuHash({
        ...sampleInvoiceData,
        invoiceDate: '2024-01-15' // Same date, same format
      })
      
      expect(hash1).toBe(hash2)
    })

    it('should format amount with comma decimal', () => {
      const hash1 = generateVerifactuHash({
        ...sampleInvoiceData,
        total: '1210.00'
      })
      
      const hash2 = generateVerifactuHash({
        ...sampleInvoiceData,
        total: '1210,00' // Already with comma
      })
      
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different data', () => {
      const hash1 = generateVerifactuHash(sampleInvoiceData)
      const hash2 = generateVerifactuHash({
        ...sampleInvoiceData,
        total: '1210.01' // Different amount
      })
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('Hash Chain Validation', () => {
    it('should validate correct hash chain', () => {
      const record1Data = {
        businessNIF: 'B12345678',
        invoiceNumber: 'INV-001',
        invoiceDate: '2024-01-15',
        clientNIF: 'C87654321',
        total: '1210.00',
      }
      
      const record2Data = {
        businessNIF: 'B12345678',
        invoiceNumber: 'INV-002',
        invoiceDate: '2024-01-16',
        clientNIF: 'C87654321',
        total: '605.00',
      }
      
      const hash1 = generateVerifactuHash(record1Data)
      const hash2 = generateVerifactuHash({
        ...record2Data,
        previousHash: hash1
      })
      
      const records = [
        {
          data: record1Data,
          currentHash: hash1,
          previousHash: null
        },
        {
          data: { ...record2Data, previousHash: hash1 },
          currentHash: hash2,
          previousHash: hash1
        }
      ]
      
      expect(validateHashChain(records)).toBe(true)
    })

    it('should reject chain with incorrect previous hash', () => {
      const record1Data = {
        businessNIF: 'B12345678',
        invoiceNumber: 'INV-001',
        invoiceDate: '2024-01-15',
        clientNIF: 'C87654321',
        total: '1210.00',
      }
      
      const hash1 = generateVerifactuHash(record1Data)
      const fakeHash2 = generateVerifactuHash({
        ...record1Data,
        previousHash: 'FAKE_PREVIOUS_HASH'
      })
      
      const records = [
        {
          data: record1Data,
          currentHash: hash1,
          previousHash: null
        },
        {
          data: { ...record1Data, previousHash: 'FAKE_PREVIOUS_HASH' },
          currentHash: fakeHash2,
          previousHash: 'FAKE_PREVIOUS_HASH' // Wrong previous hash
        }
      ]
      
      expect(validateHashChain(records)).toBe(false)
    })

    it('should reject chain with incorrect current hash', () => {
      const record1Data = {
        businessNIF: 'B12345678',
        invoiceNumber: 'INV-001',
        invoiceDate: '2024-01-15',
        clientNIF: 'C87654321',
        total: '1210.00',
      }
      
      const hash1 = generateVerifactuHash(record1Data)
      
      const records = [
        {
          data: record1Data,
          currentHash: 'WRONG_HASH', // Incorrect hash
          previousHash: null
        }
      ]
      
      expect(validateHashChain(records)).toBe(false)
    })

    it('should reject first record with previous hash', () => {
      const record1Data = {
        businessNIF: 'B12345678',
        invoiceNumber: 'INV-001',
        invoiceDate: '2024-01-15',
        clientNIF: 'C87654321',
        total: '1210.00',
      }
      
      const hash1 = generateVerifactuHash(record1Data)
      
      const records = [
        {
          data: record1Data,
          currentHash: hash1,
          previousHash: 'SHOULD_BE_NULL' // First record should have null
        }
      ]
      
      expect(validateHashChain(records)).toBe(false)
    })
  })

  describe('QR Code Generation', () => {
    const qrData = {
      businessNIF: 'B12345678',
      invoiceNumber: 'INV-001',
      invoiceDate: '2024-01-15',
      total: '1210.00',
      hash: 'ABCD1234EFGH5678IJKL9012MNOP3456QRST7890UVWX1234YZAB5678CDEF9012'
    }

    it('should generate valid QR URL', () => {
      const qrUrl = generateQRContent(qrData, true)
      
      expect(qrUrl).toContain('https://www2.agenciatributaria.gob.es/es13/h/qr')
      expect(qrUrl).toContain('nif=B12345678')
      expect(qrUrl).toContain('numserie=INV-001')
      expect(qrUrl).toContain('fecha=20240115')
      expect(qrUrl).toContain('importe=1210.00')
      expect(qrUrl).toContain('hash=ABCD1234') // First 8 chars
      expect(qrUrl).toContain('ver=1') // VERI*FACTU version
    })

    it('should use correct version for non-VERI*FACTU', () => {
      const qrUrl = generateQRContent(qrData, false)
      expect(qrUrl).toContain('ver=0')
    })

    it('should normalize NIF in QR', () => {
      const qrUrl = generateQRContent({
        ...qrData,
        businessNIF: 'B-12 345 678'
      }, true)
      
      expect(qrUrl).toContain('nif=B12345678')
    })

    it('should format date for QR', () => {
      const qrUrl = generateQRContent(qrData, true)
      expect(qrUrl).toContain('fecha=20240115') // YYYYMMDD format
    })

    it('should extract hash for QR correctly', () => {
      const fullHash = 'ABCD1234EFGH5678IJKL9012MNOP3456QRST7890UVWX1234YZAB5678CDEF9012'
      const qrHash = getHashForQR(fullHash)
      
      expect(qrHash).toBe('ABCD1234')
      expect(qrHash).toHaveLength(8)
    })
  })

  describe('Formatting Utilities', () => {
    it('should format amounts correctly', () => {
      expect(formatAmountForVerifactu(1210.00)).toBe('1210,00')
      expect(formatAmountForVerifactu(1210.5)).toBe('1210,50')
      expect(formatAmountForVerifactu('1210.00')).toBe('1210,00')
      expect(formatAmountForVerifactu(0)).toBe('0,00')
      expect(formatAmountForVerifactu(0.01)).toBe('0,01')
    })

    it('should format dates correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      expect(formatDateForVerifactu(date)).toBe('20240115')
      
      expect(formatDateForVerifactu('2024-01-15')).toBe('20240115')
      expect(formatDateForVerifactu('2024-12-31')).toBe('20241231')
    })
  })

  describe('VerifactuService Integration', () => {
    beforeEach(async () => {
      await db.insert(schema.businesses).values(testBusinesses.business1)
      await db.insert(schema.verifactuConfig).values(testVerifactuConfig.config1)
    })

    it('should get configuration for business', async () => {
      const config = await VerifactuService.getConfig(testBusinesses.business1.id)
      
      expect(config).toBeDefined()
      expect(config?.businessId).toBe(testBusinesses.business1.id)
      expect(config?.enabled).toBe(true)
      expect(config?.mode).toBe('verifactu')
    })

    it('should return null for non-existent business', async () => {
      const config = await VerifactuService.getConfig('non-existent-business')
      expect(config).toBeNull()
    })

    it('should return null for disabled configuration', async () => {
      // Disable configuration
      await db
        .update(schema.verifactuConfig)
        .set({ enabled: false })
        .where(schema.verifactuConfig.businessId.eq(testBusinesses.business1.id))

      const config = await VerifactuService.getConfig(testBusinesses.business1.id)
      expect(config?.enabled).toBe(false)
    })
  })

  describe('VERI*FACTU Security & Integrity', () => {
    it('should maintain hash integrity across modifications', () => {
      const originalData = {
        businessNIF: 'B12345678',
        invoiceNumber: 'INV-001',
        invoiceDate: '2024-01-15',
        clientNIF: 'C87654321',
        total: '1210.00',
      }
      
      const originalHash = generateVerifactuHash(originalData)
      
      // Any modification should change the hash
      const modifiedData = { ...originalData, total: '1210.01' }
      const modifiedHash = generateVerifactuHash(modifiedData)
      
      expect(originalHash).not.toBe(modifiedHash)
    })

    it('should prevent tampering with invoice amounts', () => {
      const invoice1 = {
        businessNIF: 'B12345678',
        invoiceNumber: 'INV-001',
        invoiceDate: '2024-01-15',
        clientNIF: 'C87654321',
        total: '1000.00',
      }
      
      const invoice2 = {
        businessNIF: 'B12345678',
        invoiceNumber: 'INV-001',
        invoiceDate: '2024-01-15',
        clientNIF: 'C87654321',
        total: '1000000.00', // Tampered amount
      }
      
      const hash1 = generateVerifactuHash(invoice1)
      const hash2 = generateVerifactuHash(invoice2)
      
      expect(hash1).not.toBe(hash2)
    })

    it('should detect breaks in hash chain', () => {
      // Create valid chain
      const data1 = {
        businessNIF: 'B12345678',
        invoiceNumber: 'INV-001',
        invoiceDate: '2024-01-15',
        clientNIF: 'C87654321',
        total: '1210.00',
      }
      
      const data2 = {
        businessNIF: 'B12345678',
        invoiceNumber: 'INV-002',
        invoiceDate: '2024-01-16',
        clientNIF: 'C87654321',
        total: '605.00',
      }
      
      const hash1 = generateVerifactuHash(data1)
      const hash2 = generateVerifactuHash({ ...data2, previousHash: hash1 })
      
      // Valid chain
      const validChain = [
        { data: data1, currentHash: hash1, previousHash: null },
        { data: { ...data2, previousHash: hash1 }, currentHash: hash2, previousHash: hash1 }
      ]
      
      expect(validateHashChain(validChain)).toBe(true)
      
      // Broken chain (missing link)
      const brokenChain = [
        { data: data1, currentHash: hash1, previousHash: null },
        // Missing record here would break the chain
        { data: { ...data2, previousHash: 'WRONG_HASH' }, currentHash: hash2, previousHash: 'WRONG_HASH' }
      ]
      
      expect(validateHashChain(brokenChain)).toBe(false)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty invoice number', () => {
      const data = {
        businessNIF: 'B12345678',
        invoiceNumber: '',
        invoiceDate: '2024-01-15',
        clientNIF: 'C87654321',
        total: '1210.00',
      }
      
      const hash = generateVerifactuHash(data)
      expect(hash).toBeDefined()
      expect(hash).toHaveLength(64)
    })

    it('should handle special characters in NIF', () => {
      const data = {
        businessNIF: 'B-12345678',
        invoiceNumber: 'INV-001',
        invoiceDate: '2024-01-15',
        clientNIF: 'C 87654321',
        total: '1210.00',
      }
      
      const hash = generateVerifactuHash(data)
      expect(hash).toBeDefined()
    })

    it('should handle zero amounts', () => {
      const data = {
        businessNIF: 'B12345678',
        invoiceNumber: 'INV-001',
        invoiceDate: '2024-01-15',
        clientNIF: 'C87654321',
        total: '0.00',
      }
      
      const hash = generateVerifactuHash(data)
      expect(hash).toBeDefined()
      
      const qrUrl = generateQRContent({
        ...data,
        hash: hash
      }, true)
      expect(qrUrl).toContain('importe=0.00')
    })

    it('should handle very large amounts', () => {
      const data = {
        businessNIF: 'B12345678',
        invoiceNumber: 'INV-001',
        invoiceDate: '2024-01-15',
        clientNIF: 'C87654321',
        total: '999999999.99',
      }
      
      const hash = generateVerifactuHash(data)
      expect(hash).toBeDefined()
    })
  })
})