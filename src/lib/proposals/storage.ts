import { createServerSupabaseClient } from '@/lib/supabase-server';
import crypto from 'crypto';

export class StorageError extends Error {
  constructor(
    message: string,
    public code: 'storage_init_failed' | 'storage_upload_failed',
    public originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export interface ProposalStorageResult {
  path: string;
  url: string | null;
  urlKind: 'signed' | 'public' | 'none';
}

async function ensureBucketExists(supabase: any, bucketName: string): Promise<void> {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      throw new StorageError(
        `Failed to list storage buckets: ${listError.message}`,
        'storage_init_failed',
        listError
      );
    }

    const bucketExists = buckets.some((bucket: any) => bucket.name === bucketName);
    
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: false,
        allowedMimeTypes: ['application/pdf'],
        fileSizeLimit: 52428800 // 50MB
      });

      if (createError) {
        throw new StorageError(
          `Failed to create storage bucket '${bucketName}': ${createError.message}`,
          'storage_init_failed',
          createError
        );
      }
    }
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(
      `Unexpected error initializing storage: ${error instanceof Error ? error.message : String(error)}`,
      'storage_init_failed',
      error instanceof Error ? error : undefined
    );
  }
}

export async function uploadProposal(buffer: Buffer): Promise<ProposalStorageResult> {
  // Dev fallback: if Supabase env is missing, return a data URL
  const missingEnv = !process.env.NEXT_PUBLIC_SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY && !process.env.SERVICE_ROLE_KEY);
  if (process.env.NODE_ENV !== 'production' && missingEnv) {
    try {
      const base64 = buffer.toString('base64');
      const dataUrl = `data:application/pdf;base64,${base64}`;
      return { path: 'memory://dev.pdf', url: dataUrl, urlKind: 'none' };
    } catch (e) {
      // Fall through to attempt supabase if conversion somehow fails
    }
  }

  const supabase = createServerSupabaseClient();
  
  // Determine bucket name and TTL
  const bucketName = process.env.PROPOSALS_BUCKET || 'documents';
  const signedUrlTTL = parseInt(process.env.PROPOSALS_SIGNED_TTL_SECS || '7200', 10);
  
  // Ensure bucket exists
  await ensureBucketExists(supabase, bucketName);
  
  // Generate unique filename
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  const filename = `proposals/${timestamp}-${uuid}.pdf`;
  
  try {
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filename, buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      throw new StorageError(
        `Failed to upload proposal to '${bucketName}/${filename}': ${uploadError.message}`,
        'storage_upload_failed',
        uploadError
      );
    }
    
    // Try to create a signed URL first
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filename, signedUrlTTL);
    
    if (!signedUrlError && signedUrlData?.signedUrl) {
      return {
        path: filename,
        url: signedUrlData.signedUrl,
        urlKind: 'signed'
      };
    }
    
    // Fall back to public URL if signed URL failed
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filename);
    
    const publicUrl = publicUrlData?.publicUrl || null;
    return {
      path: filename,
      url: publicUrl,
      urlKind: publicUrl ? 'public' : 'none'
    };
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(
      `Unexpected error uploading proposal: ${error instanceof Error ? error.message : String(error)}`,
      'storage_upload_failed',
      error instanceof Error ? error : undefined
    );
  }
}
