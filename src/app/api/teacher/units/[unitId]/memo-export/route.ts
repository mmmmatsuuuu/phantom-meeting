import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getUnitMemoSamplesForExport,
  type UnitMemoExportData,
} from "@/lib/db/memos";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function generateCsv(data: UnitMemoExportData): string {
  const lines: string[] = [];

  lines.push(
    `## 対象: ${data.grade}年全体 ${data.studentCount}名 / 出力日: ${data.exportDate}`
  );
  lines.push("");

  lines.push("## 授業別メモサンプル（ランダム10人分/授業・複数メモは結合）");
  lines.push(["レッスン", "メモ内容（結合・要約）"].map(escapeCsv).join(","));

  for (const lesson of data.lessons) {
    for (const memo of lesson.memos) {
      lines.push([lesson.lessonTitle, memo].map(escapeCsv).join(","));
    }
  }

  return lines.join("\n");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher" && profile?.role !== "admin") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 });
  }

  const { unitId } = await params;
  const gradeRaw = req.nextUrl.searchParams.get("grade");

  if (!gradeRaw) {
    return NextResponse.json(
      { data: null, error: "grade は必須です" },
      { status: 400 }
    );
  }

  const grade = parseInt(gradeRaw, 10);
  if (isNaN(grade) || grade < 1 || grade > 3) {
    return NextResponse.json(
      { data: null, error: "grade が不正です" },
      { status: 400 }
    );
  }

  const data = await getUnitMemoSamplesForExport(unitId, grade);

  if (!data) {
    return NextResponse.json(
      { data: null, error: "データが見つかりませんでした" },
      { status: 404 }
    );
  }

  const csv = generateCsv(data);
  const safeUnitName = data.unitName.replace(/[\\/:*?"<>|]/g, "_");
  const filename = `memo_export_${safeUnitName}_${data.grade}年_${data.exportDate}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
