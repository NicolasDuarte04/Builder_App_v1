'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface InviteCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteCodeModal({ open, onOpenChange }: InviteCodeModalProps) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/trial/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        switch (response.status) {
          case 400:
            setError('Código requerido');
            break;
          case 403:
            setError('Código inválido o expirado');
            break;
          case 503:
            setError('Puerta de acceso mal configurada');
            break;
          default:
            setError('Error al validar el código');
        }
        return;
      }

      // Success - navigate to assistant
      router.push('/assistant');
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md backdrop-blur-md">
        <DialogHeader>
          <DialogTitle>Ingresa tu código de invitación</DialogTitle>
          <DialogDescription>
            Introduce el código que recibiste para acceder a Briki Assistant.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="BRIKI-XX-XXXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              className="w-full"
            />
            {error && (
              <p className="text-sm text-red-500 mt-2">{error}</p>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={isSubmitting || !code.trim()}
            className="w-full"
          >
            {isSubmitting ? 'Validando...' : 'Continuar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}