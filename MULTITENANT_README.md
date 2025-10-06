# Multi-Tenant Carrier Management System

This document provides comprehensive information about the multi-tenant architecture implemented for the carrier management system.

## 🏗️ Architecture Overview

The system supports multiple tenants (companies) sharing the same application infrastructure while maintaining complete data isolation. Each tenant has:

- **Unique tenant ID** and subdomain
- **Isolated data** - all records are scoped to tenant
- **Subscription management** with different plans
- **Custom settings** and configurations
- **Independent user management**

## 📚 Database Models

### Core Multi-Tenant Models

#### 1. **Tenant** (`/db/Tenant.js`)
```javascript
{
  tenantId: String, // Unique identifier
  name: String,     // Company name
  subdomain: String, // Unique subdomain
  status: String,    // active, inactive, trial, suspended
  subscription: {
    plan: String,    // Subscription plan slug
    status: String,  // active, trial, cancelled, suspended
    startDate: Date,
    endDate: Date,
    billingCycle: String // monthly, yearly
  },
  settings: {
    maxUsers: Number,
    maxOrders: Number,
    features: [String], // Array of enabled features
    customizations: Object
  },
  billing: {
    balance: Number,
    nextBillingDate: Date,
    paymentMethod: String,
    billingAddress: Object
  }
}
```

#### 2. **SuperAdmin** (`/db/SuperAdmin.js`)
```javascript
{
  userId: ObjectId,     // Reference to User
  email: String,        // Super admin email
  permissions: [String], // Array of permissions
  isActive: Boolean,
  createdBy: ObjectId,
  lastLogin: Date
}
```

#### 3. **SubscriptionPlan** (`/db/SubscriptionPlan.js`)
```javascript
{
  name: String,      // Plan name (e.g., "Starter", "Professional")
  slug: String,      // Unique slug (e.g., "starter", "pro")
  price: Number,     // Monthly price
  yearlyPrice: Number, // Yearly price (optional)
  limits: {
    maxUsers: Number,
    maxOrders: Number,
    maxCustomers: Number,
    maxCarriers: Number
  },
  features: [String], // Available features
  isActive: Boolean,
  description: String
}
```

### Updated Existing Models

All existing models now include:
```javascript
{
  tenantId: String, // References the tenant this record belongs to
  // ... existing fields
}
```

**Updated Models:**
- Users
- Orders  
- Customers
- Carriers
- Company
- Equipment
- Charges
- Commodities
- Files
- Notifications
- PaymentLogs
- EmployeeDoc

## 🔐 Authentication & Authorization

### Multi-Tenant Login
**Endpoint:** `POST /user/multitenant-login`

```javascript
// Regular tenant user login
{
  "email": "user@company.com",
  "password": "password",
  "tenantId": "tenant_123456_abcdef"
}

// Super admin login
{
  "email": "superadmin@system.com",
  "password": "password",
  "isSuperAdmin": true
}
```

### Middleware

#### Authentication
- `authenticateJWT` - Validates JWT tokens
- `requireSuperAdmin` - Requires super admin access
- `requireTenantAdmin` - Requires tenant admin access
- `restrictTo(roles)` - Role-based access control

#### Tenant Resolution
- `resolveTenant` - Resolves tenant context from user/headers
- `optionalTenant` - Optional tenant resolution
- `tenantResolver` - Resolves tenant from subdomain (for web requests)

## 🛠️ API Endpoints

### Tenant Admin Routes (`/api/tenant-admin`)

#### Tenant Information
- `GET /info` - Get tenant information and usage stats
- `PUT /settings` - Update tenant settings  
- `GET /usage` - Get tenant usage analytics
- `GET /analytics` - Get business analytics and charts

#### Billing & Subscription
- `GET /billing` - Get billing information
- `POST /billing/upgrade` - Upgrade subscription plan

#### User Management
- `GET /users` - List tenant users (paginated, searchable)
- `POST /users/invite` - Invite new user to tenant
- `PUT /users/:id/role` - Update user role
- `DELETE /users/:id` - Remove user from tenant

#### Reports
- `GET /reports/orders` - Orders report with date filtering
- `GET /reports/customers` - Customers report
- `GET /reports/carriers` - Carriers report  
- `GET /reports/financial` - Financial report (revenue, costs, profit)

#### Integrations
- `GET /integrations` - List integrations
- `POST /integrations` - Configure integration
- `DELETE /integrations/:id` - Remove integration

### Super Admin Routes (`/api/super-admin`)

#### System Overview
- `GET /overview` - System-wide statistics
- `GET /analytics` - System analytics and growth metrics

#### Tenant Management
- `GET /tenants` - List all tenants (paginated, filterable)
- `POST /tenants` - Create new tenant
- `GET /tenants/:tenantId` - Get specific tenant details
- `PUT /tenants/:tenantId/status` - Update tenant status
- `PUT /tenants/:tenantId/plan` - Force update tenant plan
- `GET /tenants/:tenantId/logs` - Get tenant activity logs

#### Subscription Plans
- `GET /subscription-plans` - List all subscription plans
- `POST /subscription-plans` - Create new subscription plan
- `PUT /subscription-plans/:id` - Update subscription plan
- `DELETE /subscription-plans/:id` - Delete subscription plan

#### Data Export
- `POST /export` - Export system data

