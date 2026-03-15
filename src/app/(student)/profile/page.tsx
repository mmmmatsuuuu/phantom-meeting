import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileEditForm from "@/components/profile/profile-edit-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, student_number, note")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/");

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">プロフィール編集</h1>
        <p className="text-sm text-muted-foreground mt-1">
          表示名・学籍番号・備考を編集できます。
        </p>
      </div>

      <div className="bg-card border rounded-xl p-6">
        <ProfileEditForm
          initialDisplayName={profile.display_name}
          initialStudentNumber={profile.student_number}
          initialNote={profile.note}
        />
      </div>
    </div>
  );
}
