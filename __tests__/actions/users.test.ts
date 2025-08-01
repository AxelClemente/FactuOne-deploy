/**
 * @jest-environment jsdom
 */

import { registerUser, updateUserPermissions, deactivateUser } from '@/app/(dashboard)/users/actions'
import { setupTestDb, cleanTestDb } from '../helpers/testDb'
import { mockAuthenticatedUser, clearAuthMocks } from '../helpers/authTestHelper'
import { testUsers, testBusinesses, testBusinessUsers, createTestUser } from '../fixtures/testData'
import * as schema from '@/app/db/schema'

describe('User Management Actions', () => {
  let db: any

  beforeEach(async () => {
    db = await setupTestDb()
    await cleanTestDb()
    clearAuthMocks()

    // Insert test data
    await db.insert(schema.users).values(testUsers.admin)
    await db.insert(schema.businesses).values(testBusinesses.business1)
    await db.insert(schema.businessUsers).values(testBusinessUsers.adminBusiness1)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('registerUser', () => {
    const validUserData = {
      name: 'Nuevo Usuario',
      email: 'nuevo@test.com',
      password: 'password123',
      businessId: testBusinesses.business1.id,
      role: 'accountant' as const,
      permissions: {
        clients: {
          canView: true,
          canCreate: true,
          canEdit: false,
          canDelete: false,
        },
        invoices: {
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
        },
      },
    }

    it('should register new user successfully with valid data', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const result = await registerUser(validUserData)

      expect(result.success).toBe(true)
      expect(result.userId).toBeDefined()
      expect(result.error).toBeUndefined()
      expect(result.userExists).toBeFalsy()

      // Verify user was created in database
      const createdUser = await db
        .select()
        .from(schema.users)
        .where(schema.users.id.eq(result.userId))

      expect(createdUser).toHaveLength(1)
      expect(createdUser[0].email).toBe(validUserData.email)
      expect(createdUser[0].name).toBe(validUserData.name)

      // Verify business relationship was created
      const businessUser = await db
        .select()
        .from(schema.businessUsers)
        .where(
          schema.businessUsers.userId.eq(result.userId).and(
            schema.businessUsers.businessId.eq(testBusinesses.business1.id)
          )
        )

      expect(businessUser).toHaveLength(1)
      expect(businessUser[0].role).toBe('accountant')
      expect(businessUser[0].isActive).toBe(true)

      // Verify permissions were created
      const permissions = await db
        .select()
        .from(schema.userPermissions)
        .where(
          schema.userPermissions.userId.eq(result.userId).and(
            schema.userPermissions.businessId.eq(testBusinesses.business1.id)
          )
        )

      expect(permissions).toHaveLength(2) // clients and invoices permissions
      
      const clientsPermission = permissions.find(p => p.module === 'clients')
      expect(clientsPermission?.canView).toBe(true)
      expect(clientsPermission?.canCreate).toBe(true)
      expect(clientsPermission?.canEdit).toBe(false)
      expect(clientsPermission?.canDelete).toBe(false)

      const invoicesPermission = permissions.find(p => p.module === 'invoices')
      expect(invoicesPermission?.canView).toBe(true)
      expect(invoicesPermission?.canCreate).toBe(false)
    })

    it('should fail without authentication', async () => {
      // No mock authentication
      const result = await registerUser(validUserData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('iniciado sesión')
    })

    it('should fail without admin permissions', async () => {
      // Mock user without admin role
      mockAuthenticatedUser(testUsers.user.id, testBusinesses.business1.id)
      
      // Create business user with non-admin role
      await db.insert(schema.businessUsers).values({
        id: 'bu-non-admin',
        userId: testUsers.user.id,
        businessId: testBusinesses.business1.id,
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await registerUser(validUserData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('permisos de administrador')
    })

    it('should validate required fields', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validUserData,
        email: '', // Empty email
      }

      const result = await registerUser(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Email inválido')
    })

    it('should validate email format', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validUserData,
        email: 'invalid-email', // Invalid email format
      }

      const result = await registerUser(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Email inválido')
    })

    it('should validate password length', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validUserData,
        password: '123', // Too short
      }

      const result = await registerUser(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('al menos 6 caracteres')
    })

    it('should validate role enum', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const invalidData = {
        ...validUserData,
        role: 'invalid-role' as any, // Invalid role
      }

      const result = await registerUser(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle duplicate email gracefully', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      // Insert user with same email
      const existingUser = createTestUser({
        email: validUserData.email,
      })
      await db.insert(schema.users).values(existingUser)

      const result = await registerUser(validUserData)

      expect(result.success).toBe(false)
      expect(result.userExists).toBe(true)
      expect(result.error).toContain('ya existe')
    })

    it('should hash password correctly', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const result = await registerUser(validUserData)
      expect(result.success).toBe(true)

      const createdUser = await db
        .select()
        .from(schema.users)
        .where(schema.users.id.eq(result.userId))

      // Password should be hashed, not plain text
      expect(createdUser[0].hashedPassword).not.toBe(validUserData.password)
      expect(createdUser[0].hashedPassword).toMatch(/^\$2[ab]\$/)
    })

    it('should create user exclusions when provided', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      // Create some clients to exclude
      const client1 = {
        id: 'client-exclude-1',
        businessId: testBusinesses.business1.id,
        name: 'Cliente Excluir 1',
        nif: 'B11111111',
        address: 'Dirección 1',
        city: 'Ciudad 1',
        postalCode: '11111',
        phone: '111111111',
        email: 'client1@test.com',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const client2 = {
        id: 'client-exclude-2',
        businessId: testBusinesses.business1.id,
        name: 'Cliente Excluir 2',
        nif: 'B22222222',
        address: 'Dirección 2',
        city: 'Ciudad 2',
        postalCode: '22222',
        phone: '222222222',
        email: 'client2@test.com',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.insert(schema.clients).values([client1, client2])

      const userDataWithExclusions = {
        ...validUserData,
        exclusions: {
          clients: [client1.id, client2.id],
        },
      }

      const result = await registerUser(userDataWithExclusions)
      expect(result.success).toBe(true)

      // Verify exclusions were created
      const exclusions = await db
        .select()
        .from(schema.userModuleExclusions)
        .where(
          schema.userModuleExclusions.userId.eq(result.userId).and(
            schema.userModuleExclusions.businessId.eq(testBusinesses.business1.id)
          )
        )

      expect(exclusions).toHaveLength(2)
      expect(exclusions.every(e => e.module === 'clients')).toBe(true)
      expect(exclusions.map(e => e.entityId)).toContain(client1.id)
      expect(exclusions.map(e => e.entityId)).toContain(client2.id)
    })

    it('should allow admin to register admin users', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const adminUserData = {
        ...validUserData,
        role: 'admin' as const,
      }

      const result = await registerUser(adminUserData)

      expect(result.success).toBe(true)

      const businessUser = await db
        .select()
        .from(schema.businessUsers)
        .where(
          schema.businessUsers.userId.eq(result.userId).and(
            schema.businessUsers.businessId.eq(testBusinesses.business1.id)
          )
        )

      expect(businessUser[0].role).toBe('admin')
    })
  })

  describe('updateUserPermissions', () => {
    let targetUserId: string

    beforeEach(async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      // Create target user
      const targetUser = createTestUser({
        email: 'target@test.com',
      })
      await db.insert(schema.users).values(targetUser)
      
      // Create business relationship
      await db.insert(schema.businessUsers).values({
        id: 'bu-target',
        userId: targetUser.id,
        businessId: testBusinesses.business1.id,
        role: 'accountant',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Create initial permissions
      await db.insert(schema.userPermissions).values([
        {
          id: 'perm-clients',
          userId: targetUser.id,
          businessId: testBusinesses.business1.id,
          module: 'clients',
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'perm-invoices',
          userId: targetUser.id,
          businessId: testBusinesses.business1.id,
          module: 'invoices',
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      targetUserId = targetUser.id
    })

    it('should update user permissions successfully', async () => {
      const newPermissions = {
        clients: {
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: false,
        },
        invoices: {
          canView: true,
          canCreate: true,
          canEdit: false,
          canDelete: false,
        },
      }

      const result = await updateUserPermissions(
        targetUserId,
        testBusinesses.business1.id,
        newPermissions
      )

      expect(result.success).toBe(true)

      // Verify permissions were updated
      const updatedPermissions = await db
        .select()
        .from(schema.userPermissions)
        .where(
          schema.userPermissions.userId.eq(targetUserId).and(
            schema.userPermissions.businessId.eq(testBusinesses.business1.id)
          )
        )

      const clientsPermission = updatedPermissions.find(p => p.module === 'clients')
      expect(clientsPermission?.canCreate).toBe(true)
      expect(clientsPermission?.canEdit).toBe(true)

      const invoicesPermission = updatedPermissions.find(p => p.module === 'invoices')
      expect(invoicesPermission?.canCreate).toBe(true)
    })

    it('should fail without admin permissions', async () => {
      // Mock user without admin role  
      mockAuthenticatedUser(testUsers.user.id, testBusinesses.business1.id)
      
      await db.insert(schema.businessUsers).values({
        id: 'bu-non-admin-2',
        userId: testUsers.user.id,
        businessId: testBusinesses.business1.id,
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await updateUserPermissions(
        targetUserId,
        testBusinesses.business1.id,
        { clients: { canView: true, canCreate: true, canEdit: true, canDelete: true } }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('permisos de administrador')
    })

    it('should prevent updating permissions for non-existent user', async () => {
      const result = await updateUserPermissions(
        'non-existent-user',
        testBusinesses.business1.id,
        { clients: { canView: true, canCreate: true, canEdit: true, canDelete: true } }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('no existe')
    })

    it('should prevent cross-business permission updates', async () => {
      // Create user in different business
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

      const otherUser = createTestUser({
        email: 'other@test.com',
      })

      await db.insert(schema.businesses).values(otherBusiness)
      await db.insert(schema.users).values(otherUser)
      await db.insert(schema.businessUsers).values({
        id: 'bu-other',
        userId: otherUser.id,
        businessId: otherBusiness.id,
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Try to update other user's permissions from business1
      const result = await updateUserPermissions(
        otherUser.id,
        otherBusiness.id, // Different business
        { clients: { canView: true, canCreate: true, canEdit: true, canDelete: true } }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('no existe')
    })
  })

  describe('deactivateUser', () => {
    let targetUserId: string

    beforeEach(async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      // Create target user
      const targetUser = createTestUser({
        email: 'deactivate@test.com',
      })
      await db.insert(schema.users).values(targetUser)
      
      // Create business relationship
      await db.insert(schema.businessUsers).values({
        id: 'bu-deactivate',
        userId: targetUser.id,
        businessId: testBusinesses.business1.id,
        role: 'accountant',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      targetUserId = targetUser.id
    })

    it('should deactivate user successfully', async () => {
      const result = await deactivateUser(targetUserId, testBusinesses.business1.id)

      expect(result.success).toBe(true)

      // Verify user was deactivated
      const businessUser = await db
        .select()
        .from(schema.businessUsers)
        .where(
          schema.businessUsers.userId.eq(targetUserId).and(
            schema.businessUsers.businessId.eq(testBusinesses.business1.id)
          )
        )

      expect(businessUser[0].isActive).toBe(false)
    })

    it('should fail without admin permissions', async () => {
      // Mock user without admin role
      mockAuthenticatedUser(testUsers.user.id, testBusinesses.business1.id)
      
      await db.insert(schema.businessUsers).values({
        id: 'bu-non-admin-3',
        userId: testUsers.user.id,
        businessId: testBusinesses.business1.id,
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await deactivateUser(targetUserId, testBusinesses.business1.id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('permisos de administrador')
    })

    it('should prevent deactivating non-existent user', async () => {
      const result = await deactivateUser('non-existent-user', testBusinesses.business1.id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('no existe')
    })

    it('should prevent admin from deactivating themselves', async () => {
      const result = await deactivateUser(testUsers.admin.id, testBusinesses.business1.id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('no puedes desactivarte')
    })

    it('should prevent deactivating last admin', async () => {
      // Make the target user an admin
      await db
        .update(schema.businessUsers)
        .set({ role: 'admin' })
        .where(
          schema.businessUsers.userId.eq(targetUserId).and(
            schema.businessUsers.businessId.eq(testBusinesses.business1.id)
          )
        )

      const result = await deactivateUser(targetUserId, testBusinesses.business1.id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('último administrador')
    })

    it('should allow deactivating admin when other admins exist', async () => {
      // Create another admin user
      const anotherAdmin = createTestUser({
        email: 'admin2@test.com',
      })
      await db.insert(schema.users).values(anotherAdmin)
      await db.insert(schema.businessUsers).values({
        id: 'bu-admin2',
        userId: anotherAdmin.id,
        businessId: testBusinesses.business1.id,
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Make the target user an admin too
      await db
        .update(schema.businessUsers)
        .set({ role: 'admin' })
        .where(
          schema.businessUsers.userId.eq(targetUserId).and(
            schema.businessUsers.businessId.eq(testBusinesses.business1.id)
          )
        )

      const result = await deactivateUser(targetUserId, testBusinesses.business1.id)

      expect(result.success).toBe(true)
    })
  })

  describe('Business Isolation in User Management', () => {
    it('should enforce strict business isolation in user operations', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const userData = {
        name: 'Usuario Aislado',
        email: 'aislado@test.com',
        password: 'password123',
        businessId: testBusinesses.business1.id,
        role: 'accountant' as const,
        permissions: {
          clients: {
            canView: true,
            canCreate: false,
            canEdit: false,
            canDelete: false,
          },
        },
      }

      const result = await registerUser(userData)
      expect(result.success).toBe(true)

      // Verify user was created in correct business
      const businessUser = await db
        .select()
        .from(schema.businessUsers)
        .where(
          schema.businessUsers.userId.eq(result.userId).and(
            schema.businessUsers.businessId.eq(testBusinesses.business1.id)
          )
        )

      expect(businessUser).toHaveLength(1)
      expect(businessUser[0].businessId).toBe(testBusinesses.business1.id)

      // Verify permissions are scoped to correct business
      const permissions = await db
        .select()
        .from(schema.userPermissions)
        .where(
          schema.userPermissions.userId.eq(result.userId).and(
            schema.userPermissions.businessId.eq(testBusinesses.business1.id)
          )
        )

      expect(permissions).toHaveLength(1)
      expect(permissions[0].businessId).toBe(testBusinesses.business1.id)
    })
  })
})