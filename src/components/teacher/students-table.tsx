"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Profile } from "@/lib/db/users";

type SortKey = "student_number" | "display_name";
type SortOrder = "asc" | "desc";

type EditingState = {
  userId: string;
  studentNumber: string;
  note: string;
};


type Props = {
  initialProfiles: Profile[];
};

export default function StudentsTable({ initialProfiles }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("student_number");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSortClick = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const startEdit = (profile: Profile) => {
    setEditing({
      userId: profile.id,
      studentNumber:
        profile.student_number !== null ? String(profile.student_number) : "",
      note: profile.note ?? "",
    });
  };

  const cancelEdit = () => setEditing(null);

  const handleSave = async () => {
    if (!editing) return;

    const studentNumberParsed = editing.studentNumber.trim()
      ? parseInt(editing.studentNumber.trim(), 10)
      : null;

    if (editing.studentNumber.trim() && isNaN(studentNumberParsed!)) {
      toast.error("学籍番号は数字で入力してください");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUserId: editing.userId,
        studentNumber: studentNumberParsed,
        note: editing.note.trim() || null,
      }),
    });
    setSaving(false);

    if (res.ok) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === editing.userId
            ? {
                ...p,
                student_number: studentNumberParsed,
                note: editing.note.trim() || null,
              }
            : p
        )
      );
      setEditing(null);
      toast.success("保存しました");
    } else {
      toast.error("保存に失敗しました");
    }
  };

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.display_name.toLowerCase().includes(q) ||
      (p.student_number !== null && String(p.student_number).includes(q)) ||
      (p.note ?? "").toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA: string | number | null;
    let valB: string | number | null;
    if (sortKey === "student_number") {
      valA = a.student_number ?? Infinity;
      valB = b.student_number ?? Infinity;
    } else {
      valA = a.display_name;
      valB = b.display_name;
    }
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const sortIcon = (col: SortKey) => {
    if (sortKey !== col)
      return <span className="ml-1 text-muted-foreground/40">↕</span>;
    return (
      <span className="ml-1 text-indigo-500">
        {sortOrder === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* 検索 */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="表示名・学籍番号・備考で検索..."
        className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th
                className="px-4 py-2.5 text-left font-medium cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSortClick("student_number")}
              >
                学籍番号
                {sortIcon("student_number")}
              </th>
              <th
                className="px-4 py-2.5 text-left font-medium cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSortClick("display_name")}
              >
                表示名
                {sortIcon("display_name")}
              </th>
              <th className="px-4 py-2.5 text-left font-medium">備考</th>
              <th className="px-4 py-2.5 text-left font-medium w-20" />
            </tr>
          </thead>
          <tbody className="divide-y bg-card">
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-muted-foreground text-sm"
                >
                  該当するユーザーが見つかりません
                </td>
              </tr>
            )}
            {sorted.map((profile) => {
              const isEditing = editing?.userId === profile.id;
              return (
                <tr key={profile.id} className="hover:bg-muted/30 transition-colors">
                  {/* 学籍番号 */}
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editing.studentNumber}
                        onChange={(e) =>
                          setEditing({ ...editing, studentNumber: e.target.value })
                        }
                        className="w-24 border rounded px-2 py-1 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {profile.student_number ?? "—"}
                      </span>
                    )}
                  </td>

                  {/* 表示名 */}
                  <td className="px-4 py-2.5 font-medium">{profile.display_name}</td>

                  {/* 備考 */}
                  <td className="px-4 py-2.5 max-w-xs">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editing.note}
                        onChange={(e) =>
                          setEditing({ ...editing, note: e.target.value })
                        }
                        className="w-full border rounded px-2 py-1 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    ) : (
                      <span className="text-muted-foreground truncate block">
                        {profile.note ?? "—"}
                      </span>
                    )}
                  </td>

                  {/* 操作 */}
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
                        >
                          {saving ? "…" : "保存"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={saving}
                          className="text-xs px-2 py-1 rounded border hover:bg-muted"
                        >
                          戻す
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(profile)}
                        className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors"
                      >
                        編集
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground text-right">
        {sorted.length} 件 / 全 {profiles.length} 件
      </p>
    </div>
  );
}
