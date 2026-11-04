import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/server";
import {
  canViewMakerGallery,
  getMakerEvent,
  getMakerGalleryItems,
  getMyStudentNumber,
} from "@/lib/db/maker";
import { resolveGalleryClass } from "@/lib/maker-settings";
import { studentNumberRange } from "@/lib/student-number";
import MakerGallery from "@/components/maker/maker-gallery";
import MakerClassPicker from "@/components/maker/maker-class-picker";
import Mascot from "@/components/shared/mascot";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ grade?: string; class?: string }>;
};

export default async function MakerGalleryPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const [event, profile, query] = await Promise.all([
    getMakerEvent(eventId),
    getUserProfile(),
    searchParams,
  ]);
  if (!event || !profile) return notFound();

  const isTeacher = profile.role === "teacher" || profile.role === "admin";
  const [canView, studentNumber] = await Promise.all([
    isTeacher ? Promise.resolve(true) : canViewMakerGallery(eventId),
    getMyStudentNumber(profile.userId),
  ]);

  // 全員分を一度に出すと数百件になり、RLS の判定と転送量が増えるため、クラス単位で取得する
  const { grade, classNum } = resolveGalleryClass(query, studentNumber);
  const items = canView
    ? await getMakerGalleryItems(eventId, studentNumberRange(grade, classNum))
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href={isTeacher ? `/teacher/maker/${eventId}` : `/maker/${eventId}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {event.title}
          </Link>
          <h1 className="font-hand font-semibold text-[28px] leading-normal mt-1">作品展</h1>
        </div>
        {canView && <MakerClassPicker eventId={eventId} grade={grade} classNum={classNum} />}
      </div>
      {canView ? (
        // クラスを切り替えたら、選んでいた作品や公開停止の状態を持ち越さない
        <MakerGallery
          key={`${grade}-${classNum}`}
          eventId={eventId}
          initialItems={items}
          isTeacher={isTeacher}
        />
      ) : (
        <div className="flex items-center gap-4 py-6 border-b border-rule">
          <Mascot pose="rest" size={96} />
          <p className="text-sm text-muted-foreground">
            まだ公開されていません。先生が公開するまで、のんびり待ちましょう。
          </p>
        </div>
      )}
    </div>
  );
}
