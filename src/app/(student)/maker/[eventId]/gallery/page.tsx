import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/server";
import { canViewMakerGallery, getMakerEvent, getMakerGalleryItems } from "@/lib/db/maker";
import MakerGallery from "@/components/maker/maker-gallery";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function MakerGalleryPage({ params }: Props) {
  const { eventId } = await params;
  const [event, profile] = await Promise.all([getMakerEvent(eventId), getUserProfile()]);
  if (!event || !profile) return notFound();

  const isTeacher = profile.role === "teacher" || profile.role === "admin";
  const canView = isTeacher || (await canViewMakerGallery(eventId));
  const items = canView ? await getMakerGalleryItems(eventId) : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          href={isTeacher ? `/teacher/maker/${eventId}` : `/maker/${eventId}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {event.title}
        </Link>
        <h1 className="text-2xl font-bold mt-1">🎮 みんなの作品</h1>
      </div>
      {canView ? (
        <MakerGallery eventId={eventId} initialItems={items} isTeacher={isTeacher} />
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">
          まだ公開されていません。先生が公開すると、ここで作品を見られるようになります。
        </p>
      )}
    </div>
  );
}
