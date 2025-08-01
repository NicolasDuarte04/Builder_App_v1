"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  FileText, 
  Calendar, 
  Building2, 
  Shield, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Download,
  Copy,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PolicyDetailModalProps {
  policy: any;
  isOpen: boolean;
  onClose: () => void;
}

export function PolicyDetailModal({ policy, isOpen, onClose }: PolicyDetailModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "details" | "raw">("overview");

  if (!policy) return null;

  const formatCurrency = (amount: number, currency: string = "COP") => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Información copiada al portapapeles",
    });
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const extractedData = policy.extracted_data || {};
  const metadata = policy.metadata || {};

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[5%] bottom-[5%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {policy.custom_name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Guardado el {format(new Date(policy.created_at), "PPP", { locale: es })}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === "overview"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                }`}
              >
                Resumen
              </button>
              <button
                onClick={() => setActiveTab("details")}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === "details"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                }`}
              >
                Detalles
              </button>
              <button
                onClick={() => setActiveTab("raw")}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === "raw"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                }`}
              >
                Datos Crudos
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {activeTab === "overview" && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    {/* Quick Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-4 w-4 text-gray-600" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Aseguradora</span>
                        </div>
                        <p className="font-semibold">{policy.insurer_name || "No especificada"}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-gray-600" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Tipo de Póliza</span>
                        </div>
                        <p className="font-semibold">{policy.policy_type || "General"}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-gray-600" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Prioridad</span>
                        </div>
                        <Badge className={getPriorityColor(policy.priority)}>
                          {policy.priority === "high" ? "Alta" : policy.priority === "medium" ? "Media" : "Baja"}
                        </Badge>
                      </div>
                    </div>

                    {/* Premium Info */}
                    {metadata.premium_amount && (
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <DollarSign className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold text-gray-900 dark:text-white">Prima</h3>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(metadata.premium_amount, metadata.premium_currency)}
                          <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-2">
                            /{metadata.premium_frequency || "mes"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Key Features from extracted data */}
                    {extractedData.keyFeatures && extractedData.keyFeatures.length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <h3 className="font-semibold text-gray-900 dark:text-white">Características Principales</h3>
                        </div>
                        <div className="space-y-2">
                          {extractedData.keyFeatures.map((feature: string, index: number) => (
                            <div key={index} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {extractedData.recommendations && extractedData.recommendations.length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold text-gray-900 dark:text-white">Recomendaciones</h3>
                        </div>
                        <div className="space-y-2">
                          {extractedData.recommendations.map((rec: string, index: number) => (
                            <div key={index} className="flex items-start gap-2">
                              <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "details" && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    {/* Policy Details */}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Información de la Póliza</h3>
                      <div className="space-y-3">
                        {metadata.policy_number && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Número de Póliza</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{metadata.policy_number}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(metadata.policy_number)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                        {metadata.effective_date && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Fecha de Inicio</span>
                            <span className="font-medium">{metadata.effective_date}</span>
                          </div>
                        )}
                        {metadata.expiration_date && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Fecha de Vencimiento</span>
                            <span className="font-medium">{metadata.expiration_date}</span>
                          </div>
                        )}
                        {metadata.risk_score !== undefined && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Puntuación de Riesgo</span>
                            <Badge variant="neutral">{metadata.risk_score}/10</Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Coverage Details */}
                    {extractedData.coverage && (
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Detalles de Cobertura</h3>
                        
                        {/* Limits */}
                        {extractedData.coverage.limits && Object.keys(extractedData.coverage.limits).length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Límites</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {Object.entries(extractedData.coverage.limits).map(([key, value]: [string, any]) => (
                                <div key={key} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{key}</p>
                                  <p className="font-semibold">{formatCurrency(value)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Deductibles */}
                        {extractedData.coverage.deductibles && Object.keys(extractedData.coverage.deductibles).length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Deducibles</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {Object.entries(extractedData.coverage.deductibles).map(([key, value]: [string, any]) => (
                                <div key={key} className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{key}</p>
                                  <p className="font-semibold">{formatCurrency(value)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Exclusions */}
                        {extractedData.coverage.exclusions && extractedData.coverage.exclusions.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Exclusiones</h4>
                            <div className="space-y-2">
                              {extractedData.coverage.exclusions.map((exclusion: string, index: number) => (
                                <div key={index} className="flex items-start gap-2">
                                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{exclusion}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "raw" && (
                  <motion.div
                    key="raw"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <div className="bg-gray-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                        {JSON.stringify({ metadata, extracted_data: extractedData }, null, 2)}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                {policy.pdf_url && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(policy.pdf_url, "_blank")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar PDF
                  </Button>
                )}
              </div>
              <Button onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}