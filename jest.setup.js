import '@testing-library/jest-dom'

// Polyfills for Next.js/Node.js compatibility
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Web APIs for Next.js compatibility
global.Request = class MockRequest {
  constructor(input, init) {
    this.url = input
    this.method = init?.method || 'GET'
    this.headers = new Map(Object.entries(init?.headers || {}))
    this.body = init?.body
  }
}

global.Response = class MockResponse {
  constructor(body, init) {
    this.body = body
    this.status = init?.status || 200
    this.headers = new Map(Object.entries(init?.headers || {}))
  }
  
  json() {
    return Promise.resolve(JSON.parse(this.body))
  }
  
  text() {
    return Promise.resolve(this.body)
  }
}

global.Headers = class MockHeaders extends Map {
  get(key) {
    return super.get(key.toLowerCase())
  }
  
  set(key, value) {
    return super.set(key.toLowerCase(), value)
  }
  
  has(key) {
    return super.has(key.toLowerCase())
  }
}

// Mock ReadableStream
global.ReadableStream = class MockReadableStream {
  constructor() {}
}

// Global test configuration
global.console = {
  ...console,
  // Silence logs during tests (uncomment to debug)
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'file:./test.db'
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only'
process.env.APP_URL = 'http://localhost:3000'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock fetch globally
global.fetch = jest.fn()

// Mock FormData
global.FormData = jest.fn(() => ({
  append: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
}))

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2, 15),
    getRandomValues: jest.fn().mockReturnValue(new Array(16).fill(0)),
  },
})

// Mock Vercel Blob
jest.mock('@vercel/blob', () => ({
  put: jest.fn().mockResolvedValue({
    url: 'https://test-blob-url.com/test-file',
    pathname: 'test-file',
    contentType: 'application/octet-stream',
    contentDisposition: 'attachment; filename="test-file"',
  }),
  del: jest.fn().mockResolvedValue(undefined),
  head: jest.fn().mockResolvedValue({
    url: 'https://test-blob-url.com/test-file',
    pathname: 'test-file',
    contentType: 'application/octet-stream',
    contentDisposition: 'attachment; filename="test-file"',
    size: 1024,
  }),
}))

// Mock Sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}))

// Mock Puppeteer for PDF generation
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn(),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      close: jest.fn(),
    }),
    close: jest.fn(),
  }),
}))

// Increase timeout for database operations
jest.setTimeout(30000)

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})