'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccessPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to assistant since access code is no longer required
    router.replace('/assistant');
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-lg text-gray-600">Redirigiendo al asistente...</p>
      </div>
    </div>
  );
}