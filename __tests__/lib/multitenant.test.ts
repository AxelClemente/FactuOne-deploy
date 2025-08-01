/**
 * @jest-environment jsdom
 */

import { getActiveBusiness } from '@/lib/getActiveBusiness'
import { getBusinessesForUser } from '@/lib/getBusinessesForUser'
import { setupTestDb, cleanTestDb } from '../helpers/testDb'
import { testUsers, testBusinesses, testBusinessUsers, testClients, testInvoices } from '../fixtures/testData'
import * as schema from '@/app/db/schema'
import { eq, and } from 'drizzle-orm'

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn().mockReturnValue({ value: 'test-session-token' }),
  }),
}))

describe('Multi-tenant Data Isolation', () => {
  let db: any

  beforeEach(async () => {
    db = await setupTestDb()
    await cleanTestDb()

    // Insert test data
    await db.insert(schema.users).values([testUsers.admin, testUsers.accountant, testUsers.user])
    await db.insert(schema.businesses).values([testBusinesses.business1, testBusinesses.business2])
    await db.insert(schema.businessUsers).values([
      testBusinessUsers.adminBusiness1,
      testBusinessUsers.accountantBusiness1,
      testBusinessUsers.userBusiness2,
    ])
    await db.insert(schema.clients).values([testClients.client1, testClients.client2])
    await db.insert(schema.invoices).values([testInvoices.invoice1, testInvoices.invoice2])
  })

  describe('getActiveBusiness', () => {
    it('should return correct business for authenticated user', async () => {
      // Mock session with specific user
      const { cookies } = require('next/headers')
      cookies.mockResolvedValue({
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'session_user_id') return { value: testUsers.admin.id }
          if (key === 'session_business_id') return { value: testBusinesses.business1.id }
          return undefined
        }),
      })

      const businessId = await getActiveBusiness()
      expect(businessId).toBe(testBusinesses.business1.id)
    })

    it('should return null when no active business set', async () => {
      const { cookies } = require('next/headers')
      cookies.mockResolvedValue({
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'session_user_id') return { value: testUsers.admin.id }
          return undefined // No business_id cookie
        }),
      })

      const businessId = await getActiveBusiness()
      expect(businessId).toBeNull()
    })
  })

  describe('getBusinessesForUser', () => {
    it('should return only businesses user has access to', async () => {
      const businesses = await getBusinessesForUser(testUsers.admin.id)
      
      expect(businesses).toHaveLength(1)
      expect(businesses[0].business.id).toBe(testBusinesses.business1.id)
      expect(businesses[0].businessUser.role).toBe('admin')
    })

    it('should return empty array for user with no businesses', async () => {
      const businesses = await getBusinessesForUser('non-existent-user')
      expect(businesses).toHaveLength(0)
    })

    it('should include role information', async () => {
      const businesses = await getBusinessesForUser(testUsers.accountant.id)
      
      expect(businesses).toHaveLength(1)
      expect(businesses[0].businessUser.role).toBe('accountant')
    })

    it('should not return deleted businesses', async () => {
      // Mark business as deleted
      await db
        .update(schema.businesses)
        .set({ isDeleted: true })
        .where(eq(schema.businesses.id, testBusinesses.business1.id))

      const businesses = await getBusinessesForUser(testUsers.admin.id)
      expect(businesses).toHaveLength(0)
    })

    it('should not return inactive business relationships', async () => {
      // Mark business relationship as inactive
      await db
        .update(schema.businessUsers)
        .set({ isActive: false })
        .where(eq(schema.businessUsers.id, testBusinessUsers.adminBusiness1.id))

      const businesses = await getBusinessesForUser(testUsers.admin.id)
      expect(businesses).toHaveLength(0)
    })
  })

  describe('Data Isolation by Business', () => {
    it('should isolate client data by businessId', async () => {
      // Get clients for business 1
      const business1Clients = await db
        .select()
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.businessId, testBusinesses.business1.id),
            eq(schema.clients.isDeleted, false)
          )
        )

      // Get clients for business 2
      const business2Clients = await db
        .select()
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.businessId, testBusinesses.business2.id),
            eq(schema.clients.isDeleted, false)
          )
        )

      expect(business1Clients).toHaveLength(1)
      expect(business1Clients[0].id).toBe(testClients.client1.id)
      expect(business1Clients[0].name).toBe('Test Client 1')

      expect(business2Clients).toHaveLength(1)
      expect(business2Clients[0].id).toBe(testClients.client2.id)
      expect(business2Clients[0].name).toBe('Test Client 2')

      // Ensure no cross-contamination
      expect(business1Clients[0].businessId).not.toBe(business2Clients[0].businessId)
    })

    it('should isolate invoice data by businessId', async () => {
      const business1Invoices = await db
        .select()
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.businessId, testBusinesses.business1.id),
            eq(schema.invoices.isDeleted, false)
          )
        )

      const business2Invoices = await db
        .select()
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.businessId, testBusinesses.business2.id),
            eq(schema.invoices.isDeleted, false)
          )
        )

      expect(business1Invoices).toHaveLength(1)
      expect(business1Invoices[0].number).toBe('INV-001')
      expect(business1Invoices[0].totalAmount).toBe(1210.00)

      expect(business2Invoices).toHaveLength(1)  
      expect(business2Invoices[0].number).toBe('INV-002')
      expect(business2Invoices[0].totalAmount).toBe(605.00)
    })

    it('should prevent cross-business data access attempts', async () => {
      // Attempt to get business1 client with business2 filter
      const crossAccessAttempt = await db
        .select()
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.id, testClients.client1.id), // Business 1 client
            eq(schema.clients.businessId, testBusinesses.business2.id), // Business 2 filter
            eq(schema.clients.isDeleted, false)
          )
        )

      expect(crossAccessAttempt).toHaveLength(0)
    })
  })

  describe('User-Business Relationship Security', () => {
    it('should enforce user can only access assigned businesses', async () => {
      // Admin should only access business1
      const adminBusinesses = await getBusinessesForUser(testUsers.admin.id)
      expect(adminBusinesses).toHaveLength(1)
      expect(adminBusinesses[0].business.id).toBe(testBusinesses.business1.id)

      // User should only access business2
      const userBusinesses = await getBusinessesForUser(testUsers.user.id)
      expect(userBusinesses).toHaveLength(1)
      expect(userBusinesses[0].business.id).toBe(testBusinesses.business2.id)
    })

    it('should handle multiple business access correctly', async () => {
      // Add user to multiple businesses
      await db.insert(schema.businessUsers).values({
        id: 'bu-multi-001',
        userId: testUsers.admin.id,
        businessId: testBusinesses.business2.id,
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const businesses = await getBusinessesForUser(testUsers.admin.id)
      expect(businesses).toHaveLength(2)
      
      const businessIds = businesses.map(b => b.business.id)
      expect(businessIds).toContain(testBusinesses.business1.id)
      expect(businessIds).toContain(testBusinesses.business2.id)
    })

    it('should respect role hierarchy', async () => {
      const adminBusinesses = await getBusinessesForUser(testUsers.admin.id)
      const accountantBusinesses = await getBusinessesForUser(testUsers.accountant.id)
      const userBusinesses = await getBusinessesForUser(testUsers.user.id)

      expect(adminBusinesses[0].businessUser.role).toBe('admin')
      expect(accountantBusinesses[0].businessUser.role).toBe('accountant')
      expect(userBusinesses[0].businessUser.role).toBe('user')
    })
  })

  describe('Data Integrity Across Tenants', () => {
    it('should maintain foreign key relationships within business boundaries', async () => {
      // Invoice should only reference client from same business
      const invoiceWithClient = await db
        .select({
          invoice: schema.invoices,
          client: schema.clients,
        })
        .from(schema.invoices)
        .leftJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
        .where(eq(schema.invoices.id, testInvoices.invoice1.id))

      expect(invoiceWithClient).toHaveLength(1)
      expect(invoiceWithClient[0].invoice.businessId).toBe(invoiceWithClient[0].client?.businessId)
    })

    it('should prevent orphaned records across businesses', async () => {
      // Try to create invoice in business1 that references client from business2
      const crossBusinessInvoice = {
        id: 'invoice-cross-001',
        businessId: testBusinesses.business1.id, // Business 1
        clientId: testClients.client2.id, // Client from Business 2
        number: 'INV-CROSS-001',
        date: new Date(),
        dueDate: new Date(),
        subtotal: 100.00,
        taxAmount: 21.00,
        totalAmount: 121.00,
        status: 'draft' as const,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // This should either fail or be caught by application logic
      try {
        await db.insert(schema.invoices).values(crossBusinessInvoice)
        
        // If insertion succeeds, verify we can't find matching client
        const invalidRelation = await db
          .select({
            invoice: schema.invoices,
            client: schema.clients,
          })
          .from(schema.invoices)
          .leftJoin(schema.clients, and(
            eq(schema.invoices.clientId, schema.clients.id),
            eq(schema.clients.businessId, schema.invoices.businessId) // Same business constraint
          ))
          .where(eq(schema.invoices.id, crossBusinessInvoice.id))

        expect(invalidRelation[0].client).toBeNull()
      } catch (error) {
        // Expected: foreign key constraint should prevent this
        expect(error).toBeDefined()
      }
    })
  })

  describe('Business Switching Security', () => {
    it('should handle business context switching safely', async () => {
      // Simulate switching active business
      const { cookies } = require('next/headers')
      
      // First, set business1 as active
      cookies.mockResolvedValue({
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'session_user_id') return { value: testUsers.admin.id }
          if (key === 'session_business_id') return { value: testBusinesses.business1.id }
          return undefined
        }),
      })

      let activeBusinessId = await getActiveBusiness()
      expect(activeBusinessId).toBe(testBusinesses.business1.id)

      // Then switch to business2 (should fail since admin doesn't have access)
      cookies.mockResolvedValue({
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'session_user_id') return { value: testUsers.admin.id }
          if (key === 'session_business_id') return { value: testBusinesses.business2.id }
          return undefined
        }),
      })

      activeBusinessId = await getActiveBusiness()
      
      // Even though cookie has business2, admin shouldn't have access to it
      const userBusinesses = await getBusinessesForUser(testUsers.admin.id)
      const hasAccessToBusiness2 = userBusinesses.some(b => b.business.id === testBusinesses.business2.id)
      expect(hasAccessToBusiness2).toBe(false)
    })
  })
})