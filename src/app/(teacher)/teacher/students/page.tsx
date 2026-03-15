import { getAllProfiles } from "@/lib/db/users";
import StudentsTable from "@/components/teacher/students-table";

export default async function StudentsPage() {
  const profiles = await getAllProfiles();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">生徒一覧</h1>
        <p className="text-sm text-muted-foreground">
          学籍番号・備考をインラインで編集できます。表示名の変更はできません。
        </p>
      </div>
      <StudentsTable initialProfiles={profiles} />
    </div>
  );
}
