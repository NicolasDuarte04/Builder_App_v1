"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, FileText, Globe, ArrowRight, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface SourcingActionsProps {
  onSearchPlans?: () => void;
  onUploadDocument?: () => void;
  onWebSearch?: () => void;
  isSearching?: boolean;
  className?: string;
}

export function SourcingActions({
  onSearchPlans,
  onUploadDocument,
  onWebSearch,
  isSearching = false,
  className = ""
}: SourcingActionsProps) {
  const { t } = useTranslation();

  return (
    <Card className={`border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10 ${className}`}>
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            ¿Necesitas planes más específicos?
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Estas son plantillas generales. Busca planes reales o sube documentos para obtener opciones más precisas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search Real Plans */}
          <div className="space-y-3">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto">
              <Search className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-center">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                Buscar planes reales
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Encuentra opciones actuales del mercado
              </p>
              <Button
                onClick={onSearchPlans}
                disabled={isSearching}
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    Buscar ahora
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Upload Document */}
          <div className="space-y-3">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                Subir documento
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Analiza pólizas o propuestas existentes
              </p>
              <Button
                onClick={onUploadDocument}
                variant="outline"
                size="sm"
                className="w-full border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
              >
                Subir archivo
                <FileText className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Web Search */}
          <div className="space-y-3">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full mx-auto">
              <Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-center">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                Búsqueda web
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Encuentra información actualizada online
              </p>
              <Button
                onClick={onWebSearch}
                variant="outline"
                size="sm"
                className="w-full border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-900/20"
              >
                Buscar web
                <Globe className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-800">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            💡 <strong>Consejo:</strong> Combina plantillas con planes reales para obtener la mejor cobertura al mejor precio
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
