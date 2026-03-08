import { getContents } from "@/lib/db/contents";
import ContentsManager from "@/components/teacher/contents-manager";

export default async function ContentsPage() {
  const subjects = await getContents();

  return <ContentsManager initialSubjects={subjects} />;
}
