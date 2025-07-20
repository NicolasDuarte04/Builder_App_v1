'use client';

import { useEffect, useState } from 'react';

interface SchemaCheckResponse {
  success: boolean;
  availableFields: string[];
  samplePlan: any;
  totalFieldCount: number;
  databaseInfo: {
    source: string;
    totalPlansCount: number;
  };
  error?: string;
  message?: string;
}

export default function TestInsuranceSchemaPage() {
  const [data, setData] = useState<SchemaCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/test/insurance/schema-check')
      .then(res => res.json())
      .then(setData)
      .catch(err => setData({ 
        success: false, 
        error: 'Failed to fetch', 
        message: err.message,
        availableFields: [],
        samplePlan: null,
        totalFieldCount: 0,
        databaseInfo: { source: '', totalPlansCount: 0 }
      }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Loading schema check...</h1>
        </div>
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-red-600">Schema Check Failed</h1>
          <pre className="bg-red-100 dark:bg-red-900/20 p-4 rounded">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🧪 Insurance Schema Check</h1>
        
        <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded mb-6">
          <p className="text-green-800 dark:text-green-200">
            ✅ Schema check successful!
          </p>
        </div>

        <div className="grid gap-6">
          {/* Database Info */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">📊 Database Info</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-gray-600 dark:text-gray-400">Source:</dt>
                <dd className="font-medium">{data.databaseInfo.source}</dd>
              </div>
              <div>
                <dt className="text-gray-600 dark:text-gray-400">Total Plans:</dt>
                <dd className="font-medium">{data.databaseInfo.totalPlansCount}</dd>
              </div>
              <div>
                <dt className="text-gray-600 dark:text-gray-400">Total Fields:</dt>
                <dd className="font-medium">{data.totalFieldCount}</dd>
              </div>
            </dl>
          </div>

          {/* Available Fields */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🔍 Available Fields ({data.availableFields.length})</h2>
            <div className="grid grid-cols-3 gap-2">
              {data.availableFields.map(field => (
                <code key={field} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
                  {field}
                </code>
              ))}
            </div>
          </div>

          {/* Sample Plan */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">📋 Sample Plan</h2>
            <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-x-auto text-sm">
              {JSON.stringify(data.samplePlan, null, 2)}
            </pre>
          </div>

          {/* Raw Response */}
          <details className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <summary className="cursor-pointer font-semibold">🔧 Raw API Response</summary>
            <pre className="mt-4 bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-x-auto text-sm">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
} 