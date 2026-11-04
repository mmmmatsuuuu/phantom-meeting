import Link from "next/link";
import { notFound } from "next/navigation";
import { getContents } from "@/lib/db/contents";
import { getAllProfiles } from "@/lib/db/users";
import {
  getMakerEvent,
  getMakerGalleryItems,
  getMakerOpenings,
  type MakerStatus,
} from "@/lib/db/maker";
import { classOf, gradeOf } from "@/lib/student-number";
import { listMakerClasses, parseMakerSettings } from "@/lib/maker-settings";
import MakerClassOpenings from "@/components/maker/maker-class-openings";
import MakerEventForm from "@/components/maker/maker-event-form";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function TeacherMakerEventPage({ params }: Props) {
  const { eventId } = await params;
  const [event, subjects, profiles, openings, items] = await Promise.all([
    getMakerEvent(eventId),
    getContents(),
    getAllProfiles(),
    getMakerOpenings(eventId),
    getMakerGalleryItems(eventId),
  ]);
  if (!event) return notFound();

  const units = subjects.flatMap((subject) =>
    subject.units.map((unit) => ({ id: unit.id, label: `${subject.name} / ${unit.name}` }))
  );
  const classes = listMakerClasses(profiles.map((p) => p.student_number)).map((c) => ({
    ...c,
    submittedCount: items.filter(
      (item) =>
        item.student_number !== null &&
        gradeOf(item.student_number) === c.grade &&
        classOf(item.student_number) === c.classNum
    ).length,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <Link
          href="/teacher/maker"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← 自由制作の一覧
        </Link>
        <h1 className="font-hand font-semibold text-[26px] leading-normal mt-1">{event.title}</h1>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">作品一覧の公開（提出 {items.length} 件）</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/teacher/maker/${eventId}/submissions`}
              className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              提出状況を確認する
            </Link>
            <Link
              href={`/maker/${eventId}/gallery`}
              className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
            >
              生徒の見え方で作品一覧を開く
            </Link>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          開放したクラスの生徒だけが、他の生徒の作品を見られます。提出前に他の生徒の作品を見られないよう、提出が終わってから開放してください。
        </p>
        <MakerClassOpenings
          eventId={eventId}
          classes={classes}
          initialOpenKeys={openings.map((o) => `${o.grade}-${o.class_num}`)}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">課題の設定</h2>
        <MakerEventForm
          eventId={eventId}
          initialTitle={event.title}
          initialDescription={event.description}
          initialUnitId={event.unit_id}
          initialStatus={event.status as MakerStatus}
          initialSettings={parseMakerSettings(event.settings)}
          units={units}
        />
      </section>
    </div>
  );
}
