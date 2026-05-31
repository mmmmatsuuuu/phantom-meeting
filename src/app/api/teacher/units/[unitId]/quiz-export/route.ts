import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getUnitQuizResultsForExport,
  type UnitExportData,
  type QuizQuestionType,
} from "@/lib/db/quizzes";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rateToPercent(rate: number | null): string {
  if (rate === null) return "—";
  return `${Math.round(rate * 100)}%`;
}

function classLabel(cls: number): string {
  return `${cls}組`;
}

function typeLabel(type: QuizQuestionType): string {
  switch (type) {
    case "multiple_choice":
      return "選択式";
    case "ordering":
      return "並び替え";
    case "short_answer":
      return "記述式";
  }
}

function generateCsv(data: UnitExportData): string {
  const lines: string[] = [];
  const classLabels = data.classes.map(classLabel);

  lines.push(
    `## 集計基準: 各生徒の最新回答 / 対象: ${data.grade}年全体 ${data.studentCount}名 / 出力日: ${data.exportDate}`
  );
  lines.push("");

  // Section 1: 設問別正答率
  lines.push("## 設問別正答率");
  lines.push(
    ["レッスン", "Q番号", "問題文（要約）", "形式", "全体", ...classLabels]
      .map(escapeCsv)
      .join(",")
  );

  for (const lesson of data.lessons) {
    for (const q of lesson.questions) {
      const row = [
        lesson.lessonTitle,
        `Q${q.questionOrder}`,
        q.contentSummary,
        typeLabel(q.type),
        rateToPercent(q.overallRate),
        ...data.classes.map((cls) => rateToPercent(q.classRates.get(cls) ?? null)),
      ];
      lines.push(row.map(escapeCsv).join(","));
    }
  }

  lines.push("");

  // Section 2: 誤答内訳（選択式かつ正答率60%以下の設問のみ）
  lines.push("## 誤答内訳（正答率60%以下の設問のみ）");
  lines.push(
    ["レッスン", "Q番号", "選択肢", "正解", "人数", "割合"]
      .map(escapeCsv)
      .join(",")
  );

  let hasDistribution = false;
  for (const lesson of data.lessons) {
    for (const q of lesson.questions) {
      if (q.type !== "multiple_choice") continue;
      if (q.overallRate === null || q.overallRate > 0.6) continue;
      if (!q.answerDistribution) continue;

      for (const item of q.answerDistribution) {
        const row = [
          lesson.lessonTitle,
          `Q${q.questionOrder}`,
          item.text,
          item.isCorrect ? "✓" : "",
          String(item.count),
          rateToPercent(item.rate),
        ];
        lines.push(row.map(escapeCsv).join(","));
        hasDistribution = true;
      }
    }
  }

  if (!hasDistribution) {
    lines.push("（該当なし）");
  }

  lines.push("");

  // Section 3: 記述回答サンプル（1設問1行）
  lines.push("## 記述回答サンプル（最新回答・ランダム3件）");
  lines.push(
    ["レッスン", "Q番号", "問題文（要約）", "正答例", "生徒の回答1", "生徒の回答2", "生徒の回答3"]
      .map(escapeCsv)
      .join(",")
  );

  let hasSamples = false;
  for (const lesson of data.lessons) {
    for (const q of lesson.questions) {
      if (q.type !== "short_answer") continue;

      const samples = q.shortAnswerSamples;
      const row = [
        lesson.lessonTitle,
        `Q${q.questionOrder}`,
        q.contentSummary,
        q.correctAnswerText ?? "（未設定）",
        samples[0] ?? "",
        samples[1] ?? "",
        samples[2] ?? "",
      ];
      lines.push(row.map(escapeCsv).join(","));
      hasSamples = true;
    }
  }

  if (!hasSamples) {
    lines.push("（該当なし）");
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

  const data = await getUnitQuizResultsForExport(unitId, grade);

  if (!data) {
    return NextResponse.json(
      { data: null, error: "データが見つかりませんでした" },
      { status: 404 }
    );
  }

  const csv = generateCsv(data);
  const safeUnitName = data.unitName.replace(/[\\/:*?"<>|]/g, "_");
  const filename = `quiz_export_${safeUnitName}_${data.grade}年_${data.exportDate}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
