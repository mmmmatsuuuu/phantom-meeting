"use client";

import { useState } from "react";
import MakerConsole from "@/components/maker/maker-console";
import SubmitButton from "@/components/shared/submit-button";
import type { MakerStudentDetail } from "@/lib/db/maker";
import type { MakerClass } from "@/lib/maker-settings";
import {
  filterRosterByClass,
  type MakerRosterEntry,
  type MakerRosterStatus,
} from "@/lib/maker-roster";

const STATUS_LABELS: Record<MakerRosterStatus, { label: string; className: string }> = {
  submitted: {
    label: "提出済み",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  hidden: {
    label: "公開停止中",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  draft: {
    label: "下書き中",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  not_started: { label: "未着手", className: "bg-muted text-muted-foreground" },
};

// select の値。学籍番号が未設定の生徒をまとめて表示するときに使う
const NO_NUMBER = "none";

type Props = {
  eventId: string;
  classes: MakerClass[];
  roster: MakerRosterEntry[];
};

export default function MakerSubmissionsBoard({ eventId, classes, roster: initialRoster }: Props) {
  const [roster, setRoster] = useState(initialRoster);
  const [classValue, setClassValue] = useState(
    classes[0] ? `${classes[0].grade}-${classes[0].classNum}` : NO_NUMBER
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MakerStudentDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const target =
    classValue === NO_NUMBER
      ? null
      : {
          grade: Number(classValue.split("-")[0]),
          classNum: Number(classValue.split("-")[1]),
        };
  const entries = filterRosterByClass(roster, target);
  const hasNoNumberStudents = filterRosterByClass(roster, null).length > 0;
  const selected = roster.find((entry) => entry.userId === selectedId) ?? null;
  const submittedCount = entries.filter(
    (e) => e.status === "submitted" || e.status === "hidden"
  ).length;

  const openStudent = async (userId: string) => {
    setSelectedId(userId);
    setDetail(null);
    setLoadError(null);
    setUpdateError(null);
    try {
      const res = await fetch(`/api/maker/events/${eventId}/students/${userId}`);
      if (!res.ok) throw new Error();
      const { data } = (await res.json()) as { data: MakerStudentDetail };
      setDetail(data);
    } catch {
      setLoadError("読み込めませんでした");
    }
  };

  const toggleHidden = async (entry: MakerRosterEntry) => {
    const hidden = entry.status !== "hidden";
    setUpdating(true);
    setUpdateError(null);
    try {
      const res = await fetch(
        `/api/maker/events/${eventId}/submissions/${entry.userId}/visibility`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hidden }),
        }
      );
      if (!res.ok) throw new Error();
      setRoster((prev) =>
        prev.map((e) =>
          e.userId === entry.userId ? { ...e, status: hidden ? "hidden" : "submitted" } : e
        )
      );
    } catch {
      setUpdateError("変更に失敗しました。もう一度お試しください");
    } finally {
      setUpdating(false);
    }
  };

  // 提出済みなら提出物を、未提出なら下書きを見せる
  const shown = detail?.submission ?? detail?.work ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={classValue}
          onChange={(e) => {
            setClassValue(e.target.value);
            setSelectedId(null);
            setDetail(null);
          }}
          aria-label="クラス"
          className="px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {classes.map((c) => (
            <option key={`${c.grade}-${c.classNum}`} value={`${c.grade}-${c.classNum}`}>
              {c.grade}年{c.classNum}組
            </option>
          ))}
          {hasNoNumberStudents && <option value={NO_NUMBER}>学籍番号が未設定</option>}
        </select>
        <p className="text-sm text-muted-foreground">
          提出 {submittedCount} / {entries.length} 人
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-6 items-start">
        <div className="grid gap-1.5">
          {entries.map((entry) => (
            <button
              key={entry.userId}
              onClick={() => openStudent(entry.userId)}
              className={`text-left rounded-lg border p-3 transition-colors hover:border-indigo-400 ${
                entry.userId === selectedId
                  ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40"
                  : "bg-card"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">
                  {entry.studentNumber ?? "番号なし"} {entry.displayName}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_LABELS[entry.status].className}`}
                >
                  {STATUS_LABELS[entry.status].label}
                </span>
              </span>
              {entry.title && (
                <span className="block text-xs text-muted-foreground mt-1 truncate">
                  {entry.title}
                </span>
              )}
            </button>
          ))}
          {entries.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">生徒がいません</p>
          )}
        </div>

        {selected ? (
          <div className="rounded-lg border bg-card p-4 space-y-4 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">
                  {selected.studentNumber ?? "番号なし"} {selected.displayName}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {STATUS_LABELS[selected.status].label}
                  {selected.hasUnsubmittedChanges && "（提出後に下書きが更新されています）"}
                </p>
              </div>
              {(selected.status === "submitted" || selected.status === "hidden") && (
                <SubmitButton
                  loading={updating}
                  loadingLabel="変更中..."
                  onClick={() => toggleHidden(selected)}
                  className="px-3 py-1.5 text-xs rounded-md border hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {selected.status === "hidden" ? "公開を再開" : "公開停止"}
                </SubmitButton>
              )}
            </div>
            {updateError && <p className="text-xs text-red-600 dark:text-red-400">{updateError}</p>}
            {loadError && <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>}

            {detail && !shown && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                まだ何も保存されていません
              </p>
            )}

            {shown && (
              <>
                <section className="space-y-1">
                  <h3 className="text-sm font-semibold">課題設定</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {detail?.work?.plan || "（未記入）"}
                  </p>
                </section>
                <section className="space-y-1">
                  <h3 className="text-sm font-semibold">
                    作品名{!detail?.submission && "（下書き）"}
                  </h3>
                  <p className="text-sm">{shown.title || "（未記入）"}</p>
                </section>
                <section className="space-y-1">
                  <h3 className="text-sm font-semibold">説明</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {shown.description || "（未記入）"}
                  </p>
                </section>
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">コード</h3>
                  <pre className="text-xs font-mono bg-muted/40 rounded p-3 overflow-x-auto">
                    {shown.code || "（未記入）"}
                  </pre>
                  {shown.code && <MakerConsole key={selected.userId} code={shown.code} />}
                </section>
              </>
            )}
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">
            生徒を選ぶと、課題設定と作品が表示されます
          </p>
        )}
      </div>
    </div>
  );
}
