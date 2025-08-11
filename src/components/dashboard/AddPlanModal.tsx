"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AddPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (plan: {
    provider: string;
    planName: string;
    policyNumber: string;
    category: string;
    monthlyPremium: number;
    renewalDate: string;
  }) => void;
}

export function AddPlanModal({ isOpen, onClose, onAdd }: AddPlanModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    provider: "",
    planName: "",
    policyNumber: "",
    category: "",
    monthlyPremium: "",
    renewalDate: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.provider || !formData.planName || !formData.category) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    // Call onAdd with formatted data
    onAdd({
      ...formData,
      monthlyPremium: parseFloat(formData.monthlyPremium) || 0
    });

    // Reset form
    setFormData({
      provider: "",
      planName: "",
      policyNumber: "",
      category: "",
      monthlyPremium: "",
      renewalDate: ""
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          Agregar Plan de Seguro
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Aseguradora *
            </label>
            <Input
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              placeholder="Ej: Sura, Colsanitas, Liberty"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Nombre del Plan *
            </label>
            <Input
              value={formData.planName}
              onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
              placeholder="Ej: Plan Salud Premium"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Número de Póliza
            </label>
            <Input
              value={formData.policyNumber}
              onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
              placeholder="Ej: POL-123456"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Categoría *
            </label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salud">Salud</SelectItem>
                <SelectItem value="vida">Vida</SelectItem>
                <SelectItem value="vehiculos">Vehículos</SelectItem>
                <SelectItem value="hogar">Hogar</SelectItem>
                <SelectItem value="viajes">Viajes</SelectItem>
                <SelectItem value="otros">Otros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Prima Mensual (COP)
            </label>
            <Input
              type="number"
              value={formData.monthlyPremium}
              onChange={(e) => setFormData({ ...formData, monthlyPremium: e.target.value })}
              placeholder="Ej: 150000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Fecha de Renovación
            </label>
            <Input
              type="date"
              value={formData.renewalDate}
              onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
            >
              Agregar Plan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}