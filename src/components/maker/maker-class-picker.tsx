"use client";

import { useRouter } from "next/navigation";

const GRADES = [1, 2, 3];
const CLASSES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type Props = {
  eventId: string;
  grade: number;
  classNum: number;
};

/** 作品展で表示するクラスの切り替え。クラス単位で取得するため、選ぶたびにそのクラスの作品だけを読み込む */
export default function MakerClassPicker({ eventId, grade, classNum }: Props) {
  const router = useRouter();

  const go = (nextGrade: number, nextClass: number) => {
    router.push(`/maker/${eventId}/gallery?grade=${nextGrade}&class=${nextClass}`);
  };

  const selectClass =
    "px-2 py-1 text-sm rounded-sm border border-rule-strong bg-sheet focus:outline-none focus:border-ink";

  return (
    <div className="flex items-center gap-2 text-sm">
      <select
        aria-label="学年"
        value={grade}
        onChange={(e) => go(Number(e.target.value), classNum)}
        className={selectClass}
      >
        {GRADES.map((g) => (
          <option key={g} value={g}>
            {g}年
          </option>
        ))}
      </select>
      <select
        aria-label="組"
        value={classNum}
        onChange={(e) => go(grade, Number(e.target.value))}
        className={selectClass}
      >
        {CLASSES.map((c) => (
          <option key={c} value={c}>
            {c}組
          </option>
        ))}
      </select>
      <span className="text-xs text-muted-foreground">の作品</span>
    </div>
  );
}
