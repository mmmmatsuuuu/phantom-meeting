import { redirect } from "next/navigation";
import { getContents } from "@/lib/db/contents";
import ContentsManager from "@/components/teacher/contents-manager";

export default async function ContentsPage() {
  const subjects = await getContents();

  // 科目ごとのページに分けているため、先頭の科目へ移動する
  if (subjects.length > 0) redirect(`/teacher/contents/${subjects[0].id}`);

  return <ContentsManager subjects={[]} initialSubject={null} />;
}
