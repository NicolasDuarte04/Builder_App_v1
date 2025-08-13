"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Clock, CheckCircle, AlertCircle, Trash2, Eye } from 'lucide-react';
import { PolicyUpload, getPolicyUploadsByUser, deletePolicyUpload } from '@/lib/supabase-policy';
import { Button } from '../ui/button';

interface PolicyHistoryProps {
  userId: string;
  onViewAnalysis: (analysis: any) => void;
}

export function PolicyHistory({ userId, onViewAnalysis }: PolicyHistoryProps) {
  const [uploads, setUploads] = useState<PolicyUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId && userId !== '') {
      loadUploads();
    } else {
      setLoading(false);
      setUploads([]);
    }
  }, [userId]);

  const loadUploads = async () => {
    if (!userId || userId === '') {
      console.log('⚠️ No valid user ID, skipping policy history load');
      setUploads([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('📂 Loading policy uploads for user:', userId);
      const userUploads = await getPolicyUploadsByUser(userId);
      setUploads(userUploads);
      console.log('✅ Loaded uploads:', userUploads.length);
    } catch (err) {
      setError('Failed to load policy history');
      console.error('Error loading uploads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const success = await deletePolicyUpload(id);
      if (success) {
        setUploads(prev => prev.filter(upload => upload.id !== id));
      }
    } catch (err) {
      console.error('Error deleting upload:', err);
    }
  };

  const handleViewAnalysis = (upload: PolicyUpload) => {
    if (upload.ai_summary) {
      try {
        const analysis = JSON.parse(upload.ai_summary);
        onViewAnalysis(analysis);
      } catch (err) {
        console.error('Error parsing analysis:', err);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'error':
        return 'Error';
      case 'processing':
        return 'Procesando';
      case 'uploading':
        return 'Subiendo';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Silently suppress history load errors in the PDF modal.
  // If there's an error, don't render an error banner; simply render nothing here.
  if (error) {
    return null;
  }

  if (uploads.length === 0) {
    return (
      <div className="text-center p-8">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No hay pólizas subidas
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Sube tu primera póliza de seguro para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Historial de Pólizas
      </h3>
      
      <div className="space-y-3">
        <AnimatePresence>
          {uploads.map((upload, index) => (
            <motion.div
              key={upload.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {upload.file_name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(upload.upload_time)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {getStatusIcon(upload.status)}
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {getStatusText(upload.status)}
                    </span>
                  </div>
                  
                  {upload.status === 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewAnalysis(upload)}
                      className="h-8 px-2"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Ver
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(upload.id)}
                    className="h-8 px-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              {upload.error_message && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-400">
                  {upload.error_message}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
} 