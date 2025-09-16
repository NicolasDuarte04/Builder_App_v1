'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const InviteCodeModal = dynamic(() => import('@/components/gate/InviteCodeModal').then(mod => ({ default: mod.InviteCodeModal })), { ssr: false });

export default function AccessPage() {
  const [open, setOpen] = React.useState(true);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <InviteCodeModal open={open} onOpenChange={setOpen} />
    </div>
  );
}