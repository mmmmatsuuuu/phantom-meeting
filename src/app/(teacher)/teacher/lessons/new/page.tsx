import { getContents } from "@/lib/db/contents";
import LessonNewForm from "@/components/teacher/lesson-new-form";

type Props = {
  searchParams: Promise<{ unitId?: string }>;
};

export default async function LessonNewPage({ searchParams }: Props) {
  const [subjects, { unitId }] = await Promise.all([getContents(), searchParams]);

  return <LessonNewForm subjects={subjects} defaultUnitId={unitId} />;
}
