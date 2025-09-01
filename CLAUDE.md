# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev          # Start development server on http://localhost:3000 (includes SSL bypass)
npm run build        # Build for production (includes Puppeteer Chrome install and SSL bypass)
npm run start        # Start production server (includes SSL bypass)
npm run lint         # Run ESLint
```

### Database
```bash
npx drizzle-kit generate   # Generate migrations from schema changes
npx drizzle-kit migrate    # Apply migrations to database
npx drizzle-kit studio     # Open Drizzle Studio for database exploration

# Manual migration scripts (used during MySQL → PostgreSQL migration)
node migrate.js           # Apply Drizzle migrations manually
node apply-migrations.js  # Apply SQL migrations directly
node migrate-data.js      # Migrate data from MySQL to PostgreSQL
```

### Testing Database Connection
```bash
node test-db.js     # Test database connectivity
```

### VERI*FACTU Certificate Management
```bash
# Migrate database for certificate fields (run once after updating code)
node scripts/migrate-certificate-fields.js

# Monitor certificates manually
node scripts/certificate-monitor-cron.js

# Monitor certificates via API (requires server running)
node scripts/certificate-monitor-cron.js --api

# Set up automatic certificate monitoring (add to crontab)
# Check certificates every 6 hours:
# 0 */6 * * * /usr/bin/node /path/to/app/scripts/certificate-monitor-cron.js
# Check certificates daily at 09:00:
# 0 9 * * * /usr/bin/node /path/to/app/scripts/certificate-monitor-cron.js
```

### Deployment
```bash
# Self-hosted deployment (see DEPLOY.md for full process)
chmod +x scripts/setup-server.sh && ./scripts/setup-server.sh
chmod +x scripts/setup-postgresql.sh && ./scripts/setup-postgresql.sh  # Updated from MySQL
chmod +x scripts/run-migrations.sh && ./scripts/run-migrations.sh
chmod +x scripts/deploy.sh && ./scripts/deploy.sh
```

## Architecture

### Technology Stack
- **Frontend**: Next.js 15 with React 19, TypeScript, App Router
- **Database**: PostgreSQL with Drizzle ORM, UUID primary keys
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
// Database URL format (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

// Production connection string:
DATABASE_URL=postgresql://zynvio_app_0:password@vps-eac4c4e7.vps.ovh.net:5432/zynvio_app_0?sslmode=require
```

### SSL Configuration
The PostgreSQL server uses self-signed SSL certificates. The application is configured to handle this:

- **package.json scripts** include `NODE_TLS_REJECT_UNAUTHORIZED=0`
- **lib/db.ts** has SSL configuration with `rejectUnauthorized: false`
- **Required for both development and production**

### Environment Variables
Required for development:
```env
DATABASE_URL=postgresql://...
NODE_ENV=development
NEXTAUTH_SECRET=your-dev-secret
APP_URL=http://localhost:3000
```

## Deployment

### Production Environment
- **Self-hosted**: AlmaLinux server with PM2, Nginx, PostgreSQL (see DEPLOY.md)
- **Vercel**: Cloud deployment (see vercel-env.example)
- **Database**: External PostgreSQL server (vps-eac4c4e7.vps.ovh.net in production)

### Build Process
```bash
npm run build
# Includes automatic Puppeteer Chrome installation for PDF generation
```

### Environment Configuration
Production requires:
- `DATABASE_URL` pointing to production PostgreSQL with SSL
- `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` set to production domain
- `NODE_ENV=production` (disables dev auth bypasses)
- SSL bypass handled automatically by package.json scripts

## Testing

### Manual Testing
- Use password "password123" in development mode
- Test multi-business scenarios by switching active business
- Verify tenant isolation by checking different business contexts

### Database Testing
```bash
node test-db.js  # Verify database connectivity and basic queries
```

## Migration History

### MySQL to PostgreSQL Migration (Completed)
**Date**: September 2025  
**Scope**: Complete database migration from MySQL to PostgreSQL

#### Migration Process:
1. **Schema Migration**: Converted MySQL schema to PostgreSQL using Drizzle ORM
   - Changed `mysqlTable` to `pgTable`
   - Updated data types: `datetime` → `timestamp`, `mysqlEnum` → `text`, `int` → `integer`
   - Modified timestamp defaults from `CURRENT_TIMESTAMP ON UPDATE` to `$onUpdate(() => new Date())`

2. **Connection Layer**: Updated database connection from `mysql2` to `pg`
   - Modified `lib/db.ts` to use PostgreSQL Pool connection
   - Updated `drizzle.config.ts` dialect from "mysql" to "postgresql"

3. **Data Migration**: Migrated 502 records across 23 tables
   - Preserved foreign key relationships
   - Maintained UUID primary keys
   - Converted MySQL boolean (0/1) to PostgreSQL boolean (true/false)

4. **SSL Configuration**: Resolved self-signed certificate issues
   - Added `NODE_TLS_REJECT_UNAUTHORIZED=0` to package.json scripts
   - Configured SSL bypass in connection pool
   - Updated Next.js webpack config to handle PostgreSQL dependencies

5. **Middleware Update**: Fixed Edge Runtime compatibility
   - Removed database imports from middleware.ts
   - Implemented Edge Runtime-compatible authentication checks

#### Post-Migration Status:
- ✅ All 502 records successfully migrated
- ✅ Schema conversion complete
- ✅ SSL connectivity resolved
- ✅ Build and development working
- ✅ Ready for Vercel deployment

## Common Issues

### Development Authentication
If authentication issues occur in development, ensure `NODE_ENV !== "production"` to enable bypasses.

### PostgreSQL SSL Certificate Issues
If you encounter `DEPTH_ZERO_SELF_SIGNED_CERT` errors:
- Ensure `NODE_TLS_REJECT_UNAUTHORIZED=0` is set in package.json scripts
- Verify SSL configuration in `lib/db.ts` has `rejectUnauthorized: false`
- Check that DATABASE_URL includes `?sslmode=require`

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