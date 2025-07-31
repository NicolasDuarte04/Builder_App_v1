"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Shield, Plus, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SavedPoliciesCard } from "@/components/dashboard/SavedPoliciesCard";
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

  // Fetch saved policies
  const fetchPolicies = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch("/api/policies");
      
      if (!response.ok) {
        throw new Error("Failed to fetch policies");
      }

      const data = await response.json();
      setSavedPolicies(data.policies || []);
    } catch (error) {
      console.error("Error fetching policies:", error);
      toast({
        title: "Error",
        description: "Failed to load saved policies",
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
        title: "Success",
        description: "Policy deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting policy:", error);
      toast({
        title: "Error",
        description: "Failed to delete policy",
        variant: "destructive",
      });
    }
  };

  // View policy details
  const handleViewPolicy = (policy: SavedPolicy) => {
    // TODO: Implement policy detail view
    console.log("View policy:", policy);
  };

  // Load policies on component mount
  useEffect(() => {
    fetchPolicies();
  }, []);

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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : savedPolicies.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {savedPolicies.length} {savedPolicies.length === 1 ? 'policy' : 'policies'} saved
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPolicies}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {savedPolicies.map((policy) => (
                  <SavedPoliciesCard
                    key={policy.id}
                    policy={policy}
                    onDelete={handleDeletePolicy}
                    onView={handleViewPolicy}
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
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("dashboard.insurance.trackedPlans.addButton")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}