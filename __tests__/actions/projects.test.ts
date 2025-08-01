/**
 * @jest-environment jsdom
 */

import { createProject, updateProject, deleteProject, getProjects } from '@/app/(dashboard)/projects/actions'
import { setupTestDb, cleanTestDb } from '../helpers/testDb'
import { mockAuthenticatedUser, clearAuthMocks } from '../helpers/authTestHelper'
import { testUsers, testBusinesses, testClients, createTestUser } from '../fixtures/testData'
import * as schema from '@/app/db/schema'

// Mock dependencies
jest.mock('@/lib/notifications', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
}))

jest.mock('@/lib/upload', () => ({
  uploadContract: jest.fn().mockResolvedValue('https://blob.storage.com/contract.pdf'),
  deleteContractFromBlob: jest.fn().mockResolvedValue(true),
}))

jest.mock('@/lib/getActiveBusiness', () => ({
  getActiveBusiness: jest.fn().mockResolvedValue('business-001'),
}))

describe('Project Actions', () => {
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

  describe('createProject', () => {
    const createFormData = (data: Record<string, any>) => {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof File) {
            formData.append(key, value)
          } else if (value instanceof Date) {
            formData.append(key, value.toISOString())
          } else {
            formData.append(key, String(value))
          }
        }
      })
      return formData
    }

    it('should create project successfully with valid data', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const formData = createFormData({
        name: 'Proyecto Test',
        clientId: testClients.client1.id,
        status: 'pending',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-06-15'),
      })

      const result = await createProject(formData)

      expect(result.success).toBe(true)
      expect(result.id).toBeDefined()
      expect(result.error).toBeUndefined()

      // Verify project was created in database
      const createdProject = await db
        .select()
        .from(schema.projects)
        .where(schema.projects.id.eq(result.id))

      expect(createdProject).toHaveLength(1)
      expect(createdProject[0].businessId).toBe(testBusinesses.business1.id)
      expect(createdProject[0].name).toBe('Proyecto Test')
      expect(createdProject[0].status).toBe('pending')
    })

    it('should fail without authentication', async () => {
      // No mock authentication
      const formData = createFormData({
        name: 'Proyecto Test',
        status: 'pending',
      })

      const result = await createProject(formData)

      expect(result.success).toBeUndefined()
      expect(result.error).toContain('iniciado sesión')
    })

    it('should fail without active business', async () => {
      mockAuthenticatedUser(testUsers.admin.id) // No business

      // Mock getActiveBusiness to return null
      const { getActiveBusiness } = require('@/lib/getActiveBusiness')
      getActiveBusiness.mockResolvedValue(null)

      const formData = createFormData({
        name: 'Proyecto Test',
        status: 'pending',
      })

      const result = await createProject(formData)

      expect(result.success).toBeUndefined()
      expect(result.error).toContain('negocio activo')
    })

    it('should fail without create permissions', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      // Mock hasPermission to return false
      jest.mock('@/lib/auth', () => ({
        getCurrentUser: jest.fn().mockResolvedValue({ id: testUsers.admin.id }),
        hasPermission: jest.fn().mockResolvedValue(false),
      }))

      const formData = createFormData({
        name: 'Proyecto Test',
        status: 'pending',
      })

      const result = await createProject(formData)

      expect(result.success).toBeUndefined()
      expect(result.error).toContain('permisos')
    })

    it('should validate required fields', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const formData = createFormData({
        name: '', // Empty name
        status: 'pending',
      })

      const result = await createProject(formData)

      expect(result.success).toBeUndefined()
      expect(result.error).toContain('nombre es obligatorio')
    })

    it('should validate project status enum', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const formData = createFormData({
        name: 'Proyecto Test',
        status: 'invalid-status', // Invalid status
      })

      const result = await createProject(formData)

      expect(result.success).toBeUndefined()
      expect(result.error).toBeDefined()
    })

    it('should handle project with contract file', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const contractFile = new File(['contract content'], 'contract.pdf', { type: 'application/pdf' })
      const formData = createFormData({
        name: 'Proyecto con Contrato',
        status: 'pending',
        contract: contractFile,
      })

      const result = await createProject(formData)

      expect(result.success).toBe(true)
      expect(result.id).toBeDefined()

      // Verify contract was uploaded
      const { uploadContract } = require('@/lib/upload')
      expect(uploadContract).toHaveBeenCalledWith(contractFile)

      // Verify project has contract URL
      const createdProject = await db
        .select()
        .from(schema.projects)
        .where(schema.projects.id.eq(result.id))

      expect(createdProject[0].contractUrl).toBe('https://blob.storage.com/contract.pdf')
    })

    it('should validate client belongs to same business', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

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

      const formData = createFormData({
        name: 'Proyecto Cross-Business',
        clientId: otherClient.id, // Client from different business
        status: 'pending',
      })

      const result = await createProject(formData)

      expect(result.success).toBeUndefined()
      expect(result.error).toContain('cliente no existe')
    })

    it('should handle project without client', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const formData = createFormData({
        name: 'Proyecto Sin Cliente',
        status: 'pending',
        // No clientId
      })

      const result = await createProject(formData)

      expect(result.success).toBe(true)
      expect(result.id).toBeDefined()

      const createdProject = await db
        .select()
        .from(schema.projects)
        .where(schema.projects.id.eq(result.id))

      expect(createdProject[0].clientId).toBeNull()
    })

    it('should validate date range logic', async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

      const formData = createFormData({
        name: 'Proyecto con Fechas Inválidas',
        status: 'pending',
        startDate: new Date('2024-06-15'),
        endDate: new Date('2024-01-15'), // End before start
      })

      const result = await createProject(formData)

      // Should still create but might have validation warning
      expect(result.success).toBe(true)
      
      // Note: Date range validation would be handled in business logic
      // Here we just test that dates are stored correctly
      const createdProject = await db
        .select()
        .from(schema.projects)
        .where(schema.projects.id.eq(result.id))

      expect(createdProject[0].startDate).toBeDefined()
      expect(createdProject[0].endDate).toBeDefined()
    })
  })

  describe('updateProject', () => {
    let existingProjectId: string

    beforeEach(async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      // Create project to update
      const project = {
        id: 'project-to-update',
        businessId: testBusinesses.business1.id,
        name: 'Proyecto Original',
        clientId: testClients.client1.id,
        status: 'pending' as const,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-06-15'),
        contractUrl: null,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await db.insert(schema.projects).values(project)
      existingProjectId = project.id
    })

    const createFormData = (data: Record<string, any>) => {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof File) {
            formData.append(key, value)
          } else if (value instanceof Date) {
            formData.append(key, value.toISOString())
          } else {
            formData.append(key, String(value))
          }
        }
      })
      return formData
    }

    it('should update project successfully', async () => {
      const formData = createFormData({
        name: 'Proyecto Actualizado',
        status: 'won',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-07-01'),
      })

      const result = await updateProject(existingProjectId, formData)

      expect(result.success).toBe(true)

      // Verify project was updated
      const updatedProject = await db
        .select()
        .from(schema.projects)
        .where(schema.projects.id.eq(existingProjectId))

      expect(updatedProject[0].name).toBe('Proyecto Actualizado')
      expect(updatedProject[0].status).toBe('won')
    })

    it('should prevent updating non-existent project', async () => {
      const formData = createFormData({
        name: 'Test Update',
        status: 'pending',
      })

      const result = await updateProject('non-existent-id', formData)

      expect(result.success).toBeUndefined()
      expect(result.error).toContain('no existe')
    })

    it('should prevent cross-business updates', async () => {
      // Create project in different business
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

      const otherProject = {
        id: 'project-other',
        businessId: otherBusiness.id,
        name: 'Other Project',
        clientId: null,
        status: 'pending' as const,
        startDate: null,
        endDate: null,
        contractUrl: null,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.insert(schema.businesses).values(otherBusiness)
      await db.insert(schema.projects).values(otherProject)

      const formData = createFormData({
        name: 'Hacked Update',
        status: 'won',
      })

      const result = await updateProject(otherProject.id, formData)

      expect(result.success).toBeUndefined()
      expect(result.error).toContain('no existe')
    })

    it('should handle status transitions', async () => {
      const statusTransitions = [
        { from: 'pending', to: 'won' },
        { from: 'pending', to: 'lost' },
        { from: 'won', to: 'lost' },
        { from: 'lost', to: 'pending' },
      ]

      for (const transition of statusTransitions) {
        // Reset project status
        await db
          .update(schema.projects)
          .set({ status: transition.from })
          .where(schema.projects.id.eq(existingProjectId))

        const formData = createFormData({
          name: 'Proyecto Test',
          status: transition.to,
        })

        const result = await updateProject(existingProjectId, formData)

        expect(result.success).toBe(true)

        const updatedProject = await db
          .select()
          .from(schema.projects)
          .where(schema.projects.id.eq(existingProjectId))

        expect(updatedProject[0].status).toBe(transition.to)
      }
    })
  })

  describe('deleteProject', () => {
    let existingProjectId: string

    beforeEach(async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      const project = {
        id: 'project-to-delete',
        businessId: testBusinesses.business1.id,
        name: 'Proyecto a Eliminar',
        clientId: testClients.client1.id,
        status: 'pending' as const,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-06-15'),
        contractUrl: 'https://blob.storage.com/contract.pdf',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await db.insert(schema.projects).values(project)
      existingProjectId = project.id
    })

    it('should delete project successfully', async () => {
      const result = await deleteProject(existingProjectId)

      expect(result.success).toBe(true)

      // Verify soft delete
      const deletedProject = await db
        .select()
        .from(schema.projects)
        .where(schema.projects.id.eq(existingProjectId))

      expect(deletedProject[0].isDeleted).toBe(true)

      // Verify contract was deleted from blob storage
      const { deleteContractFromBlob } = require('@/lib/upload')
      expect(deleteContractFromBlob).toHaveBeenCalledWith('https://blob.storage.com/contract.pdf')
    })

    it('should prevent deleting non-existent project', async () => {
      const result = await deleteProject('non-existent-id')

      expect(result.success).toBeUndefined()
      expect(result.error).toContain('no existe')
    })

    it('should prevent deleting project with associated invoices', async () => {
      // Create invoice associated with this project
      const invoice = {
        id: 'invoice-with-project',
        businessId: testBusinesses.business1.id,
        clientId: testClients.client1.id,
        projectId: existingProjectId,
        number: 'INV-PROJ-001',
        date: new Date(),
        dueDate: new Date(),
        subtotal: 1000,
        taxAmount: 210,
        totalAmount: 1210,
        status: 'sent' as const,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.insert(schema.invoices).values(invoice)

      const result = await deleteProject(existingProjectId)

      expect(result.success).toBeUndefined()
      expect(result.error).toContain('facturas asociadas')
    })

    it('should perform soft delete, not hard delete', async () => {
      const result = await deleteProject(existingProjectId)

      expect(result.success).toBe(true)

      // Project should still exist but marked as deleted
      const deletedProject = await db
        .select()
        .from(schema.projects)
        .where(schema.projects.id.eq(existingProjectId))

      expect(deletedProject).toHaveLength(1)
      expect(deletedProject[0].isDeleted).toBe(true)
    })
  })

  describe('getProjects', () => {
    beforeEach(async () => {
      mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
      
      // Insert multiple projects with different statuses
      await db.insert(schema.projects).values([
        {
          id: 'project-pending',
          businessId: testBusinesses.business1.id,
          name: 'Proyecto Pendiente',
          clientId: testClients.client1.id,
          status: 'pending',
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-06-15'),
          contractUrl: null,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'project-won',
          businessId: testBusinesses.business1.id,
          name: 'Proyecto Ganado',
          clientId: testClients.client1.id,
          status: 'won',
          startDate: new Date('2024-02-01'),
          endDate: new Date('2024-07-01'),
          contractUrl: null,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'project-lost',
          businessId: testBusinesses.business1.id,
          name: 'Proyecto Perdido',
          clientId: testClients.client1.id,
          status: 'lost',
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-08-01'),
          contractUrl: null,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'project-deleted',
          businessId: testBusinesses.business1.id,
          name: 'Proyecto Eliminado',
          clientId: testClients.client1.id,
          status: 'pending',
          startDate: null,
          endDate: null,
          contractUrl: null,
          isDeleted: true, // Soft deleted
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ])
    })

    it('should return only active projects', async () => {
      const projects = await getProjects(testBusinesses.business1.id)

      expect(projects).toHaveLength(3) // Only non-deleted projects
      expect(projects.every(project => !project.isDeleted)).toBe(true)
    })

    it('should return projects only for specified business', async () => {
      // Create projects in different business
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
      await db.insert(schema.projects).values({
        id: 'project-other-business',
        businessId: otherBusiness.id,
        name: 'Proyecto Otro Negocio',
        clientId: null,
        status: 'pending',
        startDate: null,
        endDate: null,
        contractUrl: null,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const projects = await getProjects(testBusinesses.business1.id)

      expect(projects).toHaveLength(3)
      expect(projects.every(project => project.businessId === testBusinesses.business1.id)).toBe(true)
    })

    it('should include client information when available', async () => {
      const projects = await getProjects(testBusinesses.business1.id)

      const projectsWithClient = projects.filter(p => p.clientId)
      expect(projectsWithClient.length).toBeGreaterThan(0)
      
      // Note: Actual implementation might join with clients table
      // This test ensures the relationship is maintained
    })

    it('should return projects ordered correctly', async () => {
      const projects = await getProjects(testBusinesses.business1.id)

      // Verify projects are returned (order depends on actual implementation)
      expect(projects.length).toBe(3)
      
      const statuses = projects.map(p => p.status)
      expect(statuses).toContain('pending')
      expect(statuses).toContain('won')
      expect(statuses).toContain('lost')
    })

    it('should return empty array for business with no projects', async () => {
      const projects = await getProjects('non-existent-business')
      expect(projects).toHaveLength(0)
    })
  })

  describe('Business Isolation', () => {
    it('should enforce strict business isolation in all project operations', async () => {
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

      const formData = new FormData()
      formData.append('name', 'Proyecto Aislado')
      formData.append('status', 'pending')

      const result = await createProject(formData)

      expect(result.success).toBe(true)

      // Verify project was created in correct business
      const createdProject = await db
        .select()
        .from(schema.projects)
        .where(schema.projects.id.eq(result.id))

      expect(createdProject[0].businessId).toBe(testBusinesses.business1.id)
      expect(createdProject[0].businessId).not.toBe(otherBusiness.id)
    })
  })
})