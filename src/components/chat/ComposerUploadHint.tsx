"use client";

import { useTranslation } from "@/hooks/useTranslation";

export function ComposerUploadHint() {
  const { t } = useTranslation();
  
  return (
    <p className="text-xs text-muted-foreground mt-2">
      {t("assistant.composer.hint")}
    </p>
  );
}
