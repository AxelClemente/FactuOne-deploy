import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '@/app/db/schema'
import path from 'path'

let testDb: ReturnType<typeof drizzle> | null = null
let sqliteDb: Database.Database | null = null

/**
 * Create tables directly from schema for testing
 */
function createTables(db: Database.Database) {
  // Create tables in the correct order (respecting foreign key dependencies)
  
  // Core tables first
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      is_deleted BOOLEAN DEFAULT false,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nif TEXT NOT NULL,
      fiscal_address TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      owner_id TEXT,
      is_deleted BOOLEAN DEFAULT false,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)
  
  // Junction tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_users (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'accountant', 'user')),
      is_active BOOLEAN DEFAULT true,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    );
  `)
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_permissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      module TEXT NOT NULL,
      can_view BOOLEAN DEFAULT false,
      can_create BOOLEAN DEFAULT false,
      can_edit BOOLEAN DEFAULT false,
      can_delete BOOLEAN DEFAULT false,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    );
  `)
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_module_exclusions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      module TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    );
  `)
  
  // Business-related tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      businessId TEXT NOT NULL,
      name TEXT NOT NULL,
      nif TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      postalCode TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      isDeleted BOOLEAN DEFAULT false,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (businessId) REFERENCES businesses(id)
    );
  `)
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      businessId TEXT NOT NULL,
      name TEXT NOT NULL,
      nif TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT,
      postalCode TEXT,
      country TEXT,
      phone TEXT,
      email TEXT,
      isDeleted BOOLEAN DEFAULT false,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (businessId) REFERENCES businesses(id)
    );
  `)
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      businessId TEXT NOT NULL,
      clientId TEXT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'won', 'lost')),
      contractUrl TEXT,
      isDeleted BOOLEAN DEFAULT false,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (businessId) REFERENCES businesses(id),
      FOREIGN KEY (clientId) REFERENCES clients(id)
    );
  `)
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      businessId TEXT NOT NULL,
      clientId TEXT NOT NULL,
      projectId TEXT,
      number TEXT NOT NULL,
      date TEXT NOT NULL,
      dueDate TEXT,
      status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
      amount REAL NOT NULL,
      taxAmount REAL NOT NULL,
      total REAL NOT NULL,
      sentAt TEXT,
      paidAt TEXT,
      isDeleted BOOLEAN DEFAULT false,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (businessId) REFERENCES businesses(id),
      FOREIGN KEY (clientId) REFERENCES clients(id),
      FOREIGN KEY (projectId) REFERENCES projects(id)
    );
  `)
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS received_invoices (
      id TEXT PRIMARY KEY,
      businessId TEXT NOT NULL,
      providerId TEXT NOT NULL,
      projectId TEXT,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      taxAmount REAL DEFAULT 0,
      total REAL NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'recorded', 'paid', 'rejected')),
      category TEXT,
      number TEXT,
      documentUrl TEXT,
      paymentMethod TEXT,
      bankId TEXT,
      bizumHolder TEXT,
      bizumNumber TEXT,
      isDeleted BOOLEAN DEFAULT false,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (businessId) REFERENCES businesses(id),
      FOREIGN KEY (providerId) REFERENCES providers(id),
      FOREIGN KEY (projectId) REFERENCES projects(id)
    );
  `)
}

/**
 * Get test database connection
 */
export function getTestDb() {
  if (!testDb) {
    // Create in-memory SQLite database for each test
    sqliteDb = new Database(':memory:')
    testDb = drizzle(sqliteDb, { schema })
    
    // Create tables directly from schema
    createTables(sqliteDb)
  }
  
  return testDb
}

/**
 * Clean all tables in test database
 */
export async function cleanTestDb() {
  if (!testDb) return
  
  try {
    // Disable foreign key constraints temporarily
    sqliteDb?.pragma('foreign_keys = OFF')
    
    // Get all table names
    const tables = sqliteDb?.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all() as { name: string }[]
    
    // Delete all data from each table
    for (const table of tables || []) {
      sqliteDb?.prepare(`DELETE FROM ${table.name}`).run()
    }
    
    // Re-enable foreign key constraints
    sqliteDb?.pragma('foreign_keys = ON')
    
  } catch (error) {
    console.error('Error cleaning test database:', error)
  }
}

/**
 * Close test database connection
 */
export function closeTestDb() {
  if (sqliteDb) {
    sqliteDb.close()
    sqliteDb = null
    testDb = null
  }
}

/**
 * Setup test database with clean state
 */
export async function setupTestDb() {
  await cleanTestDb()
  return getTestDb()
}

/**
 * Mock the main db function to use test database
 */
export function mockDbForTesting() {
  jest.mock('@/lib/db', () => ({
    getDb: jest.fn().mockResolvedValue(getTestDb()),
  }))
}