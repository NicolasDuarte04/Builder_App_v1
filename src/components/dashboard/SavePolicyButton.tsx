"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SavePolicyButtonProps {
  policyData: {
    custom_name: string;
    insurer_name?: string;
    policy_type?: string;
    priority?: string;
    upload_id?: string;
    storage_path?: string;
    pdf_url?: string;
    pdf_base64?: string;
    metadata?: any;
    extracted_data?: any;
  };
  onSuccess?: () => void;
}

export function SavePolicyButton({ policyData, onSuccess }: SavePolicyButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const response = await fetch("/api/policies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(policyData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save policy");
      }

      const data = await response.json();
      
      toast({
        title: "¡Éxito!",
        description: data.message || "Análisis guardado exitosamente",
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error saving policy:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar el análisis",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Button
      onClick={handleSave}
      disabled={isSaving}
      className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
    >
      <Save className="h-4 w-4 mr-2" />
      {isSaving ? "Guardando..." : "Guardar Análisis"}
    </Button>
  );
}