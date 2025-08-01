const nextJest = require('next/jest')

/** @type {import('jest').Config} */
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  
  // Setup files to run before each test
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Test paths and patterns
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  
  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
  },
  
  // Files to ignore
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    // Include critical files
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    // Exclude specific patterns
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/*.config.{js,ts}',
    '!**/layout.tsx',
    '!**/loading.tsx',
    '!**/error.tsx',
    '!**/not-found.tsx',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70, 
      lines: 70,
      statements: 70,
    },
    // Higher thresholds for critical financial logic
    './lib/verifactu-*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './lib/auth.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './app/**/actions.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Transform configuration (Next.js handles this)
  // transform: {
  //   '^.+\\.(ts|tsx)$': ['ts-jest', {
  //     tsconfig: 'tsconfig.json',
  //   }],
  // },
  
  // Environment variables for testing
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  
  // Global setup and teardown (disabled for now)
  // globalSetup: '<rootDir>/__tests__/setup/globalSetup.ts',
  // globalTeardown: '<rootDir>/__tests__/setup/globalTeardown.ts',
  
  // Verbose output for debugging
  verbose: true,
  
  // Maximum number of workers
  maxWorkers: '50%',
  
  // Timeout configuration
  testTimeout: 30000, // 30 seconds for integration tests
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(config)