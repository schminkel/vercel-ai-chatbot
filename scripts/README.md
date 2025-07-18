# User Management Scripts

This directory contains scripts for managing users, roles, and access control in the chatbot system.

## Available Scripts

### 1. Manage Allowed Users (`manage-allowed-users.ts`)

Controls which email addresses are permitted to access the system.

```bash
# List all allowed users
npx tsx scripts/manage-allowed-users.ts list

# Add a new allowed user
npx tsx scripts/manage-allowed-users.ts add user@example.com

# Check if a user is allowed
npx tsx scripts/manage-allowed-users.ts check user@example.com
```

### 2. Manage User Roles (`manage-user-roles.ts`)

Manages user roles (user/admin) for existing users.

```bash
# Set a user's role to admin
npx tsx scripts/manage-user-roles.ts set user@example.com admin

# Set a user's role to user (standard role)
npx tsx scripts/manage-user-roles.ts set user@example.com user

# Get a specific user's role
npx tsx scripts/manage-user-roles.ts get user@example.com

# List all users with their roles
npx tsx scripts/manage-user-roles.ts list
```

### 3. Setup Admin (`setup-admin.ts`)

Quick setup for new admin users. Handles both allowed user registration and role assignment.

```bash
# Set up admin access for a new user
npx tsx scripts/setup-admin.ts admin@example.com
```

This script will:
- Add the email to the allowed users list
- Set admin role if the user already exists
- Provide instructions for manual role assignment if needed

### 4. Bulk User Operations (`bulk-user-operations.ts`)

Performs bulk operations on users and provides statistics.

```bash
# Remove all guest users (cleanup)
npx tsx scripts/bulk-user-operations.ts clean-guests

# Promote predefined users to admin
npx tsx scripts/bulk-user-operations.ts promote-admins

# Show user statistics
npx tsx scripts/bulk-user-operations.ts list-stats
```

## Common Workflows

### Adding a New Regular User

1. Add to allowed users list:
   ```bash
   npx tsx scripts/manage-allowed-users.ts add user@example.com
   ```

2. User can now register and will automatically get 'user' role

### Adding a New Admin User

Option A - Using setup script (recommended):
```bash
npx tsx scripts/setup-admin.ts admin@example.com
```

Option B - Manual steps:
1. Add to allowed users:
   ```bash
   npx tsx scripts/manage-allowed-users.ts add admin@example.com
   ```

2. After user registers, promote to admin:
   ```bash
   npx tsx scripts/manage-user-roles.ts set admin@example.com admin
   ```

### Promoting Existing User to Admin

```bash
npx tsx scripts/manage-user-roles.ts set user@example.com admin
```

### Demoting Admin to Regular User

```bash
npx tsx scripts/manage-user-roles.ts set admin@example.com user
```

### System Maintenance

Clean up guest users (recommended periodically):
```bash
npx tsx scripts/bulk-user-operations.ts clean-guests
```

Check system statistics:
```bash
npx tsx scripts/bulk-user-operations.ts list-stats
```

## Role Definitions

- **user**: Standard user with basic access to the chatbot
- **admin**: Administrator with elevated privileges (specific privileges depend on frontend implementation)

## Initial Setup

The system comes pre-configured with:
- `thorsten@schminkel.de` as an allowed user with admin role

## Database Tables

### User Table
Contains user accounts with email, password, and role information.

### Allowed_User Table  
Contains the whitelist of email addresses permitted to register/login.

## Security Notes

- All scripts require database access via `POSTGRES_URL` environment variable
- Scripts should be run from the project root directory
- Role changes take effect immediately
- Users must be in the allowed users list to register/login
- New users default to 'user' role unless explicitly set to 'admin'

## Environment Setup

Ensure your `.env.local` file contains:
```
POSTGRES_URL=your_database_url_here
```
