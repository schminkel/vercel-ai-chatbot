# User Access Control System

This document describes the user access control system implemented to restrict sign-up and sign-in to authorized users only.

## Overview

The system uses an `Allowed_User` table in the database to maintain a list of email addresses that are permitted to access the chatbot system. When users attempt to sign up or sign in, their email is checked against this table.

## Features

- **Restricted Access**: Only emails in the `Allowed_User` table can sign up or sign in
- **Custom Access Denied Modal**: Users with unauthorized emails see a professional modal dialog
- **Initial Setup**: `thorsten@schminkel.de` is pre-configured as an allowed user
- **Management Scripts**: Easy-to-use scripts for managing allowed users

## Database Schema

### Allowed_User Table
```sql
CREATE TABLE IF NOT EXISTS "Allowed_User" (
  "email" varchar(64) PRIMARY KEY NOT NULL
);
```

## User Experience

When an unauthorized user attempts to sign up or sign in:

1. The system checks their email against the `Allowed_User` table
2. If the email is not found, an access denied modal appears
3. The modal displays: "Your email address is not authorized to access this system. Please contact Thorsten Schminkel to get access to the system."
4. Users can close the modal and try with a different email

## Management

### Using the Management Script

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

2. **Database Queries** (`lib/db/queries.ts`)
   - Added `isEmailAllowed()` function
   - Added `addAllowedUser()` function

3. **Authentication Actions** (`app/(auth)/actions.ts`)
   - Updated login and register actions to check email authorization
   - Added `access_denied` status to action states

4. **UI Components**
   - Created `AccessDeniedDialog` component (`components/access-denied-dialog.tsx`)
   - Updated login page (`app/(auth)/login/page.tsx`)
   - Updated register page (`app/(auth)/register/page.tsx`)

5. **Migration**
   - Generated migration `0007_silent_molten_man.sql`
   - Creates the `Allowed_User` table

6. **Scripts**
   - `scripts/add-initial-allowed-user.ts` - Initial setup script
   - `scripts/manage-allowed-users.ts` - Management utility

### Security Considerations

- Email validation happens server-side in the authentication actions
- The check occurs before any user creation or authentication attempts
- The system gracefully handles database errors
- No sensitive information is exposed in error messages

## Initial Setup

The system automatically includes `thorsten@schminkel.de` as an allowed user. This was set up during the initial implementation.

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
