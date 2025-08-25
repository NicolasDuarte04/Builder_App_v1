"use client";

import { useState, useEffect } from 'react';
import { Info, Copy, Check, RefreshCw } from 'lucide-react';

interface BuildInfo {
  buildId: string;
  commitSha: string;
  branch: string;
  environment: string;
  timestamp: string;
  userAgent: string;
  url: string;
}

export default function BuildDiagnostics() {
  const [isVisible, setIsVisible] = useState(false);
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Only show in development or when explicitly enabled
    const shouldShow = process.env.NODE_ENV === 'development' || 
                      process.env.NEXT_PUBLIC_SHOW_DIAGNOSTICS === 'true';
    
    if (!shouldShow) return;

    const info: BuildInfo = {
      buildId: process.env.NEXT_PUBLIC_BUILD_ID || 
               process.env.VERCEL_GIT_COMMIT_SHA || 
               document.querySelector('meta[name="build-id"]')?.getAttribute('content') ||
               'unknown',
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
      branch: process.env.VERCEL_GIT_COMMIT_REF || 'local',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    setBuildInfo(info);
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const refreshPage = () => {
    window.location.reload();
  };

  if (!buildInfo) return null;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 left-4 z-40 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        title="Build Diagnostics"
      >
        <Info className="w-4 h-4" />
      </button>

      {/* Diagnostic panel */}
      {isVisible && (
        <div className="fixed bottom-16 left-4 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 max-w-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Build Diagnostics
            </h3>
            <button
              onClick={refreshPage}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Refresh page"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Build ID:</span>
              <div className="flex items-center gap-1">
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">
                  {buildInfo.buildId.slice(0, 8)}...
                </code>
                <button
                  onClick={() => copyToClipboard(buildInfo.buildId)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Copy build ID"
                >
                  {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Commit:</span>
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">
                {buildInfo.commitSha.slice(0, 8)}...
              </code>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Branch:</span>
              <span className="text-gray-900 dark:text-gray-100">{buildInfo.branch}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Environment:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                buildInfo.environment === 'production' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
              }`}>
                {buildInfo.environment}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Timestamp:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {new Date(buildInfo.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => copyToClipboard(JSON.stringify(buildInfo, null, 2))}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy All Info
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    console.log('[BuildDiagnostics] Build info:', buildInfo);
                    console.log('[BuildDiagnostics] Current chunks:', 
                      Array.from(document.querySelectorAll('script[src*="/_next/static/chunks/"]'))
                        .map(script => (script as HTMLScriptElement).src)
                    );
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                >
                  Log to Console
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
