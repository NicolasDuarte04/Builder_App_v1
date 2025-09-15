'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Star, StarOff, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface AttachedPDF {
  file: File;
  id: string;
  isPrimary: boolean;
  previewUrl?: string;
}

interface AttachedFilesListProps {
  files: AttachedPDF[];
  onSetPrimary: (id: string) => void;
  onRemove: (id: string) => void;
}

export function AttachedFilesList({ files, onSetPrimary, onRemove }: AttachedFilesListProps) {
  const { t } = useTranslation();

  if (!files.length) return null;

  return (
    <div className="space-y-2 mb-4">
      <div className="text-sm font-medium text-muted-foreground mb-2">
        {t('upload.attached_files')} ({files.length})
      </div>
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-2 bg-muted/40 rounded-md"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="truncate text-sm">{file.file.name}</span>
              {file.isPrimary && (
                <Badge variant="secondary" className="flex-shrink-0">
                  {t('upload.primary')}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => onSetPrimary(file.id)}
                disabled={file.isPrimary}
                title={file.isPrimary ? t('upload.is_primary') : t('upload.set_primary')}
                aria-label={file.isPrimary ? t('upload.is_primary') : t('upload.set_primary')}
              >
                {file.isPrimary ? (
                  <Star className="h-4 w-4" />
                ) : (
                  <StarOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => onRemove(file.id)}
                title={t('upload.remove_file')}
                aria-label={t('upload.remove_file')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