## 🚀 Migration System

### Migration Scripts

#### 1. **Initial Setup** (`/migrations/001-setup-multitenant.js`)
- Creates default subscription plans
- Sets up initial tenant structure
- Creates indexes for performance

#### 2. **Data Migration** (`/migrations/002-migrate-existing-data.js`)  
- Migrates existing single-tenant data to multi-tenant
- Creates tenant from existing company data
- Updates all records with tenantId
- Creates super admin account

#### 3. **Sample Data** (`/scripts/generateSampleData.js`)
- Generates sample data for testing
- Creates company, users, customers, carriers, orders

#### 4. **Migration Runner** (`/scripts/runMigration.js`)
- Executes migrations with rollback support
- Validates migration success
- Provides progress feedback

### Running Migrations

```bash
# Generate sample data
node scripts/generateSampleData.js

# Run migrations
node scripts/runMigration.js

# Run with rollback option
node scripts/runMigration.js --rollback
```

## 🎯 Usage Examples

### Creating a New Tenant (Super Admin)

```javascript
POST /api/super-admin/tenants
{
  "name": "ACME Transport Inc",
  "subdomain": "acme-transport",
  "adminName": "John Doe",
  "adminEmail": "admin@acmetransport.com", 
  "adminPhone": "+1234567890",
  "subscriptionPlan": "professional",
  "companyInfo": {
    "name": "ACME Transport Inc",
    "mc_code": "MC123456",
    "dot_number": "DOT789012",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001"
  }
}
```

### Getting Tenant Analytics

```javascript
GET /api/tenant-admin/analytics?period=30d

Response:
{
  "status": true,
  "data": {
    "period": "30d",
    "summary": {
      "totalOrders": 145,
      "totalRevenue": 87500.00,
      "newCustomers": 12,
      "newCarriers": 5
    },
    "charts": {
      "ordersByStatus": [...],
      "revenueByMonth": [...]
    },
    "recentOrders": [...]
  }
}
```

### Inviting a User

```javascript
POST /api/tenant-admin/users/invite
{
  "name": "Jane Smith",
  "email": "jane@acmetransport.com",
  "role": 2,
  "position": "Operations Manager"
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/carrier_multitenant

# JWT Secret
SECRET_ACCESS=your_jwt_secret_key

# Domain Configuration
DOMAIN=yourdomain.com
NODE_ENV=production

# Email Configuration (for invitations)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### Subdomain Configuration

#### Development
```javascript
// Use query parameter for testing
http://localhost:3000/api/tenant-admin/info?tenant=acme-transport
```

#### Production
```javascript
// Use subdomains
https://acme-transport.yourdomain.com/api/tenant-admin/info
https://admin.yourdomain.com/api/super-admin/overview
```

## 📊 Features

### ✅ Implemented Features

- **Complete Data Isolation** - All tenant data is properly scoped
- **Subscription Management** - Multiple plans with limits and features  
- **User Management** - Tenant-scoped user CRUD operations
- **Analytics & Reporting** - Business insights and usage analytics
- **Billing Integration** - Usage tracking and subscription billing
- **Super Admin Panel** - System-wide management and oversight
- **Migration Scripts** - Seamless migration from single to multi-tenant
- **Authentication** - Multi-tenant aware login system
- **Authorization** - Role-based and tenant-based access control

### 🔄 Future Enhancements

- **Email Notifications** - User invitations and billing notifications
- **Advanced Integrations** - Third-party API integrations
- **Audit Logging** - Comprehensive activity tracking
- **Data Export/Import** - Bulk data operations
- **Advanced Analytics** - Predictive analytics and insights
- **White-label Customizations** - Custom branding per tenant

## 🧪 Testing

### Manual Testing Checklist

1. **Authentication**
   - [ ] Regular user login with tenant context
   - [ ] Super admin login
   - [ ] Invalid credentials handling
   - [ ] Token expiration

2. **Tenant Admin Functions**
   - [ ] Get tenant information
   - [ ] Update tenant settings
   - [ ] View usage analytics
   - [ ] Invite users
   - [ ] Generate reports

3. **Super Admin Functions**
   - [ ] View system overview
   - [ ] Manage tenants
   - [ ] Create subscription plans
   - [ ] System analytics

4. **Data Isolation**
   - [ ] Users can only see their tenant's data
   - [ ] Cross-tenant data access is blocked
   - [ ] Super admins can access all data

### Sample Test Data

After running the migration, you'll have:
- **1 Tenant** with sample company data
- **5 Users** with different roles  
- **10 Customers** with various details
- **5 Carriers** with MC codes
- **20 Orders** with realistic data
- **Default subscription plans**

## 🚨 Important Notes

1. **Data Migration** - Always backup your database before running migrations
2. **Tenant ID** - Once assigned, tenant IDs should not be changed
3. **Super Admin Access** - Super admin accounts have system-wide access
4. **Subscription Limits** - Enforce limits based on subscription plans
5. **Data Isolation** - Always include tenantId in database queries

## 📞 Support

For questions or issues with the multi-tenant system:

1. Check the logs for detailed error messages
2. Verify tenant context is properly set
3. Ensure user has appropriate permissions
4. Review the database indexes for performance

The multi-tenant architecture provides a scalable foundation for serving multiple companies while maintaining security, performance, and data integrity.