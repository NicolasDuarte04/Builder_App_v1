'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface InviteCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteCodeModal({ open, onOpenChange }: InviteCodeModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (open) {
      // Access code requirement has been removed - redirect directly to assistant
      router.push('/assistant');
      onOpenChange(false);
    }
  }, [open, router, onOpenChange]);

  return null;
}