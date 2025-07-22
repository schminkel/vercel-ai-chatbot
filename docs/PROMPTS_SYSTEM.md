# User-Specific Suggested Actions (Prompts) System

This document describes the implementation of the user-specific suggested actions system, which replaces hardcoded prompts with database-driven, user-specific prompts.

## Overview

The suggested actions shown on the "new chat" page are now loaded from the database and are individual to each logged-in user. The system includes:

- **Prompts Table**: Stores user-specific suggested actions
- **User Association**: Each prompt is tied to a specific user
- **Default Prompts**: System-wide default prompts for new users
- **Automatic Seeding**: Default prompts are created automatically for new users

## Database Schema

### Prompts Table

```sql
CREATE TABLE "Prompt" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "title" text NOT NULL,
    "prompt" text NOT NULL,
    "modelId" varchar(64),
    "userId" uuid NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id")
);
```

### Fields

- `id`: Unique identifier for the prompt
- `title`: Display title for the suggested action
- `prompt`: The actual prompt text that will be sent to the AI
- `modelId`: Optional specific model to use for this prompt
- `userId`: Reference to the user who owns this prompt
- `isDefault`: Whether this prompt serves as a default for new users
- `createdAt`: When the prompt was created
- `updatedAt`: When the prompt was last modified

## Features

### 1. User-Specific Prompts

Each user has their own set of suggested actions. When a user views the new chat page, they see prompts specifically associated with their account.

### 2. Default Prompts System

- Default prompts are created during database seeding
- New users automatically receive copies of default prompts
- Administrators can manage system-wide defaults

### 3. Automatic User Onboarding

When a new user account is created (regular or guest), the system automatically:
- Creates the user account
- Copies default prompts to the user's personal collection
- Ensures they have suggested actions available immediately

### 4. Fallback System

The system includes robust fallbacks:
- If a user has no prompts, default prompts are shown
- If database queries fail, the system gracefully handles errors
- Loading states and empty states are properly managed

## Scripts and Commands

### Database Migration

```bash
npm run db:generate  # Generate migration files
npm run db:migrate   # Apply migrations to database
```

### Seeding Default Prompts

```bash
npm run db:seed      # Seed default prompts
npm run db:setup     # Migrate + seed (full setup)
```

### Fresh Installation

For a completely fresh installation:

```bash
npm run db:setup
```

This will:
1. Run all database migrations
2. Seed default prompts for existing users
3. Set up the system for new user auto-prompting

## Default Prompts

The system comes with these default prompts:

1. **E-Mail-Optimizer**: German text optimization for grammar and readability
2. **Write code to**: Algorithm implementation examples
3. **Help me write an essay**: Essay writing assistance
4. **What is the weather**: Weather information queries
5. **Code Review Assistant**: Code review and best practices
6. **Technical Documentation**: Documentation creation help
7. **SQL Query Helper**: Database query assistance
8. **Debug Assistant**: Code debugging support

## API Functions

### Database Queries

- `getPromptsByUserId(userId)`: Get all prompts for a specific user
- `getDefaultPrompts()`: Get system default prompts
- `createPrompt(promptData)`: Create a new prompt
- `updatePrompt(id, updates)`: Update an existing prompt
- `deletePrompt(id)`: Delete a prompt
- `bulkCreatePrompts(prompts)`: Create multiple prompts at once

### Server Actions

- `getUserPrompts()`: Get prompts for the current logged-in user (with fallbacks)

## Component Updates

### SuggestedActions Component

The `SuggestedActions` component has been updated to:
- Load prompts from the database instead of hardcoded arrays
- Show loading states while fetching data
- Handle empty states gracefully
- Support all existing functionality (model selection, input formatting)

## Migration Guide

### From Hardcoded to Database-Driven

1. **Run Migration**: `npm run db:generate && npm run db:migrate`
2. **Seed Default Prompts**: `npm run db:seed`
3. **Verify**: Check that suggested actions appear correctly for existing users

### For Existing Users

Existing users will automatically see default prompts until they customize their own. The system maintains backward compatibility.

### For New Deployments

New deployments automatically include prompt seeding in the build process, ensuring the system is ready to use immediately.

## Customization

### Adding New Default Prompts

Edit `/scripts/seed-default-prompts.ts` and add new prompts to the `defaultPrompts` array:

```typescript
{
  title: 'Custom Prompt',
  prompt: 'Your custom prompt text here...',
  modelId: 'preferred-model-id', // optional
}
```

Then run `npm run db:seed` to apply to existing users.

### User Prompt Management

Future enhancements could include:
- User interface for managing personal prompts
- Prompt sharing between users
- Prompt categories and tags
- Prompt analytics and usage tracking

## Security Considerations

- User prompts are isolated by userId
- Default prompts are read-only for regular users
- All database queries include proper user authorization
- SQL injection protection through parameterized queries

## Performance

- Prompts are loaded once per page visit
- Database queries are optimized with proper indexing
- Fallback mechanisms prevent UI blocking
- Loading states provide immediate user feedback

## Troubleshooting

### No Prompts Showing

1. Check if user has prompts: `getPromptsByUserId(userId)`
2. Verify default prompts exist: `getDefaultPrompts()`
3. Check database connectivity and migrations
4. Review browser console for JavaScript errors

### Seeding Issues

1. Ensure database is migrated: `npm run db:migrate`
2. Check environment variables (DATABASE_URL)
3. Verify user accounts exist before seeding
4. Check script permissions and dependencies

### Build Issues

If the build fails during seeding:
1. Check database connectivity during build
2. Verify environment variables in build environment
3. Consider separating seeding from build process for some deployments
