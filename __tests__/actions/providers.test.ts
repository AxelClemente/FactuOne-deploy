/**
 * @jest-environment jsdom
 */

import { createProvider, updateProvider, deleteProvider, getProviders } from '@/app/(dashboard)/proveedores/actions'
import { setupTestDb, cleanTestDb } from '../helpers/testDb'
import { mockAuthenticatedUser, clearAuthMocks } from '../helpers/authTestHelper'
import { testUsers, testBusinesses, createTestUser } from '../fixtures/testData'
import * as schema from '@/app/db/schema'

// Mock dependencies
jest.mock('@/lib/notifications', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
}))

describe('Provider Actions', () => {
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

  describe('createProvider', () => {
    const validProviderData = {
      name: 'Proveedor Test',
      nif: 'B87654321',
      address: 'Calle Proveedor 123',
      postalCode: '28001',
      city: 'Madrid',
      country: 'España',
      phone: '987654321',
      email: 'proveedor@test.com',
    }

    it('should create provider successfully with valid data', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const result = await createProvider(testBusinesses.business1.id, validProviderData)

      expect(result.success).toBe(true)
      expect(result.providerId).toBeDefined()
      expect(result.error).toBeUndefined()

      // Verify provider was created in database
      const createdProvider = await db
        .select()
        .from(schema.providers)
        .where(schema.providers.id.eq(result.providerId))

      expect(createdProvider).toHaveLength(1)
      expect(createdProvider[0].businessId).toBe(testBusinesses.business1.id)
      expect(createdProvider[0].name).toBe(validProviderData.name)
      expect(createdProvider[0].nif).toBe(validProviderData.nif)
      expect(createdProvider[0].email).toBe(validProviderData.email)
    })

    it('should fail without authentication', async () => {
      // No mock authentication
      const result = await createProvider(testBusinesses.business1.id, validProviderData)

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

      const result = await createProvider(testBusinesses.business1.id, validProviderData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('permisos')
    })

    it('should validate required fields', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validProviderData,
        name: '', // Empty name
      }

      const result = await createProvider(testBusinesses.business1.id, invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('nombre es obligatorio')
    })

    it('should validate NIF field', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validProviderData,
        nif: '', // Empty NIF
      }

      const result = await createProvider(testBusinesses.business1.id, invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('NIF es obligatorio')
    })

    it('should validate address field', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validProviderData,
        address: '', // Empty address
      }

      const result = await createProvider(testBusinesses.business1.id, invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('dirección es obligatoria')
    })

    it('should validate email format', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validProviderData,
        email: 'invalid-email', // Invalid email format
      }

      const result = await createProvider(testBusinesses.business1.id, invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Email inválido')
    })

    it('should allow empty email', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const dataWithEmptyEmail = {
        ...validProviderData,
        email: '', // Empty email should be allowed
      }

      const result = await createProvider(testBusinesses.business1.id, dataWithEmptyEmail)

      expect(result.success).toBe(true)
      expect(result.providerId).toBeDefined()
    })

    it('should prevent duplicate NIF in same business', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      // Insert existing provider with same NIF
      const existingProvider = {
        id: 'provider-existing',
        businessId: testBusinesses.business1.id,
        name: 'Proveedor Existente',
        nif: validProviderData.nif, // Same NIF
        address: 'Dirección Existente',
        postalCode: '28002',
        city: 'Madrid',
        country: 'España',
        phone: '123456789',
        email: 'existente@test.com',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.insert(schema.providers).values(existingProvider)

      const result = await createProvider(testBusinesses.business1.id, validProviderData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('NIF ya existe')
    })

    it('should allow same NIF in different businesses', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      // Insert provider with same NIF in different business
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
        nif: validProviderData.nif, // Same NIF but different business
        address: 'Other Address',
        postalCode: '99999',
        city: 'Other City',
        country: 'Other Country',
        phone: '999999999',
        email: 'other@test.com',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.insert(schema.businesses).values(otherBusiness)
      await db.insert(schema.providers).values(otherProvider)

      const result = await createProvider(testBusinesses.business1.id, validProviderData)

      expect(result.success).toBe(true)
    })

    it('should handle optional fields correctly', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const minimalData = {
        name: 'Proveedor Mínimo',
        nif: 'B11111111',
        address: 'Dirección Mínima',
        // All other fields optional
      }

      const result = await createProvider(testBusinesses.business1.id, minimalData)

      expect(result.success).toBe(true)
      expect(result.providerId).toBeDefined()

      const createdProvider = await db
        .select()
        .from(schema.providers)
        .where(schema.providers.id.eq(result.providerId))

      expect(createdProvider[0].name).toBe(minimalData.name)
      expect(createdProvider[0].postalCode).toBeNull()
      expect(createdProvider[0].city).toBeNull()
    })
  })

  describe('updateProvider', () => {
    let existingProviderId: string

    beforeEach(async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      // Create provider to update
      const provider = {
        id: 'provider-to-update',
        businessId: testBusinesses.business1.id,
        name: 'Proveedor Original',
        nif: 'B87654321',
        address: 'Dirección Original',
        postalCode: '28001',
        city: 'Madrid',
        country: 'España',
        phone: '123456789',
        email: 'original@test.com',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await db.insert(schema.providers).values(provider)
      existingProviderId = provider.id
    })

    it('should update provider successfully', async () => {
      const updateData = {
        name: 'Proveedor Actualizado',
        nif: 'B11111111',
        address: 'Nueva Dirección 456',
        postalCode: '28002',
        city: 'Barcelona',
        country: 'España',
        phone: '987654321',
        email: 'nuevo@test.com',
      }

      const result = await updateProvider(existingProviderId, updateData)

      expect(result.success).toBe(true)

      // Verify provider was updated
      const updatedProvider = await db
        .select()
        .from(schema.providers)
        .where(schema.providers.id.eq(existingProviderId))

      expect(updatedProvider[0].name).toBe(updateData.name)
      expect(updatedProvider[0].nif).toBe(updateData.nif)
      expect(updatedProvider[0].city).toBe(updateData.city)
      expect(updatedProvider[0].email).toBe(updateData.email)
    })

    it('should prevent updating non-existent provider', async () => {
      const result = await updateProvider('non-existent-id', {
        name: 'Test',
        nif: 'B12345678',
        address: 'Test Address',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('no existe')
    })

    it('should prevent cross-business updates', async () => {
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
        postalCode: '99999',
        city: 'Other City',
        country: 'Other Country',
        phone: '999999999',
        email: 'other@test.com',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.insert(schema.businesses).values(otherBusiness)
      await db.insert(schema.providers).values(otherProvider)

      // Try to update provider from different business
      const result = await updateProvider(otherProvider.id, {
        name: 'Hacked Update',
        nif: 'B12345678',
        address: 'Hacked Address',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('no existe')
    })

    it('should validate updated email format', async () => {
      const result = await updateProvider(existingProviderId, {
        name: 'Test Provider',
        nif: 'B12345678',
        address: 'Test Address',
        email: 'invalid-email-format',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Email inválido')
    })

    it('should prevent duplicate NIF on update', async () => {
      // Create another provider with different NIF
      const anotherProvider = {
        id: 'provider-another',
        businessId: testBusinesses.business1.id,
        name: 'Otro Proveedor',
        nif: 'B99999999',
        address: 'Otra Dirección',
        postalCode: '28003',
        city: 'Valencia',
        country: 'España',
        phone: '555555555',
        email: 'otro@test.com',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.insert(schema.providers).values(anotherProvider)

      // Try to update first provider with second provider's NIF
      const result = await updateProvider(existingProviderId, {
        name: 'Updated Provider',
        nif: anotherProvider.nif, // Duplicate NIF
        address: 'Updated Address',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('NIF ya existe')
    })
  })

  describe('deleteProvider', () => {
    let existingProviderId: string

    beforeEach(async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      const provider = {
        id: 'provider-to-delete',
        businessId: testBusinesses.business1.id,
        name: 'Proveedor a Eliminar',
        nif: 'B87654321',
        address: 'Dirección a Eliminar',
        postalCode: '28001',
        city: 'Madrid',
        country: 'España',
        phone: '123456789',
        email: 'delete@test.com',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await db.insert(schema.providers).values(provider)
      existingProviderId = provider.id
    })

    it('should delete provider successfully', async () => {
      const result = await deleteProvider(existingProviderId)

      expect(result.success).toBe(true)

      // Verify soft delete
      const deletedProvider = await db
        .select()
        .from(schema.providers)
        .where(schema.providers.id.eq(existingProviderId))

      expect(deletedProvider[0].isDeleted).toBe(true)
    })

    it('should prevent deleting non-existent provider', async () => {
      const result = await deleteProvider('non-existent-id')

      expect(result.success).toBe(false)
      expect(result.error).toContain('no existe')
    })

    it('should prevent deleting provider with received invoices', async () => {
      // Create received invoice for this provider
      const receivedInvoice = {
        id: 'invoice-with-provider',
        businessId: testBusinesses.business1.id,
        providerId: existingProviderId,
        date: new Date(),
        amount: 1000.00,
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

      await db.insert(schema.receivedInvoices).values(receivedInvoice)

      const result = await deleteProvider(existingProviderId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('facturas recibidas asociadas')
    })

    it('should perform soft delete, not hard delete', async () => {
      const result = await deleteProvider(existingProviderId)

      expect(result.success).toBe(true)

      // Provider should still exist but marked as deleted
      const deletedProvider = await db
        .select()
        .from(schema.providers)
        .where(schema.providers.id.eq(existingProviderId))

      expect(deletedProvider).toHaveLength(1)
      expect(deletedProvider[0].isDeleted).toBe(true)
    })
  })

  describe('getProviders', () => {
    beforeEach(async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      // Insert multiple providers
      await db.insert(schema.providers).values([
        {
          id: 'provider-1',
          businessId: testBusinesses.business1.id,
          name: 'Proveedor 1',
          nif: 'B11111111',
          address: 'Dirección 1',
          postalCode: '28001',
          city: 'Madrid',
          country: 'España',
          phone: '111111111',
          email: 'provider1@test.com',
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'provider-2',
          businessId: testBusinesses.business1.id,
          name: 'Proveedor 2',
          nif: 'B22222222',
          address: 'Dirección 2',
          postalCode: '28002',
          city: 'Barcelona',
          country: 'España',
          phone: '222222222',
          email: 'provider2@test.com',
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'provider-deleted',
          businessId: testBusinesses.business1.id,
          name: 'Proveedor Eliminado',
          nif: 'B33333333',
          address: 'Dirección Eliminada',
          postalCode: '28003',
          city: 'Valencia',
          country: 'España',
          phone: '333333333',
          email: 'deleted@test.com',
          isDeleted: true, // Soft deleted
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ])
    })

    it('should return only active providers', async () => {
      const providers = await getProviders(testBusinesses.business1.id)

      expect(providers).toHaveLength(2) // Only non-deleted providers
      expect(providers.every(provider => !provider.isDeleted)).toBe(true)
    })

    it('should return providers only for specified business', async () => {
      // Create providers in different business
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
      await db.insert(schema.providers).values({
        id: 'provider-other-business',
        businessId: otherBusiness.id,
        name: 'Proveedor Otro Negocio',
        nif: 'C99999999',
        address: 'Otra Dirección',
        postalCode: '99999',
        city: 'Otra Ciudad',
        country: 'Otro País',
        phone: '999999999',
        email: 'otro@test.com',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const providers = await getProviders(testBusinesses.business1.id)

      expect(providers).toHaveLength(2)
      expect(providers.every(provider => provider.businessId === testBusinesses.business1.id)).toBe(true)
    })

    it('should exclude providers based on user exclusions', async () => {
      // Create user exclusion for provider-1
      await db.insert(schema.userModuleExclusions).values({
        id: 'exclusion-1',
        userId: testUsers.admin.id,
        businessId: testBusinesses.business1.id,
        module: 'providers',
        entityId: 'provider-1',
        createdAt: new Date(),
      })

      const providers = await getProviders(testBusinesses.business1.id, testUsers.admin.id)

      expect(providers).toHaveLength(1) // Only provider-2, provider-1 excluded
      expect(providers[0].id).toBe('provider-2')
    })

    it('should return empty array for business with no providers', async () => {
      const providers = await getProviders('non-existent-business')
      expect(providers).toHaveLength(0)
    })

    it('should return all providers when no userId provided', async () => {
      // Create user exclusion (should be ignored without userId)
      await db.insert(schema.userModuleExclusions).values({
        id: 'exclusion-ignored',
        userId: testUsers.admin.id,
        businessId: testBusinesses.business1.id,
        module: 'providers',
        entityId: 'provider-1',
        createdAt: new Date(),
      })

      const providers = await getProviders(testBusinesses.business1.id) // No userId

      expect(providers).toHaveLength(2) // All active providers
    })
  })

  describe('Business Isolation', () => {
    it('should enforce strict business isolation in all provider operations', async () => {
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

      const providerData = {
        name: 'Proveedor Aislado',
        nif: 'B12345678',
        address: 'Dirección Aislada',
      }

      const result = await createProvider(testBusinesses.business1.id, providerData)

      expect(result.success).toBe(true)

      // Verify provider was created in correct business
      const createdProvider = await db
        .select()
        .from(schema.providers)
        .where(schema.providers.id.eq(result.providerId))

      expect(createdProvider[0].businessId).toBe(testBusinesses.business1.id)
      expect(createdProvider[0].businessId).not.toBe(otherBusiness.id)
    })
  })
})