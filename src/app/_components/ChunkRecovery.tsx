"use client";

import { useEffect, useState } from "react";
import { serviceWorkerManager } from "@/lib/serviceWorker";

const RELOAD_FLAG = "__briki_chunk_reloaded__";
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

export default function ChunkRecovery() {
  const [retryCount, setRetryCount] = useState(0);
  const [isReloading, setIsReloading] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Listen for service worker updates
    const handleUpdateAvailable = () => {
      setIsUpdateAvailable(true);
    };

    serviceWorkerManager.onUpdateAvailable(handleUpdateAvailable);

    const getBuildId = () => {
      // Try to get build ID from various sources
      const buildId = 
        process.env.NEXT_PUBLIC_BUILD_ID ||
        process.env.VERCEL_GIT_COMMIT_SHA ||
        document.querySelector('meta[name="build-id"]')?.getAttribute('content') ||
        Date.now().toString();
      return buildId;
    };

    const reloadWithBuildId = () => {
      if (isReloading) return;
      setIsReloading(true);

      const buildId = getBuildId();
      const url = new URL(window.location.href);
      
      // Add build ID and timestamp to force fresh load
      url.searchParams.set("_b", buildId);
      url.searchParams.set("_t", Date.now().toString());
      
      // Clear any existing cache-busting params
      url.searchParams.delete("_v");
      
      console.log(`[ChunkRecovery] Reloading with build ID: ${buildId}`);
      
      // Use replace to avoid adding to history
      window.location.replace(url.toString());
    };

    const handleChunkError = (error: any) => {
      const errorMessage = String(error?.message || error?.reason || "").toLowerCase();
      
      if (errorMessage.includes("loading chunk") || 
          errorMessage.includes("chunkloaderror") ||
          errorMessage.includes("failed to load resource")) {
        
        console.warn(`[ChunkRecovery] Chunk loading error detected:`, errorMessage);
        
        if (retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1);
          
          // Wait before retrying
          setTimeout(() => {
            console.log(`[ChunkRecovery] Retrying chunk load (${retryCount + 1}/${MAX_RETRIES})`);
            reloadWithBuildId();
          }, RETRY_DELAY * (retryCount + 1));
        } else {
          // Final attempt - force full reload
          console.error(`[ChunkRecovery] Max retries reached, forcing full reload`);
          window.location.reload();
        }
      }
    };

    const onWindowError = (e: ErrorEvent) => {
      handleChunkError(e);
    };

    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      try {
        handleChunkError(e.reason);
      } catch {
        // no-op
      }
    };

    // Listen for chunk loading errors
    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    // Also listen for network errors that might indicate chunk issues
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      return originalFetch.apply(this, args).catch(error => {
        if (error.message.includes("Failed to fetch") || 
            error.message.includes("NetworkError")) {
          console.warn(`[ChunkRecovery] Network error detected:`, error.message);
        }
        throw error;
      });
    };

    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.fetch = originalFetch;
      serviceWorkerManager.offUpdateAvailable(handleUpdateAvailable);
    };
  }, [retryCount, isReloading]);

  const handleApplyUpdate = async () => {
    try {
      await serviceWorkerManager.applyUpdate();
    } catch (error) {
      console.error('[ChunkRecovery] Failed to apply update:', error);
      // Fallback to manual reload
      window.location.reload();
    }
  };

  const handleClearCache = async () => {
    try {
      await serviceWorkerManager.clearCaches();
      // Reload after clearing cache
      window.location.reload();
    } catch (error) {
      console.error('[ChunkRecovery] Failed to clear cache:', error);
    }
  };

  // Show update notification if available
  if (isUpdateAvailable && !isReloading) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-sm">🔄</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Nueva versión disponible</p>
            <p className="text-xs opacity-90">La aplicación se actualizará automáticamente</p>
          </div>
          <button
            onClick={handleApplyUpdate}
            className="flex-shrink-0 bg-white/20 hover:bg-white/30 rounded px-2 py-1 text-xs transition-colors"
          >
            Actualizar
          </button>
        </div>
      </div>
    );
  }

  // Show loading indicator if we're in the process of reloading
  if (isReloading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Actualizando aplicación...
          </p>
          <button
            onClick={handleClearCache}
            className="mt-4 text-xs text-blue-600 hover:text-blue-700 underline"
          >
            Limpiar caché si persiste el problema
          </button>
        </div>
      </div>
    );
  }

  return null;
}


