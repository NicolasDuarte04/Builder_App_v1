"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { telemetry, getUserContext } from '@/lib/telemetry';

export const CATEGORY_OPTIONS = [
  { value: 'vehiculos', label: 'Vehículos' },
  { value: 'salud', label: 'Salud' },
  { value: 'viajes', label: 'Viajes' },
  { value: 'vida', label: 'Vida' },
  { value: 'hogar', label: 'Hogar' },
  { value: 'pyme', label: 'PYME' },
] as const;

interface CategoryChooserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (category: string) => void;
}

export function CategoryChooser({ open, onClose, onSelect }: CategoryChooserProps) {
  const { t, language } = useTranslation();

  const handleSelect = async (value: string, label: string) => {
    // Track category disambiguation
    try {
      const { sessionId, userId } = await getUserContext();
      telemetry.track('CATEGORY_DISAMBIGUATED', {
        selectedCategory: label,
        source: 'search_click',
        sessionId,
        userId,
      });
    } catch {}

    onSelect(label);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('brief.categoryChooser.title') as string}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          {CATEGORY_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center justify-center gap-2"
              onClick={() => handleSelect(option.value, option.label)}
              data-testid={`category-chooser-${option.value}`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
