import Link from "next/link";
import { getMakerEvents } from "@/lib/db/maker";
import MakerNewEventForm from "@/components/maker/maker-new-event-form";

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  open: "受付中",
  closed: "受付終了",
};

export default async function TeacherMakerPage() {
  const events = await getMakerEvents();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">🛠 自由制作</h1>
        <p className="text-sm text-muted-foreground">
          生徒が作るものを自分で決めて制作・提出し、作品を共有する課題を配信します。
        </p>
      </div>
      <MakerNewEventForm />
      <div className="grid gap-2">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/teacher/maker/${event.id}`}
            className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3 hover:border-indigo-400 transition-colors"
          >
            <span className="text-sm font-medium truncate">{event.title}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {STATUS_LABELS[event.status] ?? event.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
