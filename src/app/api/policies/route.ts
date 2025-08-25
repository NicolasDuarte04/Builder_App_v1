import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { inferStoragePathFromUrl } from '@/lib/storage';

// Force Node.js runtime for NextAuth/Supabase compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schema for save policy request (final)
const SavePolicySchema = z.object({
  custom_name: z.string(),
  insurer_name: z.string().optional(),
  policy_type: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),

  // Preferred reuse of analyzer artifacts
  upload_id: z.string().uuid().optional(),
  pdf_url: z.string().url().optional(),
  storage_path: z.string().optional(),

  // Legacy path (only when truly raw base64 is sent)
  pdf_base64: z.string().optional(),

  // New structured analysis payload
  analysis: z.record(z.any()).optional(),

  // Alternative naming accepted (mapped in handler)
  fileUrl: z.string().url().optional(),
  title: z.string().optional(),

  metadata: z.record(z.any()).default({}),
  extracted_data: z.record(z.any()).default({})
});

async function getAuthUserIdByEmail(email: string): Promise<string | null> {
  try {
    // listUsers paginates; for our small preview env, first page is fine
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) {
      console.error('[policies] admin.listUsers error', error);
      return null;
    }
    const match = data.users.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
    return match?.id ?? null;
  } catch (e) {
    console.error('[policies] getAuthUserIdByEmail exception', e);
    return null;
  }
}

