"use client";

import { FileText, Download, Trash2, Calendar, Building2, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useTranslation } from "@/hooks/useTranslation";

interface SavedPolicy {
  id: string;
  custom_name: string;
  insurer_name?: string;
  policy_type?: string;
  priority: string;
  pdf_url?: string;
  created_at: string;
  metadata?: any;
  extracted_data?: any;
}

interface SavedPoliciesCardProps {
  policy: SavedPolicy;
  onDelete?: (id: string) => void;
  onView?: (policy: SavedPolicy) => void;
}

export function SavedPoliciesCard({ policy, onDelete, onView }: SavedPoliciesCardProps) {
  const { locale } = useTranslation();
  const dateLocale = locale === "es" ? es : enUS;

  const priorityColors = {
    high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
  };

  const handleDownload = () => {
    if (policy.pdf_url) {
      window.open(policy.pdf_url, "_blank");
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onView?.(policy)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">{policy.custom_name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {policy.insurer_name && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span>{policy.insurer_name}</span>
                  </div>
                )}
                {policy.policy_type && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>{policy.policy_type}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <Badge className={priorityColors[policy.priority as keyof typeof priorityColors] || priorityColors.medium}>
            {policy.priority}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(policy.created_at), "PPP", { locale: dateLocale })}</span>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {policy.pdf_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="h-8 w-8 p-0"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(policy.id)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}