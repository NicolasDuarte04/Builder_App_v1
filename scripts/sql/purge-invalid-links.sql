-- Ensure columns exist
ALTER TABLE insurance_plans
  ADD COLUMN IF NOT EXISTS link_status TEXT CHECK (link_status IN ('valid','redirected','broken')),
  ADD COLUMN IF NOT EXISTS final_url TEXT,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_official_domain TEXT;

-- Purge obviously malformed external links
UPDATE insurance_plans
SET external_link = NULL,
    link_status = 'broken',
    final_url = NULL,
    last_verified_at = now()
WHERE external_link IS NOT NULL
  AND (
    external_link !~* '^https://'
    OR external_link ~* '\(|\)'
    OR external_link ~* '\s'
    OR external_link ~* 'xn--'
    OR external_link ~* '[^a-z0-9\.\-:/_%#?=&]'
  );


