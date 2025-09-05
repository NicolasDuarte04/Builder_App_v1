"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number;
  limit: number;
}

export function UpgradeModal({ isOpen, onClose, currentCount, limit }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleUpgrade = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo procesar la actualización',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    'Pólizas guardadas ilimitadas',
    'Perfiles familiares (muy pronto)',
    'Acceso a funciones exclusivas'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-6 w-6 text-yellow-500" />
            <DialogTitle className="text-xl font-semibold">
              Límite alcanzado
            </DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Ya guardaste {limit} pólizas con el plan gratis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Estado actual:
              </span>
              <Badge variant="secondary" className="text-xs">
                {currentCount}/{limit} políticas
              </Badge>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentCount / limit) * 100}%` }}
              />
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Beneficios Premium:
            </h3>
            <div className="space-y-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                $3.99
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                por mes
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
                          <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Seguir sin guardar
              </Button>
                          <Button
                onClick={handleUpgrade}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Crown className="h-4 w-4 mr-2" />
                )}
                Desbloquear con Briki Plus – $3.99/mes
              </Button>
          </div>

          {/* Additional Info */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Puedes cancelar en cualquier momento. No hay compromisos a largo plazo.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
