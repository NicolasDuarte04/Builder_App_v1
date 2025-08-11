"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface PDFUploadProps {
  onAnalysisComplete: (analysis: any) => void;
  onError: (error: string) => void;
  userId: string; // Keep this for now but we won't use it in the request
}

export function PDFUpload({ onAnalysisComplete, onError, userId }: PDFUploadProps) {
  const { data: session, status } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isScannedPDF, setIsScannedPDF] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="w-full p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Require authentication for PDF analysis
  if (!session?.user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-2xl p-8 text-center border border-blue-100 dark:border-blue-900/50">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Inicia sesión para analizar pólizas
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            Esta función está disponible solo para usuarios registrados. 
            Crea una cuenta gratis para empezar a analizar tus documentos.
          </p>
          
          <div className="flex gap-3 justify-center">
            <Link href="/login">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                Iniciar sesión
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="border-blue-200 hover:border-blue-300 dark:border-blue-800 dark:hover:border-blue-700">
                Crear cuenta
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        onError('Solo se permiten archivos PDF');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        onError('El archivo es demasiado grande. Máximo 10MB');
        return;
      }
      
      setUploadedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      if (isScannedPDF) {
        formData.append('forceOcr', 'true');
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/ai/analyze-policy', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Important: include cookies for session
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al analizar el PDF');
      }

      const result = await response.json();
      
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(uploadedFile);
      reader.onload = () => {
        const base64Data = reader.result as string;
        
        // Add a small delay to show completion
        setTimeout(() => {
          onAnalysisComplete({
            ...result.analysis,
            uploadId: result.uploadId,
            uploaderUserId: result.uploaderUserId,
            storagePath: result.storagePath,
            pdfUrl: result.pdfUrl,
            _pdfData: {
              fileName: uploadedFile.name,
              // Prefer server public url if provided; fallback to local base64 preview
              pdfUrl: result.pdfUrl || base64Data,
              rawAnalysisData: result.analysis,
              extractionMethod: result.extractionMethod,
              uploadId: result.uploadId,
              storagePath: result.storagePath,
              uploaderUserId: result.uploaderUserId,
            }
          });
          setUploadedFile(null);
          setUploadProgress(0);
          setIsUploading(false);
        }, 500);
      };

    } catch (error) {
      console.error('Upload error:', error);
      onError(error instanceof Error ? error.message : 'Error desconocido');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
    } else {
      onError('Solo se permiten archivos PDF');
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {!uploadedFile ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >

            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Subir póliza de seguro
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Arrastra tu archivo PDF aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Máximo 10MB • Solo archivos PDF
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {uploadedFile.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemoveFile}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scanned PDF toggle */}
            <div className="mb-4 flex items-center gap-2">
              <input
                id="scannedPdfToggle"
                type="checkbox"
                className="h-4 w-4"
                checked={isScannedPDF}
                onChange={(e) => setIsScannedPDF(e.target.checked)}
              />
              <label htmlFor="scannedPdfToggle" className="text-sm text-gray-700 dark:text-gray-300">
                Este es un PDF escaneado (forzar OCR)
              </label>
            </div>

            {isUploading ? (
              <div className="space-y-3">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <motion.div
                    className="bg-blue-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Analizando póliza... {uploadProgress}%
                </p>
              </div>
            ) : (
              <Button
                onClick={handleUpload}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isUploading}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Analizar póliza
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 