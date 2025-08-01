import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...')
  
  try {
    // Clean test database
    const testDbPath = path.join(process.cwd(), 'test.db')
    await execAsync(`rm -f ${testDbPath}`)
    
    // Clean any temporary files
    await execAsync('rm -f *.db-shm *.db-wal')
    
    console.log('✅ Test environment cleaned up!')
    
  } catch (error) {
    console.warn('⚠️ Warning during cleanup:', error)
    // Don't throw error on cleanup failure
  }
}