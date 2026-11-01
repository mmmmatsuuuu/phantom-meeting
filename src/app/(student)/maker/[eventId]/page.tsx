import { notFound } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/server";
import { getMakerEvent, getMyMakerSubmission, getMyMakerWork, getMyStudentNumber } from "@/lib/db/maker";
import { parseMakerSettings } from "@/lib/maker-settings";
import MakerWorkspace from "@/components/maker/maker-workspace";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function MakerEventPage({ params }: Props) {
  const { eventId } = await params;
  const [event, profile] = await Promise.all([getMakerEvent(eventId), getUserProfile()]);
  if (!event || !profile) return notFound();

  const [work, studentNumber, submission] = await Promise.all([
    getMyMakerWork(eventId, profile.userId),
    getMyStudentNumber(profile.userId),
    getMyMakerSubmission(eventId, profile.userId),
  ]);
  const settings = parseMakerSettings(event.settings);

  return (
    <MakerWorkspace
      eventId={eventId}
      eventTitle={event.title}
      eventDescription={event.description}
      isOpen={event.status === "open"}
      settings={settings}
      initialDraft={{
        plan: work?.plan ?? "",
        title: work?.title ?? "",
        description: work?.description ?? "",
        code: work?.code ?? settings.starterCode,
      }}
      hasStudentNumber={profile.role !== "student" || studentNumber !== null}
      submittedAt={submission?.submitted_at ?? null}
      initialHasUnsubmittedChanges={
        submission != null && work != null && work.updated_at > submission.submitted_at
      }
      isHidden={submission?.hidden_at != null}
    />
  );
}
