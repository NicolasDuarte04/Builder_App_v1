import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAuthUserIdByEmail(email: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) return null;
    const match = data.users.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
    return match?.id ?? null;
  } catch {
    return null;
  }
}

// GET /api/policies/[id] - Get a specific saved policy
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const authUserId = (session.user as any)?.email ? await getAuthUserIdByEmail((session.user as any).email) : null;
    if (!authUserId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { data: policy, error } = await supabase
      .from("saved_policies")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", authUserId)
      .single();

    if (error || !policy) {
      return NextResponse.json(
        { error: "Póliza no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ policy });
  } catch (error) {
    console.error("Error in GET /api/policies/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE /api/policies/[id] - Delete a saved policy
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const authUserId = (session.user as any)?.email ? await getAuthUserIdByEmail((session.user as any).email) : null;
    if (!authUserId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // First, get the policy to check ownership and get storage path
    const { data: policy, error: fetchError } = await supabase
      .from("saved_policies")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", authUserId)
      .single();

    if (fetchError || !policy) {
      return NextResponse.json(
        { error: "Póliza no encontrada" },
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
      .eq("user_id", authUserId);

    if (deleteError) {
      console.error("Error deleting policy:", deleteError);
      return NextResponse.json(
        { error: "Error al eliminar la póliza" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Póliza eliminada exitosamente" 
    });
  } catch (error) {
    console.error("Error in DELETE /api/policies/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PATCH /api/policies/[id] - Update basic fields (rename, metadata, analysis)
const UpdateSchema = z.object({
  custom_name: z.string().min(1).optional(),
  metadata: z.record(z.any()).optional(),
  analysis: z.record(z.any()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const authUserId = await getAuthUserIdByEmail((session.user as any).email);
    if (!authUserId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const update: any = {};
    if (parsed.data.custom_name !== undefined) update.custom_name = parsed.data.custom_name;
    if (parsed.data.metadata !== undefined) update.metadata = parsed.data.metadata;
    if (parsed.data.analysis !== undefined) update.analysis = parsed.data.analysis;

    const { data, error } = await supabase
      .from('saved_policies')
      .update(update)
      .eq('id', params.id)
      .eq('user_id', authUserId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }
    return NextResponse.json({ policy: data });
  } catch (e) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}