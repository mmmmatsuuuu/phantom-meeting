import { NextResponse } from "next/server";

/** 学年は 1〜3 年、クラスは学籍番号（GCNN）の1桁で 1〜9 組 */
const GRADE_MIN = 1;
const GRADE_MAX = 3;
const CLASS_MIN = 1;
const CLASS_MAX = 9;

export type ParamsResult<T> =
  | { params: T; errorResponse: null }
  | { params: null; errorResponse: NextResponse };

function badRequest(error: string): { params: null; errorResponse: NextResponse } {
  return {
    params: null,
    errorResponse: NextResponse.json({ data: null, error }, { status: 400 }),
  };
}

function parseInRange(raw: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return value >= min && value <= max ? value : null;
}

/**
 * クエリの grade を解析する（API Route 用）。欠けている・不正な場合は 400 レスポンスを返す。
 * 例: CSV エクスポート（学年単位）
 */
export function parseGradeParam(searchParams: URLSearchParams): ParamsResult<{ grade: number }> {
  const gradeRaw = searchParams.get("grade");
  if (!gradeRaw) return badRequest("grade は必須です");

  const grade = parseInRange(gradeRaw, GRADE_MIN, GRADE_MAX);
  if (grade === null) return badRequest("grade が不正です");

  return { params: { grade }, errorResponse: null };
}

/**
 * クエリの grade・class を解析する（どちらも必須）。例: レッスン別分析（1クラス単位）
 */
export function parseGradeClassParams(
  searchParams: URLSearchParams
): ParamsResult<{ grade: number; classNum: number }> {
  const gradeRaw = searchParams.get("grade");
  const classRaw = searchParams.get("class");
  if (!gradeRaw || !classRaw) return badRequest("grade と class は必須です");

  const grade = parseInRange(gradeRaw, GRADE_MIN, GRADE_MAX);
  if (grade === null) return badRequest("grade が不正です");

  const classNum = parseInRange(classRaw, CLASS_MIN, CLASS_MAX);
  if (classNum === null) return badRequest("class が不正です");

  return { params: { grade, classNum }, errorResponse: null };
}

/**
 * クエリの grade・class を解析する。class が省略または "all" なら学年全体。例: 単元別分析
 */
export function parseGradeClassOrAllParams(
  searchParams: URLSearchParams
): ParamsResult<{ grade: number; classNum: number | "all" }> {
  const gradeResult = parseGradeParam(searchParams);
  if (gradeResult.errorResponse) return gradeResult;
  const { grade } = gradeResult.params;

  const classRaw = searchParams.get("class");
  if (!classRaw || classRaw === "all") {
    return { params: { grade, classNum: "all" }, errorResponse: null };
  }

  const classNum = parseInRange(classRaw, CLASS_MIN, CLASS_MAX);
  if (classNum === null) return badRequest("class が不正です");

  return { params: { grade, classNum }, errorResponse: null };
}
