import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["radar_found", "strategy_review", "approved_for_content", "rejected", null] as const;
type WorkflowStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  let body: { workflow_status: WorkflowStatus };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  const { workflow_status } = body;
  if (!VALID_STATUSES.includes(workflow_status)) {
    return NextResponse.json(
      { error: `workflow_status ต้องเป็น: ${VALID_STATUSES.filter(Boolean).join(", ")} หรือ null` },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({ workflow_status })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id, workflow_status });
}
