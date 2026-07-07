import { getAllProfiles } from "@/lib/db/users";
import StudentPicker from "@/components/teacher/student-picker";

export default async function StudentAnalyticsPage() {
  const profiles = await getAllProfiles();

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        生徒を選択すると、その生徒の学習状況（授業全体・単元・レッスン別）を確認できます
      </p>
      <StudentPicker profiles={profiles} />
    </div>
  );
}
