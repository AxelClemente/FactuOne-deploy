/**
 * Test fixtures and sample data for unit testing
 */

export const testUsers = {
  admin: {
    id: 'user-admin-001',
    email: 'admin@test.com',
    name: 'Test Admin',
    passwordHash: '$2b$10$testhashedpassword', // bcrypt hash of 'password123'
    isDeleted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  accountant: {
    id: 'user-accountant-001',
    email: 'accountant@test.com', 
    name: 'Test Accountant',
    passwordHash: '$2b$10$testhashedpassword',
    isDeleted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  user: {
    id: 'user-basic-001',
    email: 'user@test.com',
    name: 'Test User',
    passwordHash: '$2b$10$testhashedpassword',
    isDeleted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
}

export const testBusinesses = {
  business1: {
    id: 'business-001',
    name: 'Test Business 1',
    nif: 'B12345678',
    fiscalAddress: 'Test Address 1',
    phone: '123456789',
    email: 'business1@test.com',
    ownerId: null,
    isDeleted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  business2: {
    id: 'business-002',
    name: 'Test Business 2',
    nif: 'B87654321',
    fiscalAddress: 'Test Address 2',
    phone: '987654321',
    email: 'business2@test.com',
    ownerId: null,
    isDeleted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
}

export const testBusinessUsers = {
  adminBusiness1: {
    id: 'bu-001',
    userId: testUsers.admin.id,
    businessId: testBusinesses.business1.id,
    role: 'admin' as const,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  accountantBusiness1: {
    id: 'bu-002',
    userId: testUsers.accountant.id,
    businessId: testBusinesses.business1.id,
    role: 'accountant' as const,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  userBusiness2: {
    id: 'bu-003',
    userId: testUsers.user.id,
    businessId: testBusinesses.business2.id,
    role: 'user' as const,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
}

export const testClients = {
  client1: {
    id: 'client-001',
    businessId: testBusinesses.business1.id,
    name: 'Test Client 1',
    nif: 'C12345678',
    address: 'Client Address 1',
    city: 'Client City',
    postalCode: '11111',
    phone: '111111111',
    email: 'client1@test.com',
    isDeleted: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
  client2: {
    id: 'client-002',
    businessId: testBusinesses.business2.id,
    name: 'Test Client 2',
    nif: 'C87654321',
    address: 'Client Address 2',
    city: 'Client City 2',
    postalCode: '22222',
    phone: '222222222',
    email: 'client2@test.com',
    isDeleted: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
}

export const testInvoices = {
  invoice1: {
    id: 'invoice-001',
    businessId: testBusinesses.business1.id,
    clientId: testClients.client1.id,
    number: 'INV-001',
    date: new Date('2024-01-15T00:00:00Z'),
    dueDate: new Date('2024-02-15T00:00:00Z'),
    subtotal: 1000.00,
    taxAmount: 210.00,
    totalAmount: 1210.00,
    status: 'sent' as const,
    isDeleted: false,
    createdAt: new Date('2024-01-15T00:00:00Z'),
    updatedAt: new Date('2024-01-15T00:00:00Z'),
  },
  invoice2: {
    id: 'invoice-002',
    businessId: testBusinesses.business2.id,
    clientId: testClients.client2.id,
    number: 'INV-002',
    date: new Date('2024-01-20T00:00:00Z'),
    dueDate: new Date('2024-02-20T00:00:00Z'),
    subtotal: 500.00,
    taxAmount: 105.00,
    totalAmount: 605.00,
    status: 'draft' as const,
    isDeleted: false,
    createdAt: new Date('2024-01-20T00:00:00Z'),
    updatedAt: new Date('2024-01-20T00:00:00Z'),
  },
}

export const testInvoiceLines = {
  line1: {
    id: 'line-001',
    invoiceId: testInvoices.invoice1.id,
    description: 'Test Service 1',
    quantity: 10,
    unitPrice: 100.00,
    taxRate: 21.0,
    amount: 1000.00,
    createdAt: new Date('2024-01-15T00:00:00Z'),
    updatedAt: new Date('2024-01-15T00:00:00Z'),
  },
  line2: {
    id: 'line-002',
    invoiceId: testInvoices.invoice2.id,
    description: 'Test Service 2',
    quantity: 5,
    unitPrice: 100.00,
    taxRate: 21.0,
    amount: 500.00,
    createdAt: new Date('2024-01-20T00:00:00Z'),
    updatedAt: new Date('2024-01-20T00:00:00Z'),
  },
}

export const testUserPermissions = {
  adminPermissions: {
    id: 'perm-001',
    userId: testUsers.admin.id,
    businessId: testBusinesses.business1.id,
    module: 'invoices' as const,
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
  limitedPermissions: {
    id: 'perm-002',
    userId: testUsers.user.id,
    businessId: testBusinesses.business2.id,
    module: 'invoices' as const,
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
}

export const testVerifactuConfig = {
  config1: {
    id: 'verifactu-001',
    businessId: testBusinesses.business1.id,
    enabled: true,
    mode: 'verifactu' as const,
    environment: 'testing' as const,
    certificatePath: 'https://test-blob.com/cert.p12',
    certificatePasswordEncrypted: 'test-password',
    lastSequenceNumber: 0,
    flowControlSeconds: 60,
    maxRecordsPerSubmission: 100,
    autoSubmit: true,
    includeInPdf: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
}

/**
 * Helper to create test data with random IDs
 */
export function createTestUser(overrides: Partial<typeof testUsers.admin> = {}) {
  return {
    ...testUsers.admin,
    id: `user-${Math.random().toString(36).substring(2)}`,
    email: `test-${Math.random().toString(36).substring(2)}@test.com`,
    ...overrides,
  }
}

export function createTestBusiness(overrides: Partial<typeof testBusinesses.business1> = {}) {
  return {
    ...testBusinesses.business1,
    id: `business-${Math.random().toString(36).substring(2)}`,
    nif: `B${Math.random().toString().substring(2, 10)}`,
    ...overrides,
  }
}

export function createTestInvoice(overrides: Partial<typeof testInvoices.invoice1> = {}) {
  return {
    ...testInvoices.invoice1,
    id: `invoice-${Math.random().toString(36).substring(2)}`,
    number: `INV-${Math.random().toString().substring(2, 8)}`,
    ...overrides,
  }
}