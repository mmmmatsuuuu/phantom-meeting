import { classOf, gradeOf } from "@/lib/student-number";

export type MakerRosterStatus = "hidden" | "submitted" | "draft" | "not_started";

export type MakerRosterEntry = {
  userId: string;
  displayName: string;
  studentNumber: number | null;
  status: MakerRosterStatus;
  /** 提出後に下書きが更新されている（再提出していない変更がある） */
  hasUnsubmittedChanges: boolean;
  title: string;
};

type RosterProfile = {
  id: string;
  display_name: string;
  student_number: number | null;
  role: string;
};
type RosterWork = { user_id: string; title: string; updated_at: string };
type RosterSubmission = {
  user_id: string;
  title: string;
  submitted_at: string;
  hidden_at: string | null;
};

/** 生徒全員の提出状況を学籍番号順（未設定は最後）に返す。下書きも提出もない生徒は未着手とする */
export function buildMakerRoster(
  profiles: RosterProfile[],
  works: RosterWork[],
  submissions: RosterSubmission[]
): MakerRosterEntry[] {
  const workByUser = new Map(works.map((w) => [w.user_id, w]));
  const submissionByUser = new Map(submissions.map((s) => [s.user_id, s]));

  return profiles
    .filter((p) => p.role === "student")
    .map((p): MakerRosterEntry => {
      const work = workByUser.get(p.id);
      const submission = submissionByUser.get(p.id);
      let status: MakerRosterStatus = "not_started";
      if (submission) status = submission.hidden_at ? "hidden" : "submitted";
      else if (work) status = "draft";
      return {
        userId: p.id,
        displayName: p.display_name,
        studentNumber: p.student_number,
        status,
        hasUnsubmittedChanges:
          submission !== undefined &&
          work !== undefined &&
          new Date(work.updated_at) > new Date(submission.submitted_at),
        title: submission?.title ?? work?.title ?? "",
      };
    })
    .sort(
      (a, b) =>
        (a.studentNumber ?? Number.MAX_SAFE_INTEGER) -
        (b.studentNumber ?? Number.MAX_SAFE_INTEGER)
    );
}

/** 指定クラスの生徒に絞り込む。null を渡すと学籍番号が未設定の生徒を返す */
export function filterRosterByClass(
  roster: MakerRosterEntry[],
  target: { grade: number; classNum: number } | null
): MakerRosterEntry[] {
  return roster.filter(({ studentNumber }) => {
    if (studentNumber === null) return target === null;
    return (
      target !== null &&
      gradeOf(studentNumber) === target.grade &&
      classOf(studentNumber) === target.classNum
    );
  });
}
