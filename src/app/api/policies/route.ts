import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/policies - Fetch all saved policies for logged-in user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from Supabase auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(
      session.user.email
    );

    if (authError || !authUser?.user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Fetch saved policies for the user
    const { data: policies, error } = await supabase
      .from("saved_policies")
      .select("*")
      .eq("user_id", authUser.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching policies:", error);
      return NextResponse.json(
        { error: "Failed to fetch policies" },
        { status: 500 }
      );
    }

    return NextResponse.json({ policies: policies || [] });
  } catch (error) {
    console.error("Error in GET /api/policies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/policies - Save a new analyzed policy
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from Supabase auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(
      session.user.email
    );

    if (authError || !authUser?.user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { 
      custom_name,
      insurer_name,
      policy_type,
      priority = "medium",
      pdf_base64,
      metadata = {},
      extracted_data = {}
    } = body;

    // Validate required fields
    if (!custom_name) {
      return NextResponse.json(
        { error: "Policy name is required" },
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
        const filename = `${authUser.user.id}/${Date.now()}_${custom_name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("policy-documents")
          .upload(filename, buffer, {
            contentType: "application/pdf",
            upsert: false
          });

        if (uploadError) {
          console.error("Error uploading PDF:", uploadError);
          return NextResponse.json(
            { error: "Failed to upload PDF" },
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
        return NextResponse.json(
          { error: "Failed to process PDF" },
          { status: 500 }
        );
      }
    }

    // Insert policy record
    const { data: policy, error: insertError } = await supabase
      .from("saved_policies")
      .insert({
        user_id: authUser.user.id,
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
      return NextResponse.json(
        { error: "Failed to save policy" },
        { status: 500 }
      );
    }

    return NextResponse.json({ policy });
  } catch (error) {
    console.error("Error in POST /api/policies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}