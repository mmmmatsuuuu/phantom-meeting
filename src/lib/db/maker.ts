import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";
import type { MakerSettings } from "@/lib/maker-settings";

export type MakerEvent = Database["public"]["Tables"]["maker_events"]["Row"];
export type MakerWork = Database["public"]["Tables"]["maker_works"]["Row"];
export type MakerStatus = "draft" | "open" | "closed";

/** 一覧表示用の提出物。一覧の負荷を抑えるためコード本体は含めない */
export type MakerGalleryItem = {
  user_id: string;
  student_number: number | null;
  title: string;
  description: string;
  submitted_at: string;
  hidden_at: string | null;
};

export type MakerEventInput = {
  title: string;
  description: string;
  unitId: string | null;
  status: MakerStatus;
  settings: MakerSettings;
};

export type MakerWorkInput = {
  plan: string;
  title: string;
  description: string;
  code: string;
};

export type MakerSubmitResult =
  | "ok"
  | "event_not_open"
  | "student_number_required"
  | "work_incomplete"
  | "failed";

export async function getMakerEvents(): Promise<MakerEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("maker_events")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** レッスン一覧に出すカード用に、見える課題を単元ごとにまとめる（下書きは RLS で生徒に見えない） */
export async function getMakerEventsByUnit(): Promise<
  Record<string, { id: string; title: string }[]>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("maker_events")
    .select("id, title, unit_id")
    .not("unit_id", "is", null)
    .order("created_at");

  const byUnit: Record<string, { id: string; title: string }[]> = {};
  for (const event of data ?? []) {
    if (!event.unit_id) continue;
    (byUnit[event.unit_id] ??= []).push({ id: event.id, title: event.title });
  }
  return byUnit;
}

export async function getMakerEvent(eventId: string): Promise<MakerEvent | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("maker_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  return data;
}

export async function createMakerEvent(title: string, userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("maker_events")
    .insert({ title, created_by: userId })
    .select("id")
    .single();
  return data?.id ?? null;
}

export async function updateMakerEvent(eventId: string, input: MakerEventInput): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("maker_events")
    .update({
      title: input.title,
      description: input.description,
      unit_id: input.unitId,
      status: input.status,
      settings: input.settings as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);
  return !error;
}

export async function deleteMakerEvent(eventId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("maker_events").delete().eq("id", eventId);
  return !error;
}

export async function getMyMakerWork(eventId: string, userId: string): Promise<MakerWork | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("maker_works")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function saveMakerWork(
  eventId: string,
  userId: string,
  input: MakerWorkInput
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("maker_works").upsert({
    event_id: eventId,
    user_id: userId,
    plan: input.plan,
    title: input.title,
    description: input.description,
    code: input.code,
    updated_at: new Date().toISOString(),
  });
  return !error;
}

export async function submitMakerWork(eventId: string): Promise<MakerSubmitResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_maker_work", { p_event_id: eventId });
  if (!error) return "ok";
  for (const code of ["event_not_open", "student_number_required", "work_incomplete"] as const) {
    if (error.message.includes(code)) return code;
  }
  return "failed";
}

export async function getMyStudentNumber(userId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("student_number")
    .eq("id", userId)
    .maybeSingle();
  return data?.student_number ?? null;
}

export async function canViewMakerGallery(eventId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("maker_can_view_gallery", { p_event_id: eventId });
  return data === true;
}

/** RLS により、生徒には公開中の作品と自分の作品、教員には全提出物が返る */
export async function getMakerGalleryItems(eventId: string): Promise<MakerGalleryItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("maker_submissions")
    .select("user_id, student_number, title, description, submitted_at, hidden_at")
    .eq("event_id", eventId)
    .order("student_number", { ascending: true, nullsFirst: false });
  return data ?? [];
}

export async function getMyMakerSubmission(
  eventId: string,
  userId: string
): Promise<{ submitted_at: string; hidden_at: string | null } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("maker_submissions")
    .select("submitted_at, hidden_at")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function getMakerSubmissionCode(
  eventId: string,
  userId: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("maker_submissions")
    .select("code")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.code ?? null;
}

export async function setMakerSubmissionHidden(
  eventId: string,
  userId: string,
  hidden: boolean
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("maker_submissions")
    .update({ hidden_at: hidden ? new Date().toISOString() : null })
    .eq("event_id", eventId)
    .eq("user_id", userId);
  return !error;
}

export async function getMakerOpenings(
  eventId: string
): Promise<{ grade: number; class_num: number }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("maker_gallery_openings")
    .select("grade, class_num")
    .eq("event_id", eventId);
  return data ?? [];
}

export async function setMakerOpening(
  eventId: string,
  grade: number,
  classNum: number,
  open: boolean
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = open
    ? await supabase
        .from("maker_gallery_openings")
        .upsert({ event_id: eventId, grade, class_num: classNum })
    : await supabase
        .from("maker_gallery_openings")
        .delete()
        .eq("event_id", eventId)
        .eq("grade", grade)
        .eq("class_num", classNum);
  return !error;
}

/** 廃止・年度替えの前に作品を残すための書き出し（teacher/admin 用） */
export async function getMakerExport(eventId: string) {
  const supabase = await createClient();
  const [event, submissions] = await Promise.all([
    getMakerEvent(eventId),
    supabase
      .from("maker_submissions")
      .select("student_number, title, description, code, submitted_at, hidden_at")
      .eq("event_id", eventId)
      .order("student_number", { ascending: true, nullsFirst: false }),
  ]);
  return { event, submissions: submissions.data ?? [] };
}
