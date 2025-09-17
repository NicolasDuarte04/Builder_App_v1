"use client";

import React, { useMemo } from 'react';
import type { Brief } from '@/types/brief';
import { getBriefDiagnostics, focusField } from '@/types/brief';
import type { BriefError } from '@/lib/validate/brief';
import { cn } from '@/lib/utils';

type AuditChipsProps = {
  brief: Brief | Partial<Brief> | null | undefined;
  result: { brief: Partial<Brief>; errors: BriefError[] };
  className?: string;
};

export function AuditChips({ brief, result, className }: AuditChipsProps) {
  const diagnostics = useMemo(() => {
    return getBriefDiagnostics(brief || {}, result?.errors || []);
  }, [brief, result?.errors]);

  const hasAnything =
    (diagnostics.missing && diagnostics.missing.length > 0) ||
    (diagnostics.inconsistencies && diagnostics.inconsistencies.length > 0) ||
    (diagnostics.duplicates && diagnostics.duplicates.length > 0);

  if (!hasAnything) return null;

  return (
    <div className={cn("mb-3 space-y-2", className)} data-testid="audit-chips">
      {/* Faltantes */}
      {diagnostics.missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">Faltantes:</span>
          {diagnostics.missing.map((field) => (
            <button
              key={`missing-${field}`}
              type="button"
              data-field={field}
              onClick={() => focusField(field)}
              className={
                "px-2 py-1 text-xs border rounded-full hover:bg-muted transition-colors"
              }
            >
              {String(field)}
            </button>
          ))}
        </div>
      )}

      {/* Inconsistencias */}
      {diagnostics.inconsistencies.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">Inconsistencias:</span>
          {diagnostics.inconsistencies.map((it, idx) => (
            <button
              key={`inconsistency-${it.field}-${idx}`}
              type="button"
              data-field={it.field}
              title={it.detail ? `${it.code}: ${it.detail}` : it.code}
              onClick={() => focusField(it.field)}
              className={
                "px-2 py-1 text-xs border rounded-full hover:bg-muted transition-colors"
              }
            >
              {`${it.field}`}
            </button>
          ))}
        </div>
      )}

      {/* Duplicados */}
      {diagnostics.duplicates.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">Duplicados:</span>
          {diagnostics.duplicates.map((dup) => (
            <button
              key={`dup-${dup}`}
              type="button"
              data-field="mustHaveCoverages"
              onClick={() => focusField('mustHaveCoverages')}
              className={
                "px-2 py-1 text-xs border rounded-full hover:bg-muted transition-colors"
              }
            >
              {dup}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default AuditChips;


