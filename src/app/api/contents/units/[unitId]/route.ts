import { NextResponse, type NextRequest } from "next/server";
import { updateUnit, deleteUnit } from "@/lib/db/contents";
import { requireTeacher } from "@/lib/api/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const { unitId } = await params;
  const body = (await request.json()) as { name: string };
  if (!body.name?.trim()) {
    return NextResponse.json(
      { data: null, error: "name is required" },
      { status: 400 }
    );
  }

  const ok = await updateUnit(unitId, body.name.trim());
  if (!ok) {
    return NextResponse.json(
      { data: null, error: "Failed to update unit" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { id: unitId }, error: null });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const { unitId } = await params;
  const ok = await deleteUnit(unitId);
  if (!ok) {
    return NextResponse.json(
      { data: null, error: "Failed to delete unit" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { id: unitId }, error: null });
}
