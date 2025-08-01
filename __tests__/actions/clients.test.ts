/**
 * @jest-environment jsdom
 */

import { createClient, updateClient, deleteClient, getClients } from '@/app/(dashboard)/clients/actions'
import { setupTestDb, cleanTestDb } from '../helpers/testDb'
import { mockAuthenticatedUser, clearAuthMocks } from '../helpers/authTestHelper'
import { testUsers, testBusinesses, testClients, createTestUser } from '../fixtures/testData'
import * as schema from '@/app/db/schema'

// Mock dependencies
jest.mock('@/lib/notifications', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
}))

describe('Client Actions', () => {
  let db: any

  beforeEach(async () => {
    db = await setupTestDb()
    await cleanTestDb()
    clearAuthMocks()

    // Insert test data
    await db.insert(schema.users).values(testUsers.admin)
    await db.insert(schema.businesses).values(testBusinesses.business1)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createClient', () => {
    const validClientData = {
      name: 'Nuevo Cliente Test',
      nif: 'B12345678',
      address: 'Calle Test 123',
      email: 'cliente@test.com',
      phone: '123456789',
    }

    it('should create client successfully with valid data', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const result = await createClient(testBusinesses.business1.id, validClientData)

      expect(result.success).toBe(true)
      expect(result.clientId).toBeDefined()
      expect(result.error).toBeUndefined()

      // Verify client was created in database
      const createdClient = await db
        .select()
        .from(schema.clients)
        .where(schema.clients.id.eq(result.clientId))

      expect(createdClient).toHaveLength(1)
      expect(createdClient[0].businessId).toBe(testBusinesses.business1.id)
      expect(createdClient[0].name).toBe(validClientData.name)
      expect(createdClient[0].nif).toBe(validClientData.nif)
    })

    it('should fail without authentication', async () => {
      // No mock authentication
      const result = await createClient(testBusinesses.business1.id, validClientData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('iniciado sesión')
    })

    it('should fail without create permissions', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      // Mock hasPermission to return false
      jest.mock('@/lib/auth', () => ({
        getCurrentUser: jest.fn().mockResolvedValue({ id: testUsers.admin.id }),
        hasPermission: jest.fn().mockResolvedValue(false),
      }))

      const result = await createClient(testBusinesses.business1.id, validClientData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('permisos')
    })

    it('should validate required fields', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validClientData,
        name: '', // Empty name
      }

      const result = await createClient(testBusinesses.business1.id, invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('nombre es obligatorio')
    })

    it('should validate NIF field', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validClientData,
        nif: '', // Empty NIF
      }

      const result = await createClient(testBusinesses.business1.id, invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('NIF/CIF es obligatorio')
    })

    it('should validate email format', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validClientData,
        email: 'invalid-email', // Invalid email format
      }

      const result = await createClient(testBusinesses.business1.id, invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('formato válido')
    })

    it('should prevent duplicate NIF in same business', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      // Insert existing client with same NIF
      await db.insert(schema.clients).values({
        ...testClients.client1,
        businessId: testBusinesses.business1.id,
        nif: validClientData.nif, // Same NIF
      })

      const result = await createClient(testBusinesses.business1.id, validClientData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('NIF ya existe')
    })

    it('should allow same NIF in different businesses', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      // Insert client with same NIF in different business
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
      await db.insert(schema.clients).values({
        ...testClients.client1,
        businessId: otherBusiness.id,
        nif: validClientData.nif, // Same NIF but different business
      })

      const result = await createClient(testBusinesses.business1.id, validClientData)

      expect(result.success).toBe(true)
    })

    it('should handle optional fields correctly', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const minimalData = {
        name: 'Cliente Mínimo',
        nif: 'B87654321',
        address: 'Dirección Mínima',
        email: '', // Empty email should be allowed
        phone: '', // Empty phone should be allowed
      }

      const result = await createClient(testBusinesses.business1.id, minimalData)

      expect(result.success).toBe(true)
      expect(result.clientId).toBeDefined()
    })
  })

  describe('updateClient', () => {
    let existingClientId: string

    beforeEach(async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      // Create client to update
      const client = {
        ...testClients.client1,
        businessId: testBusinesses.business1.id,
      }
      await db.insert(schema.clients).values(client)
      existingClientId = client.id
    })

    it('should update client successfully', async () => {
      const updateData = {
        name: 'Cliente Actualizado',
        nif: 'B11111111',
        address: 'Nueva Dirección 456',
        email: 'nuevo@test.com',
        phone: '987654321',
      }

      const result = await updateClient(existingClientId, updateData)

      expect(result.success).toBe(true)

      // Verify client was updated
      const updatedClient = await db
        .select()
        .from(schema.clients)
        .where(schema.clients.id.eq(existingClientId))

      expect(updatedClient[0].name).toBe(updateData.name)
      expect(updatedClient[0].nif).toBe(updateData.nif)
      expect(updatedClient[0].address).toBe(updateData.address)
    })

    it('should prevent updating non-existent client', async () => {
      const result = await updateClient('non-existent-id', {
        name: 'Test',
        nif: 'B12345678',
        address: 'Test Address',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('no existe')
    })

    it('should prevent cross-business updates', async () => {
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

      // Try to update client from different business
      const result = await updateClient(otherClient.id, {
        name: 'Hacked Update',
        nif: 'B12345678',
        address: 'Hacked Address',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('no existe')
    })
  })

  describe('deleteClient', () => {
    let existingClientId: string

    beforeEach(async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      const client = {
        ...testClients.client1,
        businessId: testBusinesses.business1.id,
      }
      await db.insert(schema.clients).values(client)
      existingClientId = client.id
    })

    it('should delete client successfully', async () => {
      const result = await deleteClient(existingClientId)

      expect(result.success).toBe(true)

      // Verify soft delete
      const deletedClient = await db
        .select()
        .from(schema.clients)
        .where(schema.clients.id.eq(existingClientId))

      expect(deletedClient[0].isDeleted).toBe(true)
    })

    it('should prevent deleting non-existent client', async () => {
      const result = await deleteClient('non-existent-id')

      expect(result.success).toBe(false)
      expect(result.error).toContain('no existe')
    })

    it('should prevent deleting client with active invoices', async () => {
      // Create invoice for this client
      const invoice = {
        id: 'invoice-with-client',
        businessId: testBusinesses.business1.id,
        clientId: existingClientId,
        number: 'INV-TEST',
        date: new Date(),
        dueDate: new Date(),
        subtotal: 100,
        taxAmount: 21,
        totalAmount: 121,
        status: 'sent' as const,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.insert(schema.invoices).values(invoice)

      const result = await deleteClient(existingClientId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('facturas asociadas')
    })

    it('should perform soft delete, not hard delete', async () => {
      const result = await deleteClient(existingClientId)

      expect(result.success).toBe(true)

      // Client should still exist but marked as deleted
      const deletedClient = await db
        .select()
        .from(schema.clients)
        .where(schema.clients.id.eq(existingClientId))

      expect(deletedClient).toHaveLength(1)
      expect(deletedClient[0].isDeleted).toBe(true)
    })
  })

  describe('getClients', () => {
    beforeEach(async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      // Insert multiple clients
      await db.insert(schema.clients).values([
        { ...testClients.client1, businessId: testBusinesses.business1.id },
        { 
          id: 'client-2',
          businessId: testBusinesses.business1.id,
          name: 'Cliente 2',
          nif: 'B87654321',
          address: 'Dirección 2',
          city: 'Ciudad 2',
          postalCode: '54321',
          phone: '987654321',
          email: 'client2@test.com',
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'client-deleted',
          businessId: testBusinesses.business1.id,
          name: 'Cliente Eliminado',
          nif: 'B11111111',
          address: 'Dirección Eliminada',
          city: 'Ciudad',
          postalCode: '11111',
          phone: '111111111',
          email: 'deleted@test.com',
          isDeleted: true, // Soft deleted
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ])
    })

    it('should return only active clients', async () => {
      const clients = await getClients(testBusinesses.business1.id)

      expect(clients).toHaveLength(2) // Only non-deleted clients
      expect(clients.every(client => !client.isDeleted)).toBe(true)
    })

    it('should return clients only for specified business', async () => {
      // Create clients in different business
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
      await db.insert(schema.clients).values({
        id: 'client-other-business',
        businessId: otherBusiness.id,
        name: 'Cliente Otro Negocio',
        nif: 'C99999999',
        address: 'Otra Dirección',
        city: 'Otra Ciudad',
        postalCode: '99999',
        phone: '999999999',
        email: 'otro@test.com',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const clients = await getClients(testBusinesses.business1.id)

      expect(clients).toHaveLength(2)
      expect(clients.every(client => client.businessId === testBusinesses.business1.id)).toBe(true)
    })

    it('should return empty array for business with no clients', async () => {
      const clients = await getClients('non-existent-business')
      expect(clients).toHaveLength(0)
    })
  })

  describe('Business Isolation', () => {
    it('should enforce strict business isolation in all operations', async () => {
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

      // Try to create client in different business (should be prevented by business context)
      const result = await createClient(otherBusiness.id, {
        name: 'Cliente Cross-Business',
        nif: 'B12345678',
        address: 'Cross Address',
      })

      // This should fail due to business context mismatch
      expect(result.success).toBe(false)
    })
  })
})