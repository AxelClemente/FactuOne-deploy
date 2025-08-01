/**
 * @jest-environment jsdom
 */

import { createInvoice, updateInvoice, deleteInvoice } from '@/app/(dashboard)/invoices/actions'
import { setupTestDb, cleanTestDb } from '../helpers/testDb'
import { mockAuthenticatedUser, clearAuthMocks } from '../helpers/authTestHelper'
import { testUsers, testBusinesses, testClients, testInvoices, createTestInvoice } from '../fixtures/testData'
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

jest.mock('@/lib/verifactu-service', () => ({
  VerifactuService: {
    createRegistryForInvoice: jest.fn().mockResolvedValue({}),
  },
}))

describe('Invoice Actions', () => {
  let db: any

  beforeEach(async () => {
    db = await setupTestDb()
    await cleanTestDb()
    clearAuthMocks()

    // Insert test data
    await db.insert(schema.users).values(testUsers.admin)
    await db.insert(schema.businesses).values(testBusinesses.business1)
    await db.insert(schema.clients).values(testClients.client1)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createInvoice', () => {
    const validInvoiceData = {
      clientId: testClients.client1.id,
      date: new Date('2024-01-15'),
      dueDate: new Date('2024-02-15'),
      concept: 'Test Invoice',
      lines: [
        {
          description: 'Test Service',
          quantity: 10,
          unitPrice: 100,
          taxRate: 21,
          total: 1000,
        },
      ],
    }

    it('should create invoice successfully with valid data', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const result = await createInvoice(validInvoiceData)

      expect(result.success).toBe(true)
      expect(result.invoiceId).toBeDefined()
      expect(result.error).toBeUndefined()

      // Verify invoice was created in database
      const createdInvoice = await db
        .select()
        .from(schema.invoices)
        .where(schema.invoices.id.eq(result.invoiceId))

      expect(createdInvoice).toHaveLength(1)
      expect(createdInvoice[0].businessId).toBe(testBusinesses.business1.id)
      expect(createdInvoice[0].clientId).toBe(testClients.client1.id)
    })

    it('should fail without authentication', async () => {
      mockAuthenticatedUser(null) // No user

      const result = await createInvoice(validInvoiceData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('No autorizado')
    })

    it('should fail without business context', async () => {
      mockAuthenticatedUser(testUsers.admin.id) // No business

      const result = await createInvoice(validInvoiceData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('negocio activo')
    })

    it('should validate required fields', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validInvoiceData,
        clientId: '', // Empty client ID
      }

      const result = await createInvoice(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('cliente es obligatorio')
    })

    it('should validate invoice lines', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validInvoiceData,
        lines: [], // No lines
      }

      const result = await createInvoice(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('al menos una línea')
    })

    it('should validate line quantities', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validInvoiceData,
        lines: [
          {
            description: 'Test Service',
            quantity: 0, // Invalid quantity
            unitPrice: 100,
            taxRate: 21,
            total: 0,
          },
        ],
      }

      const result = await createInvoice(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('cantidad debe ser al menos 1')
    })

    it('should validate unit prices', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validInvoiceData,
        lines: [
          {
            description: 'Test Service',
            quantity: 1,
            unitPrice: -50, // Negative price
            taxRate: 21,
            total: -50,
          },
        ],
      }

      const result = await createInvoice(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('precio unitario debe ser positivo')
    })

    it('should enforce business isolation', async () => {
      // Create client in different business
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

      await db.insert(schema.businesses).values(otherBusiness)
      await db.insert(schema.clients).values(otherClient)

      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const crossBusinessData = {
        ...validInvoiceData,
        clientId: otherClient.id, // Client from different business
      }

      const result = await createInvoice(crossBusinessData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('cliente no existe')
    })

    it('should calculate totals correctly', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const multiLineData = {
        ...validInvoiceData,
        lines: [
          {
            description: 'Service 1',
            quantity: 10,
            unitPrice: 100,
            taxRate: 21,
            total: 1000,
          },
          {
            description: 'Service 2',
            quantity: 5,
            unitPrice: 50,
            taxRate: 10,
            total: 250,
          },
        ],
      }

      const result = await createInvoice(multiLineData)

      expect(result.success).toBe(true)

      const createdInvoice = await db
        .select()
        .from(schema.invoices)
        .where(schema.invoices.id.eq(result.invoiceId))

      expect(createdInvoice[0].subtotal).toBe(1250.00) // 1000 + 250
      expect(createdInvoice[0].taxAmount).toBe(235.00) // 210 + 25
      expect(createdInvoice[0].totalAmount).toBe(1485.00) // 1250 + 235
    })

    it('should create invoice lines correctly', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const result = await createInvoice(validInvoiceData)

      expect(result.success).toBe(true)

      const createdLines = await db
        .select()
        .from(schema.invoiceLines)
        .where(schema.invoiceLines.invoiceId.eq(result.invoiceId))

      expect(createdLines).toHaveLength(1)
      expect(createdLines[0].description).toBe('Test Service')
      expect(createdLines[0].quantity).toBe(10)
      expect(createdLines[0].unitPrice).toBe(100)
      expect(createdLines[0].taxRate).toBe(21)
    })

    it('should generate sequential invoice numbers', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const result1 = await createInvoice(validInvoiceData)
      const result2 = await createInvoice(validInvoiceData)

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)

      const invoice1 = await db
        .select()
        .from(schema.invoices)
        .where(schema.invoices.id.eq(result1.invoiceId))

      const invoice2 = await db
        .select()
        .from(schema.invoices)
        .where(schema.invoices.id.eq(result2.invoiceId))

      expect(invoice1[0].number).toBeDefined()
      expect(invoice2[0].number).toBeDefined()
      expect(invoice1[0].number).not.toBe(invoice2[0].number)
    })
  })

  describe('updateInvoice', () => {
    let existingInvoiceId: string

    beforeEach(async () => {
      const invoice = createTestInvoice({
        businessId: testBusinesses.business1.id,
        clientId: testClients.client1.id,
      })
      await db.insert(schema.invoices).values(invoice)
      existingInvoiceId = invoice.id
    })

    it('should update invoice successfully', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const updateData = {
        id: existingInvoiceId,
        clientId: testClients.client1.id,
        date: new Date('2024-01-20'),
        dueDate: new Date('2024-02-20'),
        concept: 'Updated Invoice',
        lines: [
          {
            description: 'Updated Service',
            quantity: 5,
            unitPrice: 200,
            taxRate: 21,
            total: 1000,
          },
        ],
      }

      const result = await updateInvoice(updateData)

      expect(result.success).toBe(true)

      const updatedInvoice = await db
        .select()
        .from(schema.invoices)
        .where(schema.invoices.id.eq(existingInvoiceId))

      expect(updatedInvoice[0].concept).toBe('Updated Invoice')
    })

    it('should prevent updating non-existent invoice', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const updateData = {
        id: 'non-existent-id',
        clientId: testClients.client1.id,
        date: new Date('2024-01-20'),
        dueDate: new Date('2024-02-20'),
        concept: 'Updated Invoice',
        lines: [
          {
            description: 'Updated Service',
            quantity: 5,
            unitPrice: 200,
            taxRate: 21,
            total: 1000,
          },
        ],
      }

      const result = await updateInvoice(updateData)

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

      const otherInvoice = createTestInvoice({
        businessId: otherBusiness.id,
        clientId: testClients.client1.id,
      })

      await db.insert(schema.businesses).values(otherBusiness)
      await db.insert(schema.invoices).values(otherInvoice)

      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const updateData = {
        id: otherInvoice.id, // Invoice from different business
        clientId: testClients.client1.id,
        date: new Date('2024-01-20'),
        dueDate: new Date('2024-02-20'),
        concept: 'Updated Invoice',
        lines: [
          {
            description: 'Updated Service',
            quantity: 5,
            unitPrice: 200,
            taxRate: 21,
            total: 1000,
          },
        ],
      }

      const result = await updateInvoice(updateData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('no existe')
    })
  })

  describe('deleteInvoice', () => {
    let existingInvoiceId: string

    beforeEach(async () => {
      const invoice = createTestInvoice({
        businessId: testBusinesses.business1.id,
        clientId: testClients.client1.id,
      })
      await db.insert(schema.invoices).values(invoice)
      existingInvoiceId = invoice.id
    })

    it('should delete invoice successfully', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const result = await deleteInvoice(existingInvoiceId)

      expect(result.success).toBe(true)

      const deletedInvoice = await db
        .select()
        .from(schema.invoices)
        .where(schema.invoices.id.eq(existingInvoiceId))

      expect(deletedInvoice[0].isDeleted).toBe(true)
    })

    it('should prevent deleting non-existent invoice', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const result = await deleteInvoice('non-existent-id')

      expect(result.success).toBe(false)
      expect(result.error).toContain('no existe')
    })

    it('should prevent cross-business deletion', async () => {
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

      const otherInvoice = createTestInvoice({
        businessId: otherBusiness.id,
        clientId: testClients.client1.id,
      })

      await db.insert(schema.businesses).values(otherBusiness)
      await db.insert(schema.invoices).values(otherInvoice)

      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const result = await deleteInvoice(otherInvoice.id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('no existe')
    })

    it('should perform soft delete, not hard delete', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const result = await deleteInvoice(existingInvoiceId)

      expect(result.success).toBe(true)

      // Record should still exist but marked as deleted
      const deletedInvoice = await db
        .select()
        .from(schema.invoices)
        .where(schema.invoices.id.eq(existingInvoiceId))

      expect(deletedInvoice).toHaveLength(1)
      expect(deletedInvoice[0].isDeleted).toBe(true)
    })
  })

  describe('Permission Checks', () => {
    it('should check create permissions', async () => {
      // Mock user with no permissions
      jest.mock('@/lib/auth', () => ({
        getCurrentUser: jest.fn().mockResolvedValue({ id: testUsers.user.id }),
        hasPermission: jest.fn().mockResolvedValue(false), // No permissions
      }))

      const result = await createInvoice({
        clientId: testClients.client1.id,
        date: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        concept: 'Test Invoice',
        lines: [
          {
            description: 'Test Service',
            quantity: 1,
            unitPrice: 100,
            taxRate: 21,
            total: 100,
          },
        ],
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('permisos')
    })
  })
})