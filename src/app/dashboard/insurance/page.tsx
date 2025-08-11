"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Shield, Plus, Loader2, RefreshCw, Search, Filter } from "lucide-react";
import { Button } from "../../../components/ui/tailwindcss-buttons";
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

  // Require authentication for insurance dashboard
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login?callbackUrl=/dashboard/insurance");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

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
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="saved-analyses" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("dashboard.insurance.tabs.savedAnalyses")}
          </TabsTrigger>
          <TabsTrigger value="tracked-plans" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t("dashboard.insurance.tabs.trackedPlans")}
          </TabsTrigger>
        </TabsList>

        {/* Saved Analyses Tab */}
        <TabsContent value="saved-analyses" className="space-y-4">
          {/* Search and Filter Section */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value === " " ? "" : value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Todas las prioridades</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchPolicies}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : savedPolicies.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {savedPolicies.length} {savedPolicies.length === 1 ? 'análisis guardado' : 'análisis guardados'}
                </h3>
                <div className="flex items-center gap-2">
                  {selectedForComparison.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedForComparison([]);
                      }}
                    >
                      Cancelar selección ({selectedForComparison.length})
                    </Button>
                  )}
                  {selectedForComparison.length >= 2 && (
                    <Button
                      size="sm"
                      onClick={() => setShowComparison(true)}
                      className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
                    >
                      Comparar ({selectedForComparison.length})
                    </Button>
                  )}
                  {savedPolicies.length >= 2 && selectedForComparison.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Start comparison mode
                        setSelectedForComparison([]);
                      }}
                    >
                      Comparar pólizas
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {savedPolicies.map((policy) => (
                  <SavedPoliciesCard
                    key={policy.id}
                    policy={policy}
                    onDelete={handleDeletePolicy}
                    onView={handleViewPolicy}
                    isSelected={selectedForComparison.includes(policy.id)}
                    onSelect={(id) => {
                      setSelectedForComparison(prev => 
                        prev.includes(id) 
                          ? prev.filter(p => p !== id)
                          : [...prev, id]
                      );
                    }}
                    selectionMode={selectedForComparison.length > 0 || savedPolicies.length >= 2}
                  />
                ))}
              </div>
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <CardTitle className="text-xl mb-2">
                  {t("dashboard.insurance.savedAnalyses.emptyTitle")}
                </CardTitle>
                <CardDescription className="text-center max-w-md mb-6">
                  {t("dashboard.insurance.savedAnalyses.emptyDescription")}
                </CardDescription>
                <Button 
                  onClick={() => router.push("/assistant")}
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("dashboard.insurance.savedAnalyses.analyzeButton")}
                </Button>
              </CardContent>
            </Card>
          )}
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