import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { parseGradeParam } from "@/lib/api/params";
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
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const { unitId } = await params;
  const parsed = parseGradeParam(req.nextUrl.searchParams);
  if (parsed.errorResponse) return parsed.errorResponse;
  const { grade } = parsed.params;

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
