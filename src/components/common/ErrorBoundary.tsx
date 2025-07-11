"use client";

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div className="h-[600px] flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="mb-4 flex justify-center">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Unable to Display Roadmap
            </h3>
            
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
              The roadmap visualization encountered an error. You can try refreshing or switch to the checklist view.
            </p>
            
            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              
              {/* The parent component should handle switching to checklist view */}
              <Button
                onClick={() => window.location.reload()}
                variant="default"
                size="sm"
              >
                Reload Page
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-neutral-500 cursor-pointer">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs text-red-600 dark:text-red-400 overflow-auto p-2 bg-neutral-100 dark:bg-neutral-900 rounded">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 