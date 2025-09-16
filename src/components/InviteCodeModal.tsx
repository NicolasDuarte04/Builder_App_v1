import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface InviteCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteCodeModal({ isOpen, onClose }: InviteCodeModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      // Access code requirement has been removed - redirect directly to assistant
      router.push('/assistant');
      onClose();
    }
  }, [isOpen, router, onClose]);

  return null;
}
