-- Widen policy_uploads status check constraint to include fine-grained phases
DO $$
BEGIN
  -- Drop old check constraint if it exists (name may differ; handle both)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'policy_uploads_status_check'
      AND conrelid = 'public.policy_uploads'::regclass
  ) THEN
    ALTER TABLE public.policy_uploads
      DROP CONSTRAINT policy_uploads_status_check;
  END IF;

  -- Some projects name it "<table>_<column>_check"
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'policy_uploads_status_check1'
      AND conrelid = 'public.policy_uploads'::regclass
  ) THEN
    ALTER TABLE public.policy_uploads
      DROP CONSTRAINT policy_uploads_status_check1;
  END IF;

  -- Recreate the check including the fine-grained phases
  ALTER TABLE public.policy_uploads
    ADD CONSTRAINT policy_uploads_status_check
    CHECK (status IN (
      'uploading','extracting','analyzing','summarizing','processing','completed','error'
    ));
END$$;
