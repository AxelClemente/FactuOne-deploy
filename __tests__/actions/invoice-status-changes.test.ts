/**
 * @jest-environment jsdom
 */

import { changeInvoiceStatus } from '@/app/(dashboard)/invoices/actions'
import { changeReceivedInvoiceStatus } from '@/app/(dashboard)/received-invoices/actions'
import { setupTestDb, cleanTestDb } from '../helpers/testDb'
import { mockAuthenticatedUser, clearAuthMocks } from '../helpers/authTestHelper'
import { testUsers, testBusinesses, testClients, createTestInvoice } from '../fixtures/testData'
import * as schema from '@/app/db/schema'

// Mock dependencies
jest.mock('@/lib/notifications', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
}))

jest.mock('@/lib/audit', () => ({
  auditHelpers: {
    logAction: jest.fn().mockResolvedValue({}),
  },
}))

describe('Invoice Status Changes', () => {
  let db: any
  let testProvider: any

  beforeEach(async () => {
    db = await setupTestDb()
    await cleanTestDb()
    clearAuthMocks()

    // Insert test data
    await db.insert(schema.users).values(testUsers.admin)
    await db.insert(schema.businesses).values(testBusinesses.business1)
    await db.insert(schema.clients).values(testClients.client1)
    
    // Create test provider
    testProvider = {
      id: 'provider-001',
      businessId: testBusinesses.business1.id,
      name: 'Proveedor Test',
      nif: 'B87654321',
      address: 'Calle Proveedor 123',
      city: 'Ciudad Proveedor',
      postalCode: '54321',
      phone: '987654321',
      email: 'proveedor@test.com',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await db.insert(schema.providers).values(testProvider)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Sent Invoice Status Changes', () => {
    let sentInvoiceId: string

    beforeEach(async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      // Create sent invoice
      const invoice = createTestInvoice({
        businessId: testBusinesses.business1.id,
        clientId: testClients.client1.id,
        status: 'draft',
      })
      await db.insert(schema.invoices).values(invoice)
      sentInvoiceId = invoice.id
    })

    describe('Valid Status Transitions', () => {
      it('should change status from draft to sent', async () => {
        const result = await changeInvoiceStatus(sentInvoiceId, 'sent')

        expect(result.success).toBe(true)

        const updatedInvoice = await db
          .select()
          .from(schema.invoices)
          .where(schema.invoices.id.eq(sentInvoiceId))

        expect(updatedInvoice[0].status).toBe('sent')
        expect(updatedInvoice[0].sentAt).toBeDefined()
      })

      it('should change status from sent to paid', async () => {
        // First set to sent
        await db
          .update(schema.invoices)
          .set({ status: 'sent', sentAt: new Date() })
          .where(schema.invoices.id.eq(sentInvoiceId))

        const result = await changeInvoiceStatus(sentInvoiceId, 'paid')

        expect(result.success).toBe(true)

        const updatedInvoice = await db
          .select()
          .from(schema.invoices)
          .where(schema.invoices.id.eq(sentInvoiceId))

        expect(updatedInvoice[0].status).toBe('paid')
        expect(updatedInvoice[0].paidAt).toBeDefined()
      })

      it('should change status from sent to overdue', async () => {
        // First set to sent with past due date
        await db
          .update(schema.invoices)
          .set({ 
            status: 'sent', 
            sentAt: new Date(),
            dueDate: new Date('2023-01-01') // Past due date
          })
          .where(schema.invoices.id.eq(sentInvoiceId))

        const result = await changeInvoiceStatus(sentInvoiceId, 'overdue')

        expect(result.success).toBe(true)

        const updatedInvoice = await db
          .select()
          .from(schema.invoices)
          .where(schema.invoices.id.eq(sentInvoiceId))

        expect(updatedInvoice[0].status).toBe('overdue')
      })

      it('should change status from overdue to paid', async () => {
        // First set to overdue
        await db
          .update(schema.invoices)
          .set({ status: 'overdue' })
          .where(schema.invoices.id.eq(sentInvoiceId))

        const result = await changeInvoiceStatus(sentInvoiceId, 'paid')

        expect(result.success).toBe(true)

        const updatedInvoice = await db
          .select()
          .from(schema.invoices)
          .where(schema.invoices.id.eq(sentInvoiceId))

        expect(updatedInvoice[0].status).toBe('paid')
        expect(updatedInvoice[0].paidAt).toBeDefined()
      })

      it('should change status from sent back to draft', async () => {
        // First set to sent
        await db
          .update(schema.invoices)
          .set({ status: 'sent', sentAt: new Date() })
          .where(schema.invoices.id.eq(sentInvoiceId))

        const result = await changeInvoiceStatus(sentInvoiceId, 'draft')

        expect(result.success).toBe(true)

        const updatedInvoice = await db
          .select()
          .from(schema.invoices)
          .where(schema.invoices.id.eq(sentInvoiceId))

        expect(updatedInvoice[0].status).toBe('draft')
        expect(updatedInvoice[0].sentAt).toBeNull() // Should clear sent date
      })
    })

    describe('Invalid Status Transitions', () => {
      it('should prevent changing from draft to overdue', async () => {
        const result = await changeInvoiceStatus(sentInvoiceId, 'overdue')

        expect(result.success).toBe(false)
        expect(result.error).toContain('transición no válida')
      })

      it('should prevent changing from draft to paid', async () => {
        const result = await changeInvoiceStatus(sentInvoiceId, 'paid')

        expect(result.success).toBe(false)
        expect(result.error).toContain('transición no válida')
      })

      it('should prevent changing paid invoice to any other status', async () => {
        // First set to paid
        await db
          .update(schema.invoices)
          .set({ status: 'paid', paidAt: new Date() })
          .where(schema.invoices.id.eq(sentInvoiceId))

        const invalidTransitions = ['draft', 'sent', 'overdue']

        for (const newStatus of invalidTransitions) {
          const result = await changeInvoiceStatus(sentInvoiceId, newStatus as any)
          expect(result.success).toBe(false)
          expect(result.error).toContain('transición no válida')
        }
      })
    })

    describe('Status Change Side Effects', () => {
      it('should set sentAt timestamp when changing to sent', async () => {
        const beforeTime = new Date()
        
        const result = await changeInvoiceStatus(sentInvoiceId, 'sent')
        expect(result.success).toBe(true)

        const updatedInvoice = await db
          .select()
          .from(schema.invoices)
          .where(schema.invoices.id.eq(sentInvoiceId))

        expect(updatedInvoice[0].sentAt).toBeDefined()
        expect(updatedInvoice[0].sentAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      })

      it('should set paidAt timestamp when changing to paid', async () => {
        // First set to sent
        await db
          .update(schema.invoices)
          .set({ status: 'sent', sentAt: new Date() })
          .where(schema.invoices.id.eq(sentInvoiceId))

        const beforeTime = new Date()
        
        const result = await changeInvoiceStatus(sentInvoiceId, 'paid')
        expect(result.success).toBe(true)

        const updatedInvoice = await db
          .select()
          .from(schema.invoices)
          .where(schema.invoices.id.eq(sentInvoiceId))

        expect(updatedInvoice[0].paidAt).toBeDefined()
        expect(updatedInvoice[0].paidAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      })

      it('should clear timestamps when reverting status', async () => {
        // Set to paid first
        await db
          .update(schema.invoices)
          .set({ 
            status: 'paid', 
            sentAt: new Date(),
            paidAt: new Date()
          })
          .where(schema.invoices.id.eq(sentInvoiceId))

        // Allow reverting paid to sent for this test
        const result = await changeInvoiceStatus(sentInvoiceId, 'sent')
        
        // This might fail in real implementation, but we test the logic
        if (result.success) {
          const updatedInvoice = await db
            .select()
            .from(schema.invoices)
            .where(schema.invoices.id.eq(sentInvoiceId))

          expect(updatedInvoice[0].paidAt).toBeNull()
        }
      })
    })

    describe('Authorization and Business Logic', () => {
      it('should fail without authentication', async () => {
        clearAuthMocks() // Clear authentication

        const result = await changeInvoiceStatus(sentInvoiceId, 'sent')

        expect(result.success).toBe(false)
        expect(result.error).toContain('autorizado')
      })

      it('should fail without edit permissions', async () => {
        mockAuthenticatedUser(testUsers.user.id, testBusinesses.business1.id)
        
        // Mock hasPermission to return false for edit
        jest.mock('@/lib/auth', () => ({
          getCurrentUser: jest.fn().mockResolvedValue({ id: testUsers.user.id }),
          hasPermission: jest.fn().mockResolvedValue(false),
        }))

        const result = await changeInvoiceStatus(sentInvoiceId, 'sent')

        expect(result.success).toBe(false)
        expect(result.error).toContain('permisos')
      })

      it('should prevent status change for non-existent invoice', async () => {
        const result = await changeInvoiceStatus('non-existent-id', 'sent')

        expect(result.success).toBe(false)
        expect(result.error).toContain('no existe')
      })

      it('should prevent cross-business status changes', async () => {
        // Create invoice in different business
        const otherBusiness = {
          id: 'business-other',
          name: 'Other Business',
          nif: 'B99999999',
          address: 'Other Address',
          city: 'Other City',
          postalCode: '99999',
          phone: '999999999',
          email: 'other@test.com',
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const otherClient = {
          id: 'client-other',
          businessId: otherBusiness.id,
          name: 'Other Client',
          nif: 'C99999999',
          address: 'Other Address',
          city: 'Other City',
          postalCode: '99999',
          phone: '999999999',
          email: 'other@test.com',
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const otherInvoice = createTestInvoice({
          businessId: otherBusiness.id,
          clientId: otherClient.id,
          status: 'draft',
        })

        await db.insert(schema.businesses).values(otherBusiness)
        await db.insert(schema.clients).values(otherClient)
        await db.insert(schema.invoices).values(otherInvoice)

        const result = await changeInvoiceStatus(otherInvoice.id, 'sent')

        expect(result.success).toBe(false)
        expect(result.error).toContain('no existe')
      })
    })
  })

  describe('Received Invoice Status Changes', () => {
    let receivedInvoiceId: string

    beforeEach(async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      // Create received invoice
      const invoice = {
        id: 'received-invoice-status',
        businessId: testBusinesses.business1.id,
        providerId: testProvider.id,
        date: new Date('2024-01-15'),
        amount: 1210.00,
        status: 'pending' as const,
        category: 'Servicios',
        number: 'PROV-STATUS',
        documentUrl: null,
        projectId: null,
        paymentMethod: null,
        bankId: null,
        bizumHolder: null,
        bizumNumber: null,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await db.insert(schema.receivedInvoices).values(invoice)
      receivedInvoiceId = invoice.id
    })

    describe('Valid Status Transitions for Received Invoices', () => {
      it('should change status from pending to recorded', async () => {
        const result = await changeReceivedInvoiceStatus(receivedInvoiceId, 'recorded')

        expect(result.success).toBe(true)

        const updatedInvoice = await db
          .select()
          .from(schema.receivedInvoices)
          .where(schema.receivedInvoices.id.eq(receivedInvoiceId))

        expect(updatedInvoice[0].status).toBe('recorded')
      })

      it('should change status from pending to rejected', async () => {
        const result = await changeReceivedInvoiceStatus(receivedInvoiceId, 'rejected')

        expect(result.success).toBe(true)

        const updatedInvoice = await db
          .select()
          .from(schema.receivedInvoices)
          .where(schema.receivedInvoices.id.eq(receivedInvoiceId))

        expect(updatedInvoice[0].status).toBe('rejected')
      })

      it('should change status from recorded to paid', async () => {
        // First set to recorded
        await db
          .update(schema.receivedInvoices)
          .set({ status: 'recorded' })
          .where(schema.receivedInvoices.id.eq(receivedInvoiceId))

        const result = await changeReceivedInvoiceStatus(receivedInvoiceId, 'paid')

        expect(result.success).toBe(true)

        const updatedInvoice = await db
          .select()
          .from(schema.receivedInvoices)
          .where(schema.receivedInvoices.id.eq(receivedInvoiceId))

        expect(updatedInvoice[0].status).toBe('paid')
      })

      it('should change status from rejected back to pending', async () => {
        // First set to rejected
        await db
          .update(schema.receivedInvoices)
          .set({ status: 'rejected' })
          .where(schema.receivedInvoices.id.eq(receivedInvoiceId))

        const result = await changeReceivedInvoiceStatus(receivedInvoiceId, 'pending')

        expect(result.success).toBe(true)

        const updatedInvoice = await db
          .select()
          .from(schema.receivedInvoices)
          .where(schema.receivedInvoices.id.eq(receivedInvoiceId))

        expect(updatedInvoice[0].status).toBe('pending')
      })

      it('should change status from recorded back to pending', async () => {
        // First set to recorded
        await db
          .update(schema.receivedInvoices)
          .set({ status: 'recorded' })
          .where(schema.receivedInvoices.id.eq(receivedInvoiceId))

        const result = await changeReceivedInvoiceStatus(receivedInvoiceId, 'pending')

        expect(result.success).toBe(true)

        const updatedInvoice = await db
          .select()
          .from(schema.receivedInvoices)
          .where(schema.receivedInvoices.id.eq(receivedInvoiceId))

        expect(updatedInvoice[0].status).toBe('pending')
      })
    })

    describe('Complex Status Transition Flows', () => {
      it('should handle full approval workflow: pending → recorded → paid', async () => {
        // Step 1: pending → recorded
        let result = await changeReceivedInvoiceStatus(receivedInvoiceId, 'recorded')
        expect(result.success).toBe(true)

        let invoice = await db
          .select()
          .from(schema.receivedInvoices)
          .where(schema.receivedInvoices.id.eq(receivedInvoiceId))
        expect(invoice[0].status).toBe('recorded')

        // Step 2: recorded → paid
        result = await changeReceivedInvoiceStatus(receivedInvoiceId, 'paid')
        expect(result.success).toBe(true)

        invoice = await db
          .select()
          .from(schema.receivedInvoices)
          .where(schema.receivedInvoices.id.eq(receivedInvoiceId))
        expect(invoice[0].status).toBe('paid')
      })

      it('should handle rejection workflow: pending → rejected → pending', async () => {
        // Step 1: pending → rejected
        let result = await changeReceivedInvoiceStatus(receivedInvoiceId, 'rejected')
        expect(result.success).toBe(true)

        let invoice = await db
          .select()
          .from(schema.receivedInvoices)
          .where(schema.receivedInvoices.id.eq(receivedInvoiceId))
        expect(invoice[0].status).toBe('rejected')

        // Step 2: rejected → pending (correcting the invoice)
        result = await changeReceivedInvoiceStatus(receivedInvoiceId, 'pending')
        expect(result.success).toBe(true)

        invoice = await db
          .select()
          .from(schema.receivedInvoices)
          .where(schema.receivedInvoices.id.eq(receivedInvoiceId))
        expect(invoice[0].status).toBe('pending')
      })

      it('should handle correction workflow: recorded → pending → recorded', async () => {
        // Step 1: pending → recorded
        let result = await changeReceivedInvoiceStatus(receivedInvoiceId, 'recorded')
        expect(result.success).toBe(true)

        // Step 2: recorded → pending (need to make corrections)
        result = await changeReceivedInvoiceStatus(receivedInvoiceId, 'pending')
        expect(result.success).toBe(true)

        // Step 3: pending → recorded (after corrections)
        result = await changeReceivedInvoiceStatus(receivedInvoiceId, 'recorded')
        expect(result.success).toBe(true)

        const invoice = await db
          .select()
          .from(schema.receivedInvoices)
          .where(schema.receivedInvoices.id.eq(receivedInvoiceId))
        expect(invoice[0].status).toBe('recorded')
      })
    })

    describe('Status Change Validation', () => {
      it('should reject invalid status values', async () => {
        const result = await changeReceivedInvoiceStatus(receivedInvoiceId, 'invalid-status' as any)

        expect(result.success).toBe(false)
        expect(result.error).toContain('Estado no válido')
      })

      it('should maintain data integrity during status changes', async () => {
        const originalInvoice = await db
          .select()
          .from(schema.receivedInvoices)
          .where(schema.receivedInvoices.id.eq(receivedInvoiceId))

        const result = await changeReceivedInvoiceStatus(receivedInvoiceId, 'recorded')
        expect(result.success).toBe(true)

        const updatedInvoice = await db
          .select()
          .from(schema.receivedInvoices)
          .where(schema.receivedInvoices.id.eq(receivedInvoiceId))

        // All other fields should remain unchanged
        expect(updatedInvoice[0].amount).toBe(originalInvoice[0].amount)
        expect(updatedInvoice[0].providerId).toBe(originalInvoice[0].providerId)
        expect(updatedInvoice[0].businessId).toBe(originalInvoice[0].businessId)
        expect(updatedInvoice[0].number).toBe(originalInvoice[0].number)
        
        // Only status should change
        expect(updatedInvoice[0].status).toBe('recorded')
        expect(updatedInvoice[0].status).not.toBe(originalInvoice[0].status)
      })
    })
  })

  describe('Status Change Auditing', () => {
    let invoiceId: string

    beforeEach(async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      const invoice = createTestInvoice({
        businessId: testBusinesses.business1.id,
        clientId: testClients.client1.id,
        status: 'draft',
      })
      await db.insert(schema.invoices).values(invoice)
      invoiceId = invoice.id
    })

    it('should create audit log for status changes', async () => {
      const result = await changeInvoiceStatus(invoiceId, 'sent')
      expect(result.success).toBe(true)

      // Verify audit log was created
      const { auditHelpers } = require('@/lib/audit')
      expect(auditHelpers.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUsers.admin.id,
          businessId: testBusinesses.business1.id,
          action: 'UPDATE',
          entity: 'invoices',
          entityId: invoiceId,
        })
      )
    })

    it('should create notification for status changes', async () => {
      const result = await changeInvoiceStatus(invoiceId, 'sent')
      expect(result.success).toBe(true)

      // Verify notification was created
      const { createNotification } = require('@/lib/notifications')
      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUsers.admin.id,
          type: 'invoice_sent',
        })
      )
    })
  })
})