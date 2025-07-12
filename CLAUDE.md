# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev          # Start development server on http://localhost:3000
npm run build        # Build for production (includes Puppeteer Chrome install)
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
npx drizzle-kit generate   # Generate migrations from schema changes
npx drizzle-kit migrate    # Apply migrations to database
npx drizzle-kit studio     # Open Drizzle Studio for database exploration
```

### Testing Database Connection
```bash
node test-db.js     # Test database connectivity
```

### Deployment
```bash
# Self-hosted deployment (see DEPLOY.md for full process)
chmod +x scripts/setup-server.sh && ./scripts/setup-server.sh
chmod +x scripts/setup-mysql.sh && ./scripts/setup-mysql.sh
chmod +x scripts/run-migrations.sh && ./scripts/run-migrations.sh
chmod +x scripts/deploy.sh && ./scripts/deploy.sh
```

## Architecture

### Technology Stack
- **Frontend**: Next.js 15 with React 19, TypeScript, App Router
- **Database**: MySQL with Drizzle ORM, UUID primary keys
- **UI**: shadcn/ui + Radix UI + Tailwind CSS + Lucide icons
- **Auth**: Custom authentication with bcrypt (dev mode bypasses enabled)
- **Charts**: Recharts for analytics dashboards
- **Forms**: React Hook Form + Zod validation

### Multi-Tenant Architecture
This is a **multi-tenant SaaS application** where:
- Users can belong to multiple businesses (`business_users` junction table)
- All business data is isolated by `businessId`
- Active business context is managed via business selector
- Permissions are granular per user/business/module combination

### Database Schema Key Points
- **All entities use UUID strings** (`varchar(36)`) as primary keys
- **Soft deletes** implemented via `isDeleted` boolean fields
- **Audit logging** for all business operations (`audit_logs` table)
- **User permissions** are granular per module (clients, invoices, projects, etc.)
- **Multi-tenant isolation** enforced at database query level

### Core Entities
```typescript
// Primary business entities
users -> business_users -> businesses
businesses -> clients, providers, projects, invoice_types
clients -> invoices (sent)
providers -> received_invoices
projects -> invoices (both sent/received)
invoices -> invoice_lines
automations -> automation_lines -> automation_executions
```

## Development Patterns

### Server Actions Location
All server actions are in `actions.ts` files within each route directory:
- `app/(dashboard)/clients/actions.ts`
- `app/(dashboard)/invoices/actions.ts`
- `app/(dashboard)/projects/actions.ts`
- etc.

### Authentication & Authorization
```typescript
// Check if user authenticated
await isAuthenticated()

// Get current user
const user = await getCurrentUser()

// Check granular permissions
await hasPermission(userId, businessId, "clients", "create")
```

### Business Context
```typescript
// Get active business for current user
import { getActiveBusiness } from "@/lib/getActiveBusiness"
const activeBusiness = await getActiveBusiness()
```

### Database Queries
```typescript
// Always filter by businessId for tenant isolation
const clients = await db
  .select()
  .from(schema.clients)
  .where(
    and(
      eq(schema.clients.businessId, businessId),
      eq(schema.clients.isDeleted, false)
    )
  )
```

### Component Organization
```
components/
├── ui/                 # shadcn/ui base components
├── layout/            # Navigation, sidebar, topbar
├── [feature]/         # Feature-specific components (clients/, invoices/, etc.)
└── [feature]/[component]-form.tsx  # Form components
```

## Key Business Logic

### Invoice Management
- **Sent invoices** (`invoices` table): Client billing with line items
- **Received invoices** (`received_invoices` table): Provider expenses
- **Status workflows**: draft→sent→paid→overdue for sent; pending→recorded→paid for received
- **PDF generation** using Puppeteer for official documents
- **XML export** for Spanish tax authority (AEAT) compliance

### Project Management
- Projects can be associated with both sent and received invoices
- Status tracking: won/lost/pending
- Financial metrics calculated from associated invoices

### Automation System
- **Recurring invoice generation** (`invoice_automations` table)
- Configurable frequency: daily/monthly/yearly with intervals
- Execution tracking and error handling

### User Permissions
- **Role-based**: admin/accountant/user at business level
- **Granular permissions**: per module (clients, invoices, projects, providers)
- **Actions**: view/create/edit/delete per module
- **User exclusions**: Hide specific entities from specific users

## Development Environment

### Authentication Bypass
In development mode (`NODE_ENV !== "production"`):
- Password "password123" bypasses authentication
- All authentication checks return true
- Middleware allows access to all routes

### Database Connection
```typescript
// Database URL format
DATABASE_URL=mysql://user:password@host:port/database

// Development connection string typically:
DATABASE_URL=mysql://root:password@localhost:3306/factuone_dev
```

### Environment Variables
Required for development:
```env
DATABASE_URL=mysql://...
NODE_ENV=development
NEXTAUTH_SECRET=your-dev-secret
APP_URL=http://localhost:3000
```

## Deployment

### Production Environment
- **Self-hosted**: AlmaLinux server with PM2, Nginx, MySQL (see DEPLOY.md)
- **Vercel**: Cloud deployment (see vercel-env.example)
- **Database**: External MySQL server (37.59.125.76 in production)

### Build Process
```bash
npm run build
# Includes automatic Puppeteer Chrome installation for PDF generation
```

### Environment Configuration
Production requires:
- `DATABASE_URL` pointing to production MySQL
- `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` set to production domain
- `NODE_ENV=production` (disables dev auth bypasses)

## Testing

### Manual Testing
- Use password "password123" in development mode
- Test multi-business scenarios by switching active business
- Verify tenant isolation by checking different business contexts

### Database Testing
```bash
node test-db.js  # Verify database connectivity and basic queries
```

## Common Issues

### Development Authentication
If authentication issues occur in development, ensure `NODE_ENV !== "production"` to enable bypasses.

### Database UUID Handling
All entity IDs are UUIDs as strings. Generate new UUIDs using:
```typescript
import { v4 as uuidv4 } from 'uuid'
const id = uuidv4()
```

### Multi-Business Context
Always pass `businessId` to server actions and verify business access before operations.

### Soft Deletes
Never hard delete business data. Set `isDeleted: true` and filter with `eq(table.isDeleted, false)` in queries.

## Performance Considerations

### Database Queries
- Always include `businessId` filters for tenant isolation
- Use `limit()` for large result sets
- Index on `businessId` + `isDeleted` combinations

### PDF Generation
- Puppeteer operations are resource-intensive
- Consider caching generated PDFs
- Chrome browser auto-installs during build process