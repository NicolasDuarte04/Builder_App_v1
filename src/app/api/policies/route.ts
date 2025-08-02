import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schema for save policy request
const SavePolicySchema = z.object({
  custom_name: z.string().min(1).max(255),
  insurer_name: z.string().optional(),
  policy_type: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  pdf_base64: z.string().optional(),
  metadata: z.record(z.any()).default({}),
  extracted_data: z.record(z.any()).default({})
});

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

    // Build query
    let query = supabase
      .from("saved_policies")
      .select("*", { count: 'exact' })
      .eq("user_id", session.user.id)
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
  } catch (error) {
    console.error("Error in GET /api/policies:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST /api/policies - Save a new analyzed policy
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
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
      pdf_base64,
      metadata,
      extracted_data
    } = validatedData;

    // Check if user already has a policy with the same name
    const { data: existingPolicy } = await supabase
      .from("saved_policies")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("custom_name", custom_name)
      .single();

    if (existingPolicy) {
      return NextResponse.json(
        { error: "Ya tienes un análisis guardado con ese nombre" },
        { status: 400 }
      );
    }

    let storage_path = null;
    let pdf_url = null;

    // If PDF is provided, upload to Supabase Storage
    if (pdf_base64) {
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
          // In development, expose detailed error
          const isDevelopment = process.env.NODE_ENV === 'development';
          return NextResponse.json(
            { 
              error: "Failed to upload PDF",
              details: isDevelopment ? {
                message: uploadError.message,
                statusCode: uploadError.statusCode,
                hint: "Check if 'policy-documents' storage bucket exists and has proper permissions"
              } : undefined
            },
            { status: 500 }
          );
        }

        storage_path = uploadData.path;
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from("policy-documents")
          .getPublicUrl(storage_path);
        
        pdf_url = urlData.publicUrl;
      } catch (uploadError) {
        console.error("Error processing PDF upload:", uploadError);
        const isDevelopment = process.env.NODE_ENV === 'development';
        return NextResponse.json(
          { 
            error: "Failed to process PDF",
            details: isDevelopment ? {
              message: uploadError instanceof Error ? uploadError.message : String(uploadError)
            } : undefined
          },
          { status: 500 }
        );
      }
    }

    // Insert policy record
    const { data: policy, error: insertError } = await supabase
      .from("saved_policies")
      .insert({
        user_id: session.user.id,
        custom_name,
        insurer_name,
        policy_type,
        priority,
        pdf_url,
        storage_path,
        metadata,
        extracted_data
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting policy:", insertError);
      const isDevelopment = process.env.NODE_ENV === 'development';
      return NextResponse.json(
        { 
          error: "Error al guardar la póliza",
          details: isDevelopment ? {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint || "Check if saved_policies table exists and schema matches"
          } : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      policy,
      message: "Análisis guardado exitosamente"
    });
  } catch (error) {
    console.error("Error in POST /api/policies:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}