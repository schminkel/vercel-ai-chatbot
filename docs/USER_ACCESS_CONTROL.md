# User Access Control System

This document describes the user access control system implemented to restrict sign-up and sign-in to authorized users only, along with role-based access control.

## Overview

The system uses an `Allowed_User` table in the database to maintain a list of email addresses that are permitted to access the chatbot system. When users attempt to sign up or sign in, their email is checked against this table. Additionally, the system supports user roles for different levels of access.

## Features

- **Restricted Access**: Only emails in the `Allowed_User` table can sign up or sign in
- **Role-Based Access**: Users can have "user" or "admin" roles
- **Custom Access Denied Modal**: Users with unauthorized emails see a professional modal dialog
- **Initial Setup**: `thorsten@schminkel.de` is pre-configured as an allowed user with admin role
- **Management Scripts**: Easy-to-use scripts for managing allowed users and roles

## Database Schema

### User Table
```sql
CREATE TABLE IF NOT EXISTS "User" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(64) NOT NULL,
  "password" varchar(64),
  "role" varchar DEFAULT 'user' NOT NULL
);
```

### Allowed_User Table
```sql
CREATE TABLE IF NOT EXISTS "Allowed_User" (
  "email" varchar(64) PRIMARY KEY NOT NULL
);
```

## User Roles

### Available Roles
- **user**: Standard user with basic access
- **admin**: Administrator with elevated privileges

### Default Role
New users are assigned the "user" role by default when they register.

## User Experience

When an unauthorized user attempts to sign up or sign in:

1. The system checks their email against the `Allowed_User` table
2. If the email is not found, an access denied modal appears
3. The modal displays: "Your email address is not authorized to access this system. Please contact Thorsten Schminkel to get access to the system."
4. Users can close the modal and try with a different email

## Management

### Role Management Script

The system includes a comprehensive script for managing user roles:

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

### Quick Admin Setup

For setting up initial admin access:

```bash
# Set up admin access for a new user
npx tsx scripts/setup-admin.ts admin@example.com
```

This script will:
1. Add the email to the allowed users list
2. Set admin role if the user already exists
3. Provide instructions for manual role assignment if needed

### Using the Allowed Users Management Script

The system includes a management script for easy administration of allowed users:

```bash
# List all allowed users
npx tsx scripts/manage-allowed-users.ts list

# Add a new allowed user
npx tsx scripts/manage-allowed-users.ts add user@example.com

# Check if a user is allowed
npx tsx scripts/manage-allowed-users.ts check user@example.com
```

### Manual Database Operations

You can also directly add users to the database:

```sql
INSERT INTO "Allowed_User" (email) VALUES ('newuser@example.com');
```

## Implementation Details

### Files Modified/Created

1. **Database Schema** (`lib/db/schema.ts`)
   - Added `allowedUser` table definition
   - Added `AllowedUser` type
   - Updated `user` table to include `role` column
   - Added role enum with 'user' and 'admin' values

2. **Database Queries** (`lib/db/queries.ts`)
   - Added `isEmailAllowed()` function
   - Added `addAllowedUser()` function
   - Updated `createUser()` function to support role parameter
   - Added `getUserRole()` function
   - Added `updateUserRole()` function
   - Added `getAllUsers()` function

3. **Authentication Actions** (`app/(auth)/actions.ts`)
   - Updated login and register actions to check email authorization
   - Added `access_denied` status to action states

4. **UI Components**
   - Created `AccessDeniedDialog` component (`components/access-denied-dialog.tsx`)
   - Updated login page (`app/(auth)/login/page.tsx`)
   - Updated register page (`app/(auth)/register/page.tsx`)

5. **Migration**
   - Generated migration `0007_silent_molten_man.sql` (for allowed users)
   - Generated migration `0008_curly_screwball.sql` (for user roles)
   - Creates the `Allowed_User` table
   - Adds `role` column to `User` table

6. **Scripts**
   - `scripts/add-initial-allowed-user.ts` - Initial setup script
   - `scripts/manage-allowed-users.ts` - Allowed users management utility
   - `scripts/manage-user-roles.ts` - User role management utility
   - `scripts/setup-admin.ts` - Quick admin setup utility

### Security Considerations

- Email validation happens server-side in the authentication actions
- The check occurs before any user creation or authentication attempts
- The system gracefully handles database errors
- No sensitive information is exposed in error messages

## Initial Setup

The system automatically includes `thorsten@schminkel.de` as an allowed user with admin role. This was set up during the initial implementation.

## Adding New Users

To grant access to a new user:

1. **Using the management script** (recommended):
   ```bash
   npx tsx scripts/manage-allowed-users.ts add newuser@example.com
   ```

2. **Direct database insertion**:
   ```sql
   INSERT INTO "Allowed_User" (email) VALUES ('newuser@example.com');
   ```

The new user will immediately be able to sign up or sign in with their authorized email address.

## Managing User Roles

To change a user's role:

1. **Using the role management script** (recommended):
   ```bash
   # Set user as admin
   npx tsx scripts/manage-user-roles.ts set user@example.com admin
   
   # Set user as regular user
   npx tsx scripts/manage-user-roles.ts set user@example.com user
   ```

2. **Direct database update**:
   ```sql
   UPDATE "User" SET role = 'admin' WHERE email = 'user@example.com';
   ```

## Quick Admin Setup

For new admin users, you can use the setup script that handles both allowed user and role assignment:

```bash
npx tsx scripts/setup-admin.ts newadmin@example.com
```
