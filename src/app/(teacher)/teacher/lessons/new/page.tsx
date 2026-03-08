import { getContents } from "@/lib/db/contents";
import LessonNewForm from "@/components/teacher/lesson-new-form";

export default async function LessonNewPage() {
  const subjects = await getContents();

  return <LessonNewForm subjects={subjects} />;
}
