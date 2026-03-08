import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type Subject = Database["public"]["Tables"]["subjects"]["Row"];
export type Unit = Database["public"]["Tables"]["units"]["Row"];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type Question = Database["public"]["Tables"]["questions"]["Row"];

export type UnitWithLessons = Unit & { lessons: Lesson[] };
export type SubjectWithUnits = Subject & { units: UnitWithLessons[] };

export type LessonWithQuestions = Lesson & {
  unit: Unit & { subject: Subject };
  questions: Question[];
};

/**
 * 科目・単元・レッスン一覧を取得する
 */
export async function getContents(): Promise<SubjectWithUnits[]> {
  const supabase = await createClient();

  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("*")
    .order("order");

  if (subjectsError || !subjects) return [];

  const { data: units, error: unitsError } = await supabase
    .from("units")
    .select("*")
    .order("order");

  if (unitsError || !units) return [];

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("*")
    .order("order");

  if (lessonsError || !lessons) return [];

  return subjects.map((subject) => ({
    ...subject,
    units: units
      .filter((unit) => unit.subject_id === subject.id)
      .map((unit) => ({
        ...unit,
        lessons: lessons.filter((lesson) => lesson.unit_id === unit.id),
      })),
  }));
}

/**
 * レッスンと発問を一括作成する（teacher/admin のみ）
 */
export async function createLesson(params: {
  unitId: string;
  title: string;
  youtubeUrl: string;
  questions: string[];
}): Promise<Lesson | null> {
  const supabase = await createClient();

  // 同一 unit 内のレッスン数を order として使用
  const { count } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .eq("unit_id", params.unitId);

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .insert({
      unit_id: params.unitId,
      title: params.title,
      youtube_url: params.youtubeUrl,
      order: count ?? 0,
    })
    .select()
    .single();

  if (lessonError || !lesson) return null;

  const questionRows = params.questions
    .filter((q) => q.trim() !== "")
    .map((content, i) => ({
      lesson_id: lesson.id,
      content,
      order: i,
    }));

  if (questionRows.length > 0) {
    const { error: questionsError } = await supabase
      .from("questions")
      .insert(questionRows);

    if (questionsError) return null;
  }

  return lesson;
}

/**
 * レッスン詳細と発問を取得する
 */
export async function getLessonWithQuestions(
  lessonId: string
): Promise<LessonWithQuestions | null> {
  const supabase = await createClient();

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("*, unit:units(*, subject:subjects(*))")
    .eq("id", lessonId)
    .single();

  if (lessonError || !lesson) return null;

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order");

  if (questionsError) return null;

  return {
    ...lesson,
    questions: questions ?? [],
  };
}
