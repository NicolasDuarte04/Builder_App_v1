"use client";

import React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSession, signIn } from 'next-auth/react';
import { eventBus, BrikiEvents } from '@/lib/event-bus';

interface SavePolicyButtonProps {
  policyData: {
    custom_name: string;
    insurer_name?: string;
    policy_type?: string;
    priority?: string;
    pdf_base64?: string;
    // Preferred fields from analyzer
    upload_id?: string;
    storage_path?: string;
    pdf_url?: string;
    uploader_user_id?: string;
    analysis?: any;
    metadata?: any;
    extracted_data?: any;
  };
  onSuccess?: () => void;
  onBeforeSave?: () => boolean | void;
}

export function SavePolicyButton({ policyData, onSuccess, onBeforeSave }: SavePolicyButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const { toast } = useToast();
  const { data: session } = useSession();
  const [showMismatchModal, setShowMismatchModal] = useState(false);

  const sessionUserId = (session?.user as any)?.id;

  // If user signs out or switches account, clear any stale analysis info passed via props (parent should refresh)
  useEffect(() => {
    // no-op placeholder for now; parent is responsible for clearing state on sign-out
  }, [sessionUserId]);

  const handleSave = async () => {
    // Check user consistency before proceeding
    if (onBeforeSave && onBeforeSave() === false) {
      return; // Stop execution if check fails
    }

    try {
      setIsSaving(true);
      // Guardrail: ownership check before save
      if (policyData.uploader_user_id && sessionUserId && policyData.uploader_user_id !== sessionUserId) {
        setShowMismatchModal(true);
        return false as any;
      }
      
      const response = await fetch("/api/policies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(policyData),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409 && error?.error === 'upload_not_owned') {
          setShowMismatchModal(true);
          return false as any;
        }
        throw new Error(error.error || "Failed to save policy");
      }

      const data = await response.json();
      
      toast({
        title: "¡Éxito!",
        description: data.message || "Análisis guardado exitosamente",
      });

      try { eventBus.emit(BrikiEvents.POLICY_SAVED, { id: data.id }); } catch {}
      setSavedId(data.id || null);

      onSuccess?.();
      return true;
    } catch (error) {
      console.error("Error saving policy:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar el análisis",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          onClick={handleSave}
          disabled={isSaving || !!savedId}
          className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
        >
          {savedId ? <Check className="h-4 w-4" /> : isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {savedId ? "Guardado ✓" : isSaving ? "Guardando..." : "Guardar análisis"}
        </Button>
        {savedId && (
          <Button variant="outline" onClick={() => { window.location.href = '/dashboard/insurance'; }}>
            Ver en Mis Seguros
          </Button>
        )}
      </div>

      {showMismatchModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Tu sesión cambió</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              El PDF se analizó con otra cuenta. Vuelve a analizar con esta cuenta o inicia sesión con la cuenta original.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowMismatchModal(false); signIn(); }}>
                Cambiar de cuenta
              </Button>
              <Button onClick={() => { setShowMismatchModal(false); window.dispatchEvent(new CustomEvent('reanalyze-under-current-account')); }}>
                Re-analizar bajo esta cuenta
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}