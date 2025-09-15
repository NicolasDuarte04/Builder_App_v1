# Step 1: Supabase Helpers Implementation

## Overview
Implemented thin helpers for briefs and cases management following the existing supabase-server.ts pattern.

## Files Created

### `src/lib/supabase/briefs.ts`
- **upsertBrief(client, brief)**: Inserts or updates a brief using PostgreSQL upsert
- **getBriefBySession(client, userId, sessionId)**: Retrieves most recent brief for a user session

### `src/lib/supabase/cases.ts`  
- **createCaseFromBrief(client, userId, briefId)**: Creates new case linked to a brief
- **getCaseById(client, caseId)**: Retrieves case by ID

## Database Schema

### Briefs Table
- Stores entire Brief object in `data` JSONB column (canonical)
- Includes version tracking and session context
- RLS policies ensure user-only access

### Cases Table
- Links to briefs via `brief_id` foreign key
- Tracks status, timeline, and reminders as JSONB
- Auto-generates UUIDs and timestamps

## Usage Plan from Future briefStore

```typescript
// Example integration with future briefStore
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { upsertBrief, getBriefBySession } from '@/lib/supabase/briefs';
import { createCaseFromBrief, getCaseById } from '@/lib/supabase/cases';

// In briefStore implementation:
class BriefStore {
  async saveBrief(brief: Brief) {
    const client = createServerSupabaseClient();
    return await upsertBrief(client, brief);
  }
  
  async getCurrentBrief(userId: string, sessionId: string) {
    const client = createServerSupabaseClient();
    return await getBriefBySession(client, userId, sessionId);
  }
  
  async createCase(userId: string, briefId: string) {
    const client = createServerSupabaseClient();
    return await createCaseFromBrief(client, userId, briefId);
  }
}
```

## Error Handling
- Follows existing pattern: never logs PII
- Throws descriptive errors for debugging
- Handles "not found" cases gracefully (returns null)

## Type Safety
- Full TypeScript support with proper interfaces
- Uses existing Brief and CaseFile types
- Compiles without errors (verified with type-check)

## Next Steps
- Wire helpers into UI components
- Implement briefStore integration
- Add comprehensive error boundaries
- Consider adding batch operations for multiple briefs/cases
