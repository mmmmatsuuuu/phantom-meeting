import { getPendingTeachers } from "@/lib/db/users";
import ApproveButton from "@/components/admin/approve-button";

export default async function AdminUsersPage() {
  const pendingTeachers = await getPendingTeachers();

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">ユーザー管理</h1>
      <section>
        <h2 className="text-lg font-semibold mb-4">承認待ち教師</h2>
        {pendingTeachers.length === 0 ? (
          <p className="text-muted-foreground text-sm">承認待ちのユーザーはいません。</p>
        ) : (
          <ul className="space-y-3">
            {pendingTeachers.map((teacher) => (
              <li
                key={teacher.id}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
              >
                <span className="text-sm">{teacher.display_name || "（名前未設定）"}</span>
                <ApproveButton userId={teacher.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
