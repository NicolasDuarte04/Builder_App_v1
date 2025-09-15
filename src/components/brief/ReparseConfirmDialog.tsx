import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/hooks/useTranslation";

interface ReparseConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: 'merge' | 'replace') => void;
}

export function ReparseConfirmDialog({ isOpen, onClose, onConfirm }: ReparseConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('brief.reparse.title')}</DialogTitle>
          <DialogDescription>{t('brief.reparse.description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onConfirm('merge')}
            data-testid="reparse-merge-btn"
          >
            {t('brief.reparse.merge')}
          </Button>
          <Button
            variant="default"
            onClick={() => onConfirm('replace')}
            data-testid="reparse-replace-btn"
          >
            {t('brief.reparse.replace')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