// GET /api/policies - Fetch all saved policies for logged-in user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Parse query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Resolve Supabase auth user id corresponding to this app user (by email)
    const authUserId = session.user.email ? await getAuthUserIdByEmail(session.user.email) : null;
    if (!authUserId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Build query (filter by Supabase auth user id)
    let query = supabase
      .from("saved_policies")
      .select("*", { count: 'exact' })
      .eq("user_id", authUserId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply search filter
    if (search) {
      query = query.or(`custom_name.ilike.%${search}%,insurer_name.ilike.%${search}%`);
    }

    // Apply priority filter
    if (priority && ['low', 'medium', 'high'].includes(priority)) {
      query = query.eq('priority', priority);
    }

    const { data: policies, error, count } = await query;

    if (error) {
      console.error("Error fetching policies:", error);
      return NextResponse.json(
        { error: "Error al obtener las pólizas guardadas" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      policies: policies || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (error: any) {
    console.error("[policies GET] error:", error);
    return NextResponse.json(
      { error: "internal", where: "policies-get", message: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}

// POST /api/policies - Save a new analyzed policy
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[policies] session.user.id:', (session as any)?.user?.id);
    }

    if (!session?.user?.id) {
      console.log('[policies] No valid session found - returning 401');
      return NextResponse.json(
        { error: "unauthorized", message: "Sign in required to save policies", where: "session-check" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    if (process.env.NODE_ENV !== 'production') {
      console.log('[policies] body keys:', Object.keys(body || {}));
    }
    let validatedData;
    
    try {
      validatedData = SavePolicySchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error("Validation error:", validationError.errors);
        return NextResponse.json(
          { error: "Datos inválidos", details: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }

    const { 
      custom_name,
      insurer_name,
      policy_type,
      priority,
      upload_id,
      pdf_url: providedPdfUrl,
      storage_path: providedStoragePath,
      pdf_base64,
      fileUrl,
      title,
      analysis,
      metadata,
      extracted_data
    } = validatedData;

    // Map NextAuth user to Supabase auth user id via email
    const email = (session.user as any)?.email;
    if (!email) {
      return NextResponse.json({ error: 'unauthorized', message: 'Missing email in session' }, { status: 401 });
    }
    let authUserId = await getAuthUserIdByEmail(email);
    if (!authUserId) {
      // Create a corresponding auth user to satisfy FK (preview-friendly). Email confirmed to avoid invites.
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({ email, email_confirm: true });
      if (createErr || !created?.user?.id) {
        console.error('[policies.save] create auth user failed', createErr);
        return NextResponse.json({ error: 'auth_user_missing' }, { status: 401 });
      }
      authUserId = created.user.id;
    }

    // Check if user already has a policy with the same name
    const { data: existingPolicy } = await supabase
      .from("saved_policies")
      .select("id")
      .eq("user_id", authUserId)
      .eq("custom_name", custom_name)
      .single();

    if (existingPolicy) {
      return NextResponse.json(
        { error: "Ya tienes un análisis guardado con ese nombre" },
        { status: 400 }
      );
    }

    let storage_path: string | null = null;
    let pdf_url: string | null = null;

    // DEV log of keys
    if (process.env.NODE_ENV !== 'production') {
      console.log('[policies] keys(validated):', Object.keys(validatedData));
    }

    // Case 1: upload_id preferred
    if (upload_id) {
      const serverSupabase = createServerSupabaseClient();
      const { data: uploadRow, error: uploadErr } = await serverSupabase
        .from('policy_uploads')
        .select('id,user_id,storage_path,pdf_url')
        .eq('id', upload_id)
        .single();

      if (uploadErr && uploadErr.code === 'PGRST116') {
        return NextResponse.json({ error: 'upload_not_found', where: 'lookup' }, { status: 404 });
      }
      if (uploadErr || !uploadRow) {
        const details = { where: 'lookup', code: uploadErr?.code, message: uploadErr?.message };
        console.error('[policies] lookup error:', details);
        return NextResponse.json({ error: 'upload_not_found', ...details }, { status: 404 });
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('[policies] lookup result:', { found: !!uploadRow, user_id: uploadRow.user_id, storage_path: uploadRow.storage_path });
      }

      if (uploadRow.user_id !== session.user.id) {
        return NextResponse.json(
          { error: 'upload_not_owned', hint: 'Sign in with the original account or re-analyze.', uploadUserId: uploadRow.user_id, sessionUserId: session.user.id },
          { status: 409 }
        );
      }
      storage_path = uploadRow.storage_path || null;
      // Mint fresh signed URL
      if (storage_path) {
        try {
          const { data: signed } = await serverSupabase.storage
            .from('policy-documents')
            .createSignedUrl(storage_path, 60 * 60 * 24 * 30);
          pdf_url = signed?.signedUrl || uploadRow.pdf_url;
          if (process.env.NODE_ENV !== 'production') {
            console.log('[policies] sign result:', { ok: !!signed?.signedUrl });
          }
        } catch (e: any) {
          console.warn('[policies] sign error, using existing pdf_url', e?.message);
          pdf_url = uploadRow.pdf_url;
          if (process.env.NODE_ENV !== 'production') {
            console.log('[policies] sign result:', { ok: false, error: e?.message });
          }
          if (!pdf_url) {
            return NextResponse.json(
              { where: 'sign', error: 'Failed to sign URL and no fallback url available', message: e?.message, code: e?.code },
              { status: 502 }
            );
          }
        }
      } else {
        pdf_url = uploadRow.pdf_url;
        if (!pdf_url) {
          return NextResponse.json(
            { where: 'lookup', error: 'Upload has no storage_path or pdf_url' },
            { status: 404 }
          );
        }
      }
    }

    // Case 2: provided pdf_url + storage_path (fallback)
    if (!pdf_url && (providedPdfUrl || providedStoragePath)) {
      const serverSupabase = createServerSupabaseClient();
      if (providedStoragePath) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[policies] saving with storage_path without upload_id');
        }
        storage_path = providedStoragePath;
        try {
          const { data: signed } = await serverSupabase.storage
            .from('policy-documents')
            .createSignedUrl(storage_path, 60 * 60 * 24 * 30);
          pdf_url = signed?.signedUrl || providedPdfUrl || null;
          if (process.env.NODE_ENV !== 'production') {
            console.log('[policies] sign result:', { ok: !!signed?.signedUrl });
          }
        } catch (e: any) {
          console.warn('[policies] sign error from provided storage_path', e?.message);
          pdf_url = providedPdfUrl || null;
          if (process.env.NODE_ENV !== 'production') {
            console.log('[policies] sign result:', { ok: false, error: e?.message });
          }
          if (!pdf_url) {
            return NextResponse.json(
              { where: 'sign', error: 'Failed to sign URL from storage_path and no pdf_url provided', message: e?.message, code: e?.code },
              { status: 502 }
            );
          }
        }
      } else {
        // No storage path, just use provided URL
        pdf_url = providedPdfUrl || null;
        const inferred = providedPdfUrl ? inferStoragePathFromUrl(providedPdfUrl) : null;
        if (inferred) {
          storage_path = inferred;
        }
      }
    }

    // Case 2b: alternative fileUrl field
    if (!pdf_url && fileUrl) {
      pdf_url = fileUrl;
      const inferred = inferStoragePathFromUrl(fileUrl);
      if (inferred) {
        storage_path = inferred;
      }
    }

    // Case 3: legacy pdf_base64
    if (!pdf_url && pdf_base64) {
      // Validate it looks like a data URL for PDFs
      if (!/^data:application\/pdf;base64,/i.test(pdf_base64) && !/^https?:\/\//i.test(pdf_base64)) {
        return NextResponse.json({ error: 'invalid_pdf_base64' }, { status: 400 });
      }
      // Reject if this is actually a URL string
      if (/^https?:\/\//i.test(pdf_base64)) {
        // Treat as pdf_url guardrail
        const asUrl = pdf_base64;
        const inferred = inferStoragePathFromUrl(asUrl);
        if (inferred) {
          storage_path = inferred;
        }
        pdf_url = asUrl;
      } else {
      try {
        // Convert base64 to buffer
        const base64Data = pdf_base64.replace(/^data:application\/pdf;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        
        // Generate unique filename
        const filename = `${session.user.id}/${Date.now()}_${custom_name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("policy-documents")
          .upload(filename, buffer, {
            contentType: "application/pdf",
            upsert: false
          });

        if (uploadError) {
          console.error("Error uploading PDF:", uploadError);
          const code = (uploadError as any)?.statusCode ?? (uploadError as any)?.code ?? 'storage_upload_error';
          const message = (uploadError as any)?.message ?? 'Unknown storage error';
          return NextResponse.json(
            { where: 'upload', error: 'Failed to upload PDF', code, message },
            { status: 502 }
          );
        }

        storage_path = uploadData.path as string;
        // Prefer signed URL, fallback to public
        try {
          const { data: signed } = await supabase.storage
            .from('policy-documents')
            .createSignedUrl(storage_path, 60 * 60);
          pdf_url = signed?.signedUrl ?? null;
        } catch {
          const { data: urlData } = supabase.storage
            .from('policy-documents')
            .getPublicUrl(storage_path);
          pdf_url = urlData.publicUrl;
        }
      } catch (uploadError) {
        console.error("Error processing PDF upload:", uploadError);
        return NextResponse.json(
          { where: 'upload', error: 'Failed to process PDF', message: uploadError instanceof Error ? uploadError.message : String(uploadError) },
          { status: 502 }
        );
      }
      }
    }

    // Guard: must have at least one of the identifiers resolved or a url
    if (!storage_path && !pdf_url) {
      console.error({ where: 'missing_identifiers', message: 'Missing upload_id | storage_path | pdf_base64' });
      return NextResponse.json(
        { error: 'Missing upload_id | storage_path | pdf_base64' },
        { status: 400 }
      );
    }

    // Normalize payload to current schema (no 'analysis' column in some envs)
    const extracted_data_normalized = (extracted_data && Object.keys(extracted_data).length > 0)
      ? extracted_data
      : (analysis && Object.keys(analysis || {}).length > 0)
        ? analysis
        : null;

    // Insert policy record (omit 'analysis' column)
    const { data: policy, error: insertError } = await supabase
      .from("saved_policies")
      .insert({
        user_id: authUserId,
        custom_name: title || custom_name,
        insurer_name,
        policy_type,
        priority,
        pdf_url,
        storage_path,
        metadata,
        extracted_data: extracted_data_normalized || {}
      })
      .select()
      .single();

    if (insertError) {
      console.error("[policies.save] insert error (full payload)", { code: insertError.code, message: insertError.message });
      // Fallback: insert minimal shape for DBs missing JSON columns (preview envs)
      const { data: policy2, error: insertError2 } = await supabase
        .from('saved_policies')
        .insert({
          user_id: authUserId,
          custom_name: title || custom_name,
          insurer_name,
          policy_type,
          priority,
          pdf_url,
          storage_path,
        })
        .select()
        .single();
      if (insertError2) {
        console.error('[policies.save] minimal insert failed', { code: insertError2.code, message: insertError2.message });
        return NextResponse.json(
          { where: 'insert', error: 'Error al guardar la póliza', code: insertError2.code, message: insertError2.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ id: policy2.id, pdf_url: policy2.pdf_url, saved: true, signed: !!policy2.pdf_url, message: "Análisis guardado exitosamente" });
    }

    return NextResponse.json({ id: policy.id, pdf_url: policy.pdf_url, saved: true, signed: !!policy.pdf_url, message: "Análisis guardado exitosamente" });
  } catch (error: any) {
    console.error("[policies POST] error:", error);
    return NextResponse.json(
      { error: 'internal', where: 'policies-post', message: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}