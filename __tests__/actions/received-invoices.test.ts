/**
 * @jest-environment jsdom
 */

import { createReceivedInvoice, updateReceivedInvoice, deleteReceivedInvoice, changeReceivedInvoiceStatus } from '@/app/(dashboard)/received-invoices/actions'
import { setupTestDb, cleanTestDb } from '../helpers/testDb'
import { mockAuthenticatedUser, clearAuthMocks } from '../helpers/authTestHelper'
import { testUsers, testBusinesses, createTestUser } from '../fixtures/testData'
import * as schema from '@/app/db/schema'

// Mock dependencies
jest.mock('@/lib/notifications', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
}))

jest.mock('@/lib/getActiveBusiness', () => ({
  getActiveBusiness: jest.fn().mockResolvedValue('business-001'),
}))

describe('Received Invoice Actions', () => {
  let db: any
  let testProvider: any

  beforeEach(async () => {
    db = await setupTestDb()
    await cleanTestDb()
    clearAuthMocks()

    // Insert test data
    await db.insert(schema.users).values(testUsers.admin)
    await db.insert(schema.businesses).values(testBusinesses.business1)
    
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

  describe('createReceivedInvoice', () => {
    const validReceivedInvoiceData = {
      date: new Date('2024-01-15'),
      providerId: 'provider-001',
      amount: 1210.00,
      status: 'pending' as const,
      category: 'Servicios',
      number: 'PROV-001',
      lines: [
        {
          description: 'Servicio de Consultoría',
          quantity: 10,
          unitPrice: 100,
          taxRate: 21,
          total: 1000,
        },
      ],
    }

    it('should create received invoice successfully with valid data', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const result = await createReceivedInvoice(validReceivedInvoiceData)

      expect(result.success).toBe(true)
      expect(result.invoiceId).toBeDefined()
      expect(result.error).toBeUndefined()

      // Verify received invoice was created in database
      const createdInvoice = await db
        .select()
        .from(schema.receivedInvoices)
        .where(schema.receivedInvoices.id.eq(result.invoiceId))

      expect(createdInvoice).toHaveLength(1)
      expect(createdInvoice[0].businessId).toBe(testBusinesses.business1.id)
      expect(createdInvoice[0].providerId).toBe(testProvider.id)
      expect(createdInvoice[0].amount).toBe(1210.00)
      expect(createdInvoice[0].status).toBe('pending')
    })

    it('should fail without authentication', async () => {
      // No mock authentication
      const result = await createReceivedInvoice(validReceivedInvoiceData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('iniciado sesión')
    })

    it('should fail without active business', async () => {
      mockAuthenticatedUser(testUsers.admin.id) // No business

      const { getActiveBusiness } = require('@/lib/getActiveBusiness')
      getActiveBusiness.mockResolvedValue(null)

      const result = await createReceivedInvoice(validReceivedInvoiceData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('negocio activo')
    })

    it('should fail without create permissions', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      // Mock hasPermission to return false
      jest.mock('@/lib/auth', () => ({
        getCurrentUser: jest.fn().mockResolvedValue({ id: testUsers.admin.id }),
        hasPermission: jest.fn().mockResolvedValue(false),
      }))

      const result = await createReceivedInvoice(validReceivedInvoiceData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('permisos')
    })

    it('should validate required fields', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validReceivedInvoiceData,
        providerId: '', // Empty provider
      }

      const result = await createReceivedInvoice(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Selecciona un proveedor')
    })

    it('should validate amount is positive', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validReceivedInvoiceData,
        amount: -100, // Negative amount
      }

      const result = await createReceivedInvoice(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('debe ser positivo')
    })

    it('should validate status enum', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validReceivedInvoiceData,
        status: 'invalid-status' as any, // Invalid status
      }

      const result = await createReceivedInvoice(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should validate provider belongs to same business', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      // Create provider in different business
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

      const otherProvider = {
        id: 'provider-other',
        businessId: otherBusiness.id,
        name: 'Other Provider',
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

      await db.insert(schema.businesses).values(otherBusiness)
      await db.insert(schema.providers).values(otherProvider)

      const crossBusinessData = {
        ...validReceivedInvoiceData,
        providerId: otherProvider.id, // Provider from different business
      }

      const result = await createReceivedInvoice(crossBusinessData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('proveedor no existe')
    })

    it('should create invoice lines when provided', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const result = await createReceivedInvoice(validReceivedInvoiceData)

      expect(result.success).toBe(true)

      // Verify invoice lines were created
      const createdLines = await db
        .select()
        .from(schema.receivedInvoiceLines)
        .where(schema.receivedInvoiceLines.receivedInvoiceId.eq(result.invoiceId))

      expect(createdLines).toHaveLength(1)
      expect(createdLines[0].description).toBe('Servicio de Consultoría')
      expect(createdLines[0].quantity).toBe(10)
      expect(createdLines[0].unitPrice).toBe(100)
    })

    it('should handle invoice without lines', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const dataWithoutLines = {
        ...validReceivedInvoiceData,
        lines: undefined, // No lines
      }

      const result = await createReceivedInvoice(dataWithoutLines)

      expect(result.success).toBe(true)
      expect(result.invoiceId).toBeDefined()

      // Verify no lines were created
      const createdLines = await db
        .select()
        .from(schema.receivedInvoiceLines)
        .where(schema.receivedInvoiceLines.receivedInvoiceId.eq(result.invoiceId))

      expect(createdLines).toHaveLength(0)
    })

    it('should handle payment method information', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const dataWithPayment = {
        ...validReceivedInvoiceData,
        paymentMethod: 'bank' as const,
        bankId: 'bank-001',
      }

      const result = await createReceivedInvoice(dataWithPayment)

      expect(result.success).toBe(true)

      const createdInvoice = await db
        .select()
        .from(schema.receivedInvoices)
        .where(schema.receivedInvoices.id.eq(result.invoiceId))

      expect(createdInvoice[0].paymentMethod).toBe('bank')
      expect(createdInvoice[0].bankId).toBe('bank-001')
    })
  })

  describe('updateReceivedInvoice', () => {
    let existingInvoiceId: string

    beforeEach(async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      // Create received invoice to update
      const invoice = {
        id: 'received-invoice-to-update',
        businessId: testBusinesses.business1.id,
        providerId: testProvider.id,
        date: new Date('2024-01-15'),
        amount: 1210.00,
        status: 'pending' as const,
        category: 'Servicios',
        number: 'PROV-001',
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
      existingInvoiceId = invoice.id
    })

    it('should update received invoice successfully', async () => {
      const updateData = {
        date: new Date('2024-01-20'),
        providerId: testProvider.id,
        amount: 1500.00,
        status: 'recorded' as const,
        category: 'Material',
        number: 'PROV-002',
      }

      const result = await updateReceivedInvoice(existingInvoiceId, updateData)

      expect(result.success).toBe(true)

      // Verify invoice was updated
      const updatedInvoice = await db
        .select()
        .from(schema.receivedInvoices)
        .where(schema.receivedInvoices.id.eq(existingInvoiceId))

      expect(updatedInvoice[0].amount).toBe(1500.00)
      expect(updatedInvoice[0].status).toBe('recorded')
      expect(updatedInvoice[0].category).toBe('Material')
    })

    it('should prevent updating non-existent invoice', async () => {
      const result = await updateReceivedInvoice('non-existent-id', {
        date: new Date(),
        providerId: testProvider.id,
        amount: 100,
        status: 'pending',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('no existe')
    })

    it('should prevent cross-business updates', async () => {
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

      const otherProvider = {
        id: 'provider-other',
        businessId: otherBusiness.id,
        name: 'Other Provider',
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

      const otherInvoice = {
        id: 'invoice-other-business',
        businessId: otherBusiness.id,
        providerId: otherProvider.id,
        date: new Date(),
        amount: 500,
        status: 'pending' as const,
        category: null,
        number: null,
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

      await db.insert(schema.businesses).values(otherBusiness)
      await db.insert(schema.providers).values(otherProvider)
      await db.insert(schema.receivedInvoices).values(otherInvoice)

      const result = await updateReceivedInvoice(otherInvoice.id, {
        date: new Date(),
        providerId: otherProvider.id,
        amount: 1000,
        status: 'recorded',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('no existe')
    })
  })

  describe('changeReceivedInvoiceStatus', () => {
    let existingInvoiceId: string

    beforeEach(async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      const invoice = {
        id: 'invoice-status-change',
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
      existingInvoiceId = invoice.id
    })

    it('should change status from pending to recorded', async () => {
      const result = await changeReceivedInvoiceStatus(existingInvoiceId, 'recorded')

      expect(result.success).toBe(true)

      const updatedInvoice = await db
        .select()
        .from(schema.receivedInvoices)
        .where(schema.receivedInvoices.id.eq(existingInvoiceId))

      expect(updatedInvoice[0].status).toBe('recorded')
    })

    it('should change status from pending to rejected', async () => {
      const result = await changeReceivedInvoiceStatus(existingInvoiceId, 'rejected')

      expect(result.success).toBe(true)

      const updatedInvoice = await db
        .select()
        .from(schema.receivedInvoices)
        .where(schema.receivedInvoices.id.eq(existingInvoiceId))

      expect(updatedInvoice[0].status).toBe('rejected')
    })

    it('should change status from recorded to paid', async () => {
      // First set to recorded
      await db
        .update(schema.receivedInvoices)
        .set({ status: 'recorded' })
        .where(schema.receivedInvoices.id.eq(existingInvoiceId))

      const result = await changeReceivedInvoiceStatus(existingInvoiceId, 'paid')

      expect(result.success).toBe(true)

      const updatedInvoice = await db
        .select()
        .from(schema.receivedInvoices)
        .where(schema.receivedInvoices.id.eq(existingInvoiceId))

      expect(updatedInvoice[0].status).toBe('paid')
    })

    it('should handle all valid status transitions', async () => {
      const validTransitions = [
        { from: 'pending', to: 'recorded' },
        { from: 'pending', to: 'rejected' },
        { from: 'recorded', to: 'paid' },
        { from: 'recorded', to: 'pending' },
        { from: 'rejected', to: 'pending' },
        { from: 'paid', to: 'recorded' },
      ]

      for (const transition of validTransitions) {
        // Reset invoice status
        await db
          .update(schema.receivedInvoices)
          .set({ status: transition.from })
          .where(schema.receivedInvoices.id.eq(existingInvoiceId))

        const result = await changeReceivedInvoiceStatus(existingInvoiceId, transition.to as any)

        expect(result.success).toBe(true)

        const updatedInvoice = await db
          .select()
          .from(schema.receivedInvoices)
          .where(schema.receivedInvoices.id.eq(existingInvoiceId))

        expect(updatedInvoice[0].status).toBe(transition.to)
      }
    })

    it('should prevent invalid status change', async () => {
      const result = await changeReceivedInvoiceStatus(existingInvoiceId, 'invalid-status' as any)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Estado no válido')
    })

    it('should prevent status change for non-existent invoice', async () => {
      const result = await changeReceivedInvoiceStatus('non-existent-id', 'recorded')

      expect(result.success).toBe(false)
      expect(result.error).toContain('no existe')
    })
  })

  describe('deleteReceivedInvoice', () => {
    let existingInvoiceId: string

    beforeEach(async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      const invoice = {
        id: 'invoice-to-delete',
        businessId: testBusinesses.business1.id,
        providerId: testProvider.id,
        date: new Date('2024-01-15'),
        amount: 1210.00,
        status: 'pending' as const,
        category: 'Servicios',
        number: 'PROV-DELETE',
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
      existingInvoiceId = invoice.id
    })

    it('should delete received invoice successfully', async () => {
      const result = await deleteReceivedInvoice(existingInvoiceId)

      expect(result.success).toBe(true)

      // Verify soft delete
      const deletedInvoice = await db
        .select()
        .from(schema.receivedInvoices)  
        .where(schema.receivedInvoices.id.eq(existingInvoiceId))

      expect(deletedInvoice[0].isDeleted).toBe(true)
    })

    it('should prevent deleting non-existent invoice', async () => {
      const result = await deleteReceivedInvoice('non-existent-id')

      expect(result.success).toBe(false)
      expect(result.error).toContain('no existe')
    })

    it('should prevent deleting paid invoices', async () => {
      // Set invoice as paid
      await db
        .update(schema.receivedInvoices)
        .set({ status: 'paid' })
        .where(schema.receivedInvoices.id.eq(existingInvoiceId))

      const result = await deleteReceivedInvoice(existingInvoiceId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('no se puede eliminar')
    })

    it('should perform soft delete, not hard delete', async () => {
      const result = await deleteReceivedInvoice(existingInvoiceId)

      expect(result.success).toBe(true)

      // Invoice should still exist but marked as deleted
      const deletedInvoice = await db
        .select()
        .from(schema.receivedInvoices)
        .where(schema.receivedInvoices.id.eq(existingInvoiceId))

      expect(deletedInvoice).toHaveLength(1)
      expect(deletedInvoice[0].isDeleted).toBe(true)
    })
  })

  describe('Business Isolation', () => {
    it('should enforce strict business isolation in all received invoice operations', async () => {
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

      await db.insert(schema.businesses).values(otherBusiness)

      // User authenticated for business1
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      // Mock getActiveBusiness to return business1
      const { getActiveBusiness } = require('@/lib/getActiveBusiness')
      getActiveBusiness.mockResolvedValue(testBusinesses.business1.id)

      const invoiceData = {
        date: new Date('2024-01-15'),
        providerId: testProvider.id, // Provider from business1
        amount: 1000.00,
        status: 'pending' as const,
      }

      const result = await createReceivedInvoice(invoiceData)

      expect(result.success).toBe(true)

      // Verify invoice was created in correct business
      const createdInvoice = await db
        .select()
        .from(schema.receivedInvoices)
        .where(schema.receivedInvoices.id.eq(result.invoiceId))

      expect(createdInvoice[0].businessId).toBe(testBusinesses.business1.id)
      expect(createdInvoice[0].businessId).not.toBe(otherBusiness.id)
    })
  })
})