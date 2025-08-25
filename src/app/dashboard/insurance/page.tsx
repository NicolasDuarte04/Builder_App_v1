"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Shield, Plus, Loader2 } from "lucide-react";
import SavedAnalysesList from '@/components/dashboard/analyses/SavedAnalysesList';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SavedPoliciesCard } from "@/components/dashboard/SavedPoliciesCard";
import { PolicyDetailModal } from "@/components/dashboard/PolicyDetailModal";
import { PolicyComparisonView } from "@/components/dashboard/PolicyComparisonView";
import { AddPlanModal } from "@/components/dashboard/AddPlanModal";
import { useToast } from "@/hooks/use-toast";

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

export default function MyInsurancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("saved-analyses");
  const [savedPolicies, setSavedPolicies] = useState<SavedPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [selectedPolicy, setSelectedPolicy] = useState<SavedPolicy | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);

  // Fetch saved policies with filters
  const fetchPolicies = async () => {
    try {
      setIsRefreshing(true);
      
      // Build URL with query parameters
      const url = new URL("/api/policies", window.location.origin);
      if (searchTerm) url.searchParams.append("search", searchTerm);
      if (priorityFilter) url.searchParams.append("priority", priorityFilter);
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error("Failed to fetch policies");
      }

      const data = await response.json();
      setSavedPolicies(data.policies || []);
    } catch (error) {
      console.error("Error fetching policies:", error);
      toast({
        title: "Error",
        description: "Error al cargar las pólizas guardadas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Delete a policy
  const handleDeletePolicy = async (policyId: string) => {
    try {
      const response = await fetch(`/api/policies/${policyId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete policy");
      }

      // Remove from local state
      setSavedPolicies(prev => prev.filter(p => p.id !== policyId));
      
      toast({
        title: "Éxito",
        description: "Póliza eliminada exitosamente",
      });
    } catch (error) {
      console.error("Error deleting policy:", error);
      toast({
        title: "Error",
        description: "Error al eliminar la póliza",
        variant: "destructive",
      });
    }
  };

  // View policy details
  const handleViewPolicy = (policy: SavedPolicy) => {
    setSelectedPolicy(policy);
    setIsModalOpen(true);
  };

  // Handle adding a new tracked plan
  const handleAddPlan = async (plan: {
    provider: string;
    planName: string;
    policyNumber: string;
    category: string;
    monthlyPremium: number;
    renewalDate: string;
  }) => {
    try {
      // TODO: Implement API call to save tracked plan
      console.log("Adding tracked plan:", plan);
      
      toast({
        title: "Plan agregado",
        description: `${plan.planName} ha sido agregado a tus planes rastreados`,
      });
      
      setShowAddPlanModal(false);
      
      // TODO: Refresh tracked plans list
    } catch (error) {
      console.error("Error adding tracked plan:", error);
      toast({
        title: "Error",
        description: "No se pudo agregar el plan",
        variant: "destructive",
      });
    }
  };

  // Load policies on component mount and when filters change
  useEffect(() => {
    fetchPolicies();
  }, [searchTerm, priorityFilter]);

  // Allow access without authentication for preview/testing
  // (No redirect; API calls may 401 if not signed in.)
  useEffect(() => {
    // no-op
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not signed in, we still render the portal UI; data calls may show empty or error toasts.

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pt-32">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          {t("dashboard.insurance.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("dashboard.insurance.subtitle")}
        </p>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="saved-analyses" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("dashboard.insurance.tabs.savedAnalyses")}
          </TabsTrigger>
          <TabsTrigger value="saved-plans" className="flex items-center gap-2" disabled title={t('common.comingSoon') || 'Coming soon'}>
            <Shield className="h-4 w-4" />
            {t("dashboard.insurance.tabs.trackedPlans")}
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2" disabled title={t('common.comingSoon') || 'Coming soon'}>
            {/* reuse icon */}
            <Shield className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Saved Analyses Tab */}
        <TabsContent value="saved-analyses" className="space-y-4">
          <SavedAnalysesList />
        </TabsContent>

        {/* Tracked Plans Tab */}
        <TabsContent value="tracked-plans" className="space-y-4">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="text-xl mb-2">
                {t("dashboard.insurance.trackedPlans.emptyTitle")}
              </CardTitle>
              <CardDescription className="text-center max-w-md mb-6">
                {t("dashboard.insurance.trackedPlans.emptyDescription")}
              </CardDescription>
              <Button 
                variant="outline"
                className="border-gradient"
                onClick={() => setShowAddPlanModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("dashboard.insurance.trackedPlans.addButton")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Policy Detail Modal */}
      <PolicyDetailModal
        policy={selectedPolicy}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPolicy(null);
        }}
      />

      {/* Policy Comparison View */}
      {showComparison && (
        <PolicyComparisonView
          policies={savedPolicies.filter(p => selectedForComparison.includes(p.id))}
          onClose={() => {
            setShowComparison(false);
            setSelectedForComparison([]);
          }}
        />
      )}

      {/* Add Plan Modal */}
      <AddPlanModal
        isOpen={showAddPlanModal}
        onClose={() => setShowAddPlanModal(false)}
        onAdd={handleAddPlan}
      />
    </div>
  );
}