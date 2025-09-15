# Step 1: Database Migrations Audit

## Overview

Created 5 new tables with owner-only Row Level Security (RLS) and performance indexes:

1. **briefs** - User briefs with session tracking and locale support
2. **cases** - Cases linked to briefs with status and timeline tracking  
3. **documents** - Documents associated with cases with Spanish text search
4. **proposals** - Proposals associated with cases
5. **sourcing_tasks** - Sourcing tasks associated with cases

## Migration Files Created

- `20250911072151_create_briefs_table.sql`
- `20250911072152_create_cases_table.sql`
- `20250911072153_create_documents_table.sql`
- `20250911072154_create_proposals_table.sql`
- `20250911072155_create_sourcing_tasks_table.sql`

## Row Level Security Implementation

### Core Principle: Owner-Only Access

All tables implement strict owner-only access patterns:

1. **Direct ownership** (briefs, cases): `auth.uid() = user_id`
2. **Indirect ownership** (documents, proposals, sourcing_tasks): Access via join to `cases.user_id`

### RLS Policy Structure

Each table has 4 policies:
- **SELECT**: Users can only view their own records
- **INSERT**: Users can only insert records they own
- **UPDATE**: Users can only update their own records (with USING and WITH CHECK)
- **DELETE**: Users can only delete their own records

### Example RLS in Action

#### Denied Query Examples

```sql
-- User A (id: 'aaaa-aaaa-aaaa-aaaa') tries to access User B's brief
-- This will return empty result set (access denied silently)
SELECT * FROM briefs WHERE user_id = 'bbbb-bbbb-bbbb-bbbb';

-- User A tries to insert a case for User B's brief
-- This will fail with RLS violation error
INSERT INTO cases (user_id, brief_id, status) 
VALUES ('bbbb-bbbb-bbbb-bbbb', 'some-brief-id', 'active');

-- User A tries to update User B's case
-- This will fail silently (no rows affected)
UPDATE cases SET status = 'closed' 
WHERE id = 'user-b-case-id';

-- User A tries to access documents from User B's case
-- This will return empty result set
SELECT * FROM documents 
WHERE case_id IN (SELECT id FROM cases WHERE user_id = 'bbbb-bbbb-bbbb-bbbb');
```

#### Allowed Query Examples

```sql
-- User A accessing their own data (all succeed)
SELECT * FROM briefs WHERE user_id = auth.uid();
INSERT INTO cases (user_id, brief_id, status) VALUES (auth.uid(), 'my-brief-id', 'active');
UPDATE cases SET status = 'closed' WHERE user_id = auth.uid();
DELETE FROM briefs WHERE user_id = auth.uid() AND id = 'my-brief-id';

-- User A accessing related data through ownership chain
SELECT * FROM documents d
JOIN cases c ON d.case_id = c.id
WHERE c.user_id = auth.uid();
```

## Performance Optimizations

### Indexes Created

1. **User ID indexes** - Fast lookups by owner
   - `idx_briefs_user_id`
   - `idx_cases_user_id`

2. **Foreign key indexes** - Efficient joins
   - `idx_briefs_session_id`
   - `idx_cases_brief_id`
   - `idx_documents_case_id`
   - `idx_proposals_case_id`
   - `idx_sourcing_tasks_case_id`

3. **Text search index** - Spanish full-text search
   - `idx_documents_text_extracted_gin` (GIN index with Spanish configuration)

### Updated_at Triggers

Tables with `updated_at` columns automatically update on modification:
- briefs
- cases
- sourcing_tasks

All use the shared `handle_updated_at()` trigger function.

## Security Considerations

1. **No NULL user_id paths** - All records must have authenticated owner
2. **Cascade deletes** - Child records automatically deleted with parent
3. **Service role bypass** - Only server-side code with service role key can bypass RLS
4. **No public access** - All tables require authentication (`GRANT ALL TO authenticated`)

## Testing Checklist

Before deployment, verify:

```bash
# Reset and apply migrations
supabase db reset
supabase db push

# Test RLS policies
psql $DATABASE_URL -c "
  -- Create test users
  INSERT INTO auth.users (id) VALUES 
    ('11111111-1111-1111-1111-111111111111'),
    ('22222222-2222-2222-2222-222222222222');
  
  -- Test as User 1
  SET LOCAL auth.uid = '11111111-1111-1111-1111-111111111111';
  
  -- Should succeed
  INSERT INTO briefs (user_id, session_id, data) 
  VALUES ('11111111-1111-1111-1111-111111111111', 'test-session', '{}'::jsonb);
  
  -- Should fail (RLS violation)
  INSERT INTO briefs (user_id, session_id, data) 
  VALUES ('22222222-2222-2222-2222-222222222222', 'test-session', '{}'::jsonb);
"
```

## Next Steps

1. Create TypeScript types matching table schemas
2. Build data access layer with RLS-aware queries
3. Implement application-level validation matching DB constraints
4. Add monitoring for RLS violations in production
