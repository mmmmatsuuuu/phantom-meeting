"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { SubjectWithUnits, Subject, Unit } from "@/lib/db/contents";

type Props = {
  initialSubjects: SubjectWithUnits[];
};

type EditingState =
  | { type: "subject"; id: string; name: string }
  | { type: "unit"; id: string; name: string }
  | null;

export default function ContentsManager({ initialSubjects }: Props) {
  const [subjects, setSubjects] = useState<SubjectWithUnits[]>(initialSubjects);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [addingUnitForSubjectId, setAddingUnitForSubjectId] = useState<string | null>(null);
  const [newUnitName, setNewUnitName] = useState("");
  const [editing, setEditing] = useState<EditingState>(null);

  // ---- 科目 ----

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    const res = await fetch("/api/contents/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSubjectName.trim() }),
    });
    const json = (await res.json()) as { data: Subject | null; error: string | null };
    if (json.data) {
      setSubjects((prev) => [...prev, { ...json.data!, units: [] }]);
      setNewSubjectName("");
      setIsAddingSubject(false);
    } else {
      toast.error("科目の追加に失敗しました");
    }
  };

  const handleUpdateSubject = async (id: string, name: string) => {
    const res = await fetch(`/api/contents/subjects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setSubjects((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name } : s))
      );
      setEditing(null);
    } else {
      toast.error("科目名の変更に失敗しました");
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("この科目を削除しますか？配下の単元・レッスンもすべて削除されます。")) return;
    const res = await fetch(`/api/contents/subjects/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    } else {
      toast.error("科目の削除に失敗しました");
    }
  };

  // ---- 単元 ----

  const handleAddUnit = async (subjectId: string) => {
    if (!newUnitName.trim()) return;
    const res = await fetch("/api/contents/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, name: newUnitName.trim() }),
    });
    const json = (await res.json()) as { data: Unit | null; error: string | null };
    if (json.data) {
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === subjectId
            ? { ...s, units: [...s.units, { ...json.data!, lessons: [] }] }
            : s
        )
      );
      setNewUnitName("");
      setAddingUnitForSubjectId(null);
    } else {
      toast.error("単元の追加に失敗しました");
    }
  };

  const handleUpdateUnit = async (id: string, name: string) => {
    const res = await fetch(`/api/contents/units/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setSubjects((prev) =>
        prev.map((s) => ({
          ...s,
          units: s.units.map((u) => (u.id === id ? { ...u, name } : u)),
        }))
      );
      setEditing(null);
    } else {
      toast.error("単元名の変更に失敗しました");
    }
  };

  const handleDeleteUnit = async (unitId: string, subjectId: string) => {
    if (!confirm("この単元を削除しますか？配下のレッスンもすべて削除されます。")) return;
    const res = await fetch(`/api/contents/units/${unitId}`, { method: "DELETE" });
    if (res.ok) {
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === subjectId
            ? { ...s, units: s.units.filter((u) => u.id !== unitId) }
            : s
        )
      );
    } else {
      toast.error("単元の削除に失敗しました");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">📚 コンテンツ管理</h1>
          <p className="text-sm text-muted-foreground">
            科目・単元を管理します。レッスンは各単元から追加できます。
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {subjects.map((subject) => (
          <div key={subject.id} className="rounded-md border bg-card">
            {/* 科目ヘッダー */}
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/40 rounded-t-md">
              {editing?.type === "subject" && editing.id === subject.id ? (
                <form
                  className="flex flex-1 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (editing.type === "subject") handleUpdateSubject(subject.id, editing.name);
                  }}
                >
                  <input
                    autoFocus
                    className="flex-1 px-2 py-1 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ type: "subject", id: subject.id, name: e.target.value })
                    }
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="px-3 py-1 text-xs rounded border hover:bg-muted"
                  >
                    キャンセル
                  </button>
                </form>
              ) : (
                <>
                  <span className="flex-1 font-semibold text-sm">{subject.name}</span>
                  <button
                    onClick={() =>
                      setEditing({ type: "subject", id: subject.id, name: subject.name })
                    }
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
                    aria-label="科目名を編集"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(subject.id)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors px-1"
                    aria-label="科目を削除"
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>

            {/* 単元リスト */}
            <div className="divide-y">
              {subject.units.map((unit) => (
                <div key={unit.id} className="flex items-center gap-2 px-6 py-2.5">
                  {editing?.type === "unit" && editing.id === unit.id ? (
                    <form
                      className="flex flex-1 gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (editing.type === "unit") handleUpdateUnit(unit.id, editing.name);
                      }}
                    >
                      <input
                        autoFocus
                        className="flex-1 px-2 py-1 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={editing.name}
                        onChange={(e) =>
                          setEditing({ type: "unit", id: unit.id, name: e.target.value })
                        }
                      />
                      <button
                        type="submit"
                        className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="px-3 py-1 text-xs rounded border hover:bg-muted"
                      >
                        キャンセル
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{unit.name}</span>
                      <Link
                        href={`/teacher/lessons/new?unitId=${unit.id}`}
                        className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors"
                      >
                        📺 レッスン追加
                      </Link>
                      <button
                        onClick={() =>
                          setEditing({ type: "unit", id: unit.id, name: unit.name })
                        }
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
                        aria-label="単元名を編集"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteUnit(unit.id, subject.id)}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors px-1"
                        aria-label="単元を削除"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              ))}

              {/* 単元追加フォーム */}
              {addingUnitForSubjectId === subject.id ? (
                <form
                  className="flex gap-2 px-6 py-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddUnit(subject.id);
                  }}
                >
                  <input
                    autoFocus
                    className="flex-1 px-2 py-1 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="単元名を入力..."
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground"
                  >
                    追加
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingUnitForSubjectId(null);
                      setNewUnitName("");
                    }}
                    className="px-3 py-1 text-xs rounded border hover:bg-muted"
                  >
                    キャンセル
                  </button>
                </form>
              ) : (
                <div className="px-6 py-2.5">
                  <button
                    onClick={() => {
                      setAddingUnitForSubjectId(subject.id);
                      setNewUnitName("");
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ＋ 単元を追加
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 科目追加 */}
        {isAddingSubject ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleAddSubject();
            }}
          >
            <input
              autoFocus
              className="flex-1 px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="科目名を入力..."
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
            />
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              追加
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingSubject(false);
                setNewSubjectName("");
              }}
              className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
            >
              キャンセル
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingSubject(true)}
            className="w-full py-2.5 rounded-md border border-dashed text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          >
            ＋ 科目を追加
          </button>
        )}
      </div>
    </div>
  );
}
