import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllProfiles } from "@/lib/db/users";
import { getMakerEvent, getMakerProgress } from "@/lib/db/maker";
import { listMakerClasses } from "@/lib/maker-settings";
import { buildMakerRoster } from "@/lib/maker-roster";
import MakerSubmissionsBoard from "@/components/maker/maker-submissions-board";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function TeacherMakerSubmissionsPage({ params }: Props) {
  const { eventId } = await params;
  const [event, profiles, progress] = await Promise.all([
    getMakerEvent(eventId),
    getAllProfiles(),
    getMakerProgress(eventId),
  ]);
  if (!event) return notFound();

  const students = profiles.filter((p) => p.role === "student");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          href={`/teacher/maker/${eventId}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {event.title}
        </Link>
        <h1 className="text-2xl font-bold mt-1">提出状況</h1>
      </div>
      <MakerSubmissionsBoard
        eventId={eventId}
        classes={listMakerClasses(students.map((p) => p.student_number))}
        roster={buildMakerRoster(students, progress.works, progress.submissions)}
      />
    </div>
  );
}
