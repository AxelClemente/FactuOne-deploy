import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export default async function globalSetup() {
  console.log('🚀 Setting up test environment...')
  
  try {
    // Set test environment
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'file:./test.db'
    
    // Clean any existing test database
    const testDbPath = path.join(process.cwd(), 'test.db')
    try {
      await execAsync(`rm -f ${testDbPath}`)
    } catch (error) {
      // File might not exist, that's ok
    }
    
    // Generate database schema for testing
    console.log('📊 Generating test database schema...')
    await execAsync('npx drizzle-kit generate', {
      env: {
        ...process.env,
        DATABASE_URL: 'file:./test.db'
      }
    })
    
    console.log('✅ Test environment ready!')
    
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error)
    throw error
  }
}