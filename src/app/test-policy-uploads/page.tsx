"use client";

import React, { useState } from 'react';
import { PDFUpload } from '@/components/assistant/PDFUpload';
import { PolicyHistory } from '@/components/assistant/PolicyHistory';
import { PolicyAnalysisDisplay } from '@/components/assistant/PolicyAnalysisDisplay';

export default function TestPolicyUploads() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [userId] = useState('test-user-123');

  const handleAnalysisComplete = (analysisData: any) => {
    console.log('Analysis completed:', analysisData);
    setAnalysis(analysisData);
  };

  const handleAnalysisError = (error: string) => {
    console.error('Analysis error:', error);
    alert(`Error: ${error}`);
  };

  const handleViewAnalysis = (analysisData: any) => {
    setAnalysis(analysisData);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Test Policy Uploads
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing PDF policy upload and analysis with Supabase integration
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Upload New Policy
            </h2>
            <PDFUpload
              onAnalysisComplete={handleAnalysisComplete}
              onError={handleAnalysisError}
              userId={userId}
            />
          </div>

          {/* History Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Policy History
            </h2>
            <PolicyHistory
              userId={userId}
              onViewAnalysis={handleViewAnalysis}
            />
          </div>
        </div>

        {/* Analysis Display */}
        {analysis && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Policy Analysis
            </h2>
            <PolicyAnalysisDisplay analysis={analysis} />
          </div>
        )}

        {/* Debug Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Debug Information
          </h2>
          <div className="space-y-2 text-sm">
            <p><strong>User ID:</strong> {userId}</p>
            <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
            <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set'}</p>
            <p><strong>Supabase Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 