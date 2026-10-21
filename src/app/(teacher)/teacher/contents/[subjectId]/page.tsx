import { notFound } from "next/navigation";
import { getContents } from "@/lib/db/contents";
import ContentsManager from "@/components/teacher/contents-manager";

type Props = {
  params: Promise<{ subjectId: string }>;
};

export default async function SubjectContentsPage({ params }: Props) {
  const [subjects, { subjectId }] = await Promise.all([getContents(), params]);

  const subject = subjects.find((s) => s.id === subjectId);
  if (!subject) return notFound();

  return (
    <ContentsManager
      key={subject.id}
      subjects={subjects.map(({ id, name }) => ({ id, name }))}
      initialSubject={subject}
    />
  );
}
