"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
  retryCount: number;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isChunkError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const isChunkError = this.isChunkLoadingError(error);
    return {
      hasError: true,
      error,
      isChunkError,
      retryCount: 0,
    };
  }

  private static isChunkLoadingError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('loading chunk') ||
      message.includes('chunkloaderror') ||
      message.includes('failed to load resource') ||
      message.includes('network error')
    );
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ChunkErrorBoundary] Error caught:', error, errorInfo);
    
    // Log to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // You can add error reporting service here
      console.error('[ChunkErrorBoundary] Production error:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    }
  }

  private handleRetry = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;
    
    if (retryCount < maxRetries) {
      this.setState(prev => ({ retryCount: prev.retryCount + 1 }));
      
      // Wait before retrying
      setTimeout(() => {
        console.log(`[ChunkErrorBoundary] Retrying (${retryCount + 1}/${maxRetries})`);
        this.setState({ hasError: false, error: null });
      }, 1000 * (retryCount + 1));
    } else {
      // Force full page reload after max retries
      console.log('[ChunkErrorBoundary] Max retries reached, forcing reload');
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleForceReload = () => {
    // Clear any cached data and reload
    if (typeof window !== 'undefined') {
      // Clear session storage
      sessionStorage.clear();
      // Clear any service worker caches if they exist
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
          });
        });
      }
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const { error, isChunkError, retryCount } = this.state;
      const maxRetries = 3;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <div className="mb-6 flex justify-center">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {isChunkError ? 'Error de Carga' : 'Error de Aplicación'}
            </h1>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {isChunkError 
                ? 'La aplicación encontró un problema al cargar algunos componentes. Esto suele ocurrir después de una actualización.'
                : 'Ocurrió un error inesperado en la aplicación.'
              }
            </p>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  Detalles del error (solo desarrollo)
                </summary>
                <pre className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-auto">
                  {error.message}
                </pre>
              </details>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                disabled={retryCount >= maxRetries}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {retryCount >= maxRetries ? 'Reintentos agotados' : `Reintentar (${retryCount + 1}/${maxRetries})`}
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <Home className="w-4 h-4" />
                Ir al Inicio
              </button>

              <button
                onClick={this.handleForceReload}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Recargar Página
              </button>
            </div>

            {isChunkError && (
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Si el problema persiste, intenta cerrar y abrir la pestaña del navegador.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
