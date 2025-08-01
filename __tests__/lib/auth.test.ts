/**
 * @jest-environment jsdom
 */

import { verifyPassword, hashPassword, isAuthenticated, getCurrentUser, hasPermission } from '@/lib/auth'
import { setupTestDb, cleanTestDb } from '../helpers/testDb'
import { testUsers, testBusinesses, testUserPermissions } from '../fixtures/testData'
import * as schema from '@/app/db/schema'

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn().mockReturnValue({ value: 'test-session-token' }),
  }),
}))

describe('Authentication & Authorization', () => {
  let db: any

  beforeEach(async () => {
    db = await setupTestDb()
    await cleanTestDb()
  })

  describe('verifyPassword', () => {
    it('should verify correct password in development mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const result = await verifyPassword('password123', 'any-hash')
      expect(result).toBe(true)
      
      process.env.NODE_ENV = originalEnv
    })

    it('should handle simulated hash in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const result = await verifyPassword('any-password', '$2b$10$XpC6qPjnYjYFN9Swk3WNxOiPRRKr1Vj9Sd4gK5xHGHQBGzKNmGe2W')
      expect(result).toBe(true)
      
      process.env.NODE_ENV = originalEnv
    })

    it('should handle plain text passwords (new implementation)', async () => {
      const result = await verifyPassword('plainpassword', 'plainpassword')
      expect(result).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const result = await verifyPassword('wrongpassword', 'correctpassword')
      expect(result).toBe(false)
    })

    it('should handle bcrypt verification for production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      // Mock bcrypt compare
      const bcryptjs = require('bcryptjs')
      jest.spyOn(bcryptjs, 'compare').mockResolvedValue(true)
      
      const result = await verifyPassword('testpassword', '$2b$10$realhashedpassword')
      expect(result).toBe(true)
      expect(bcryptjs.compare).toHaveBeenCalledWith('testpassword', '$2b$10$realhashedpassword')
      
      process.env.NODE_ENV = originalEnv
    })

    it('should return false on bcrypt error', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      // Mock bcrypt to throw error
      const bcryptjs = require('bcryptjs')
      jest.spyOn(bcryptjs, 'compare').mockRejectedValue(new Error('Bcrypt error'))
      
      const result = await verifyPassword('testpassword', 'invalidhash')
      expect(result).toBe(false)
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('hashPassword', () => {
    it('should return simulated hash in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const hash = await hashPassword('anypassword')
      expect(hash).toBe('$2b$10$XpC6qPjnYjYFN9Swk3WNxOiPRRKr1Vj9Sd4gK5xHGHQBGzKNmGe2W')
      
      process.env.NODE_ENV = originalEnv
    })

    it('should use real bcrypt in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      // Mock bcrypt hash
      const bcryptjs = require('bcryptjs')
      jest.spyOn(bcryptjs, 'hash').mockResolvedValue('$2b$10$realhash')
      
      const hash = await hashPassword('testpassword')
      expect(hash).toBe('$2b$10$realhash')
      expect(bcryptjs.hash).toHaveBeenCalledWith('testpassword', 10)
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('isAuthenticated', () => {
    it('should return true in development mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const result = await isAuthenticated()
      expect(result).toBe(true)
      
      process.env.NODE_ENV = originalEnv
    })

    it('should check session token in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      const result = await isAuthenticated()
      expect(result).toBe(true) // Mocked cookie has value
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('getCurrentUser', () => {
    beforeEach(async () => {
      // Insert test user
      await db.insert(schema.users).values(testUsers.admin)
    })

    it('should return user when session exists', async () => {
      // Mock cookies to return test user ID
      const { cookies } = require('next/headers')
      cookies.mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: testUsers.admin.id }),
      })

      const user = await getCurrentUser()
      expect(user).toEqual(expect.objectContaining({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        name: testUsers.admin.name,
      }))
    })

    it('should return null when no session', async () => {
      const { cookies } = require('next/headers')
      cookies.mockResolvedValue({
        get: jest.fn().mockReturnValue(undefined),
      })

      const user = await getCurrentUser()
      expect(user).toBeNull()
    })
  })

  describe('hasPermission', () => {
    beforeEach(async () => {
      // Insert test data
      await db.insert(schema.users).values(testUsers.admin)
      await db.insert(schema.businesses).values(testBusinesses.business1)
      await db.insert(schema.userPermissions).values(testUserPermissions.adminPermissions)
      await db.insert(schema.userPermissions).values(testUserPermissions.limitedPermissions)
    })

    it('should return true for admin permissions', async () => {
      const result = await hasPermission(
        testUsers.admin.id,
        testBusinesses.business1.id,
        'invoices',
        'create'
      )
      expect(result).toBe(true)
    })

    it('should return false for limited permissions', async () => {
      const result = await hasPermission(
        testUsers.user.id,
        testBusinesses.business2.id,
        'invoices',
        'create'
      )
      expect(result).toBe(false)
    })

    it('should return true for view permission', async () => {
      const result = await hasPermission(
        testUsers.user.id,
        testBusinesses.business2.id,
        'invoices',
        'view'
      )
      expect(result).toBe(true)
    })

    it('should return false when no permission record exists', async () => {
      const result = await hasPermission(
        'non-existent-user',
        testBusinesses.business1.id,
        'invoices',
        'view'
      )
      expect(result).toBe(false)
    })

    it('should handle all action types correctly', async () => {
      const actions: Array<'view' | 'create' | 'edit' | 'delete'> = ['view', 'create', 'edit', 'delete']
      
      for (const action of actions) {
        const result = await hasPermission(
          testUsers.admin.id,
          testBusinesses.business1.id,
          'invoices',
          action
        )
        expect(result).toBe(true)
      }
    })

    it('should prevent cross-business access', async () => {
      // Try to access business1 permissions with user that only has access to business2
      const result = await hasPermission(
        testUsers.user.id,
        testBusinesses.business1.id, // Wrong business
        'invoices',
        'view'
      )
      expect(result).toBe(false)
    })
  })

  describe('Multi-tenant Security', () => {
    beforeEach(async () => {
      await db.insert(schema.users).values(testUsers.admin)
      await db.insert(schema.users).values(testUsers.user)
      await db.insert(schema.businesses).values(testBusinesses.business1)
      await db.insert(schema.businesses).values(testBusinesses.business2)
      await db.insert(schema.userPermissions).values({
        ...testUserPermissions.adminPermissions,
        businessId: testBusinesses.business1.id,
      })
      await db.insert(schema.userPermissions).values({
        ...testUserPermissions.limitedPermissions,
        businessId: testBusinesses.business2.id,
      })
    })

    it('should enforce strict business isolation', async () => {
      // User should not have access to different business
      const crossBusinessAccess = await hasPermission(
        testUsers.admin.id,
        testBusinesses.business2.id, // Different business
        'invoices',
        'view'
      )
      expect(crossBusinessAccess).toBe(false)
      
      // User should have access to their own business
      const ownBusinessAccess = await hasPermission(
        testUsers.admin.id,
        testBusinesses.business1.id, // Own business
        'invoices',
        'view'
      )
      expect(ownBusinessAccess).toBe(true)
    })

    it('should prevent privilege escalation', async () => {
      // Limited user should not gain admin permissions
      const privilegeEscalation = await hasPermission(
        testUsers.user.id,
        testBusinesses.business2.id,
        'invoices',
        'delete'
      )
      expect(privilegeEscalation).toBe(false)
    })
  })
})