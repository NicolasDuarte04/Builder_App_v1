import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// DELETE /api/policies/[id] - Delete a saved policy
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // First, get the policy to check ownership and get storage path
    const { data: policy, error: fetchError } = await supabase
      .from("saved_policies")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", authUser.user.id)
      .single();

    if (fetchError || !policy) {
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404 }
      );
    }

    // Delete from storage if exists
    if (policy.storage_path) {
      const { error: storageError } = await supabase.storage
        .from("policy-documents")
        .remove([policy.storage_path]);

      if (storageError) {
        console.error("Error deleting from storage:", storageError);
        // Continue with deletion even if storage fails
      }
    }

    // Delete the policy record
    const { error: deleteError } = await supabase
      .from("saved_policies")
      .delete()
      .eq("id", params.id)
      .eq("user_id", authUser.user.id);

    if (deleteError) {
      console.error("Error deleting policy:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete policy" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/policies/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}