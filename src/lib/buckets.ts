import { getPublicEnv } from '@/lib/env';

export const POLICY_BUCKET =
  getPublicEnv().NEXT_PUBLIC_POLICY_BUCKET ?? 'policy-documents' as any;


