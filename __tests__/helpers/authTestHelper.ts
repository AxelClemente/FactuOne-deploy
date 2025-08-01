/**
 * Authentication testing utilities
 */

// Mock authenticated user context
export function mockAuthenticatedUser(userId: string, businessId?: string) {
  // Mock getCurrentUser
  jest.mock('@/lib/auth', () => ({
    getCurrentUser: jest.fn().mockResolvedValue({
      id: userId,
      email: 'test@test.com',
      name: 'Test User',
    }),
    isAuthenticated: jest.fn().mockResolvedValue(true),
    hasPermission: jest.fn().mockResolvedValue(true),
  }))
  
  // Mock getActiveBusiness if provided
  if (businessId) {
    jest.mock('@/lib/getActiveBusiness', () => ({
      getActiveBusiness: jest.fn().mockResolvedValue(businessId),
    }))
  }
}

// Mock unauthenticated state
export function mockUnauthenticatedUser() {
  jest.mock('@/lib/auth', () => ({
    getCurrentUser: jest.fn().mockResolvedValue(null),
    isAuthenticated: jest.fn().mockResolvedValue(false),
    hasPermission: jest.fn().mockResolvedValue(false),
  }))
}

// Mock specific permissions
export function mockUserPermissions(permissions: Record<string, boolean>) {
  jest.mock('@/lib/auth', () => ({
    getCurrentUser: jest.fn().mockResolvedValue({
      id: 'test-user',
      email: 'test@test.com',
      name: 'Test User',
    }),
    isAuthenticated: jest.fn().mockResolvedValue(true),
    hasPermission: jest.fn().mockImplementation((userId, businessId, module, action) => {
      const key = `${module}-${action}`
      return Promise.resolve(permissions[key] ?? false)
    }),
  }))
}

// Clear all auth mocks
export function clearAuthMocks() {
  jest.clearAllMocks()
}