import { classOf, gradeOf } from "@/lib/student-number";

export type MakerPrompt = { title: string; body: string };
export type MakerExample = { title: string; description: string; code: string };

/** maker_events.settings の中身 */
export type MakerSettings = {
  prompts: MakerPrompt[];
  examples: MakerExample[];
  starterCode: string;
};

export type MakerClass = { grade: number; classNum: number };

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> => typeof item === "object" && item !== null
  );
}

/** jsonb の値を MakerSettings に整える。欠けた項目や型の違う項目は空として扱う */
export function parseMakerSettings(value: unknown): MakerSettings {
  const raw =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    prompts: asRecords(raw.prompts).map((p) => ({
      title: asText(p.title),
      body: asText(p.body),
    })),
    examples: asRecords(raw.examples).map((e) => ({
      title: asText(e.title),
      description: asText(e.description),
      code: asText(e.code),
    })),
    starterCode: asText(raw.starterCode),
  };
}

/** 学籍番号の一覧から、存在するクラスを学年・組の順に重複なく返す。GCNN 形式でない番号は除く */
export function listMakerClasses(studentNumbers: (number | null)[]): MakerClass[] {
  const keys = new Set<number>();
  for (const number of studentNumbers) {
    if (number === null) continue;
    const grade = gradeOf(number);
    const classNum = classOf(number);
    if (grade >= 1 && grade <= 3 && classNum >= 1 && classNum <= 9) {
      keys.add(grade * 10 + classNum);
    }
  }
  return [...keys]
    .sort((a, b) => a - b)
    .map((key) => ({ grade: Math.floor(key / 10), classNum: key % 10 }));
}

function isValidClass(grade: number, classNum: number): boolean {
  return Number.isInteger(grade) && Number.isInteger(classNum) && grade >= 1 && grade <= 3 && classNum >= 1 && classNum <= 9;
}

/**
 * 作品展で表示するクラスを決める。
 * URL で学年・組が正しく指定されていればそれを、なければ閲覧している生徒のクラスを、
 * それもなければ（教員など学籍番号がない場合）1年1組を返す。
 * 全員分を一度に出すより、クラス単位のほうが RLS の判定と転送量が少なく、DB の負荷が小さい
 */
export function resolveGalleryClass(
  query: { grade?: string; class?: string },
  studentNumber: number | null
): MakerClass {
  const grade = Number(query.grade);
  const classNum = Number(query.class);
  if (isValidClass(grade, classNum)) return { grade, classNum };
  if (studentNumber !== null && isValidClass(gradeOf(studentNumber), classOf(studentNumber))) {
    return { grade: gradeOf(studentNumber), classNum: classOf(studentNumber) };
  }
  return { grade: 1, classNum: 1 };
}
