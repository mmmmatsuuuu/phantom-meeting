import { describe, expect, it } from "vitest";
import {
  PROMPT_CHAR_LIMIT,
  buildReviewPrompt,
  type ReviewAttempt,
  type ReviewData,
  type ReviewLesson,
  type ReviewQuizQuestion,
} from "@/lib/review-prompt";

// 2026-10-04 01:00 JST
const NOW = new Date("2026-10-03T16:00:00Z");

function lesson(overrides: Partial<ReviewLesson> & { id: string }): ReviewLesson {
  return {
    title: `レッスン${overrides.id}`,
    questions: [],
    quiz: null,
    memos: [],
    snippets: [],
    ...overrides,
  };
}

function unit(lessons: ReviewLesson[]): ReviewData {
  return { subjectName: "情報Ⅰ", unitName: "2章 情報デザイン", lessons };
}

const Q_MC: ReviewQuizQuestion = {
  id: "q1",
  number: 1,
  type: "multiple_choice",
  contentText: "UDの原則に含まれないものは？",
  correctAnswerText: "デザインが美しい",
};
const Q_ORDER: ReviewQuizQuestion = {
  id: "q2",
  number: 2,
  type: "ordering",
  contentText: "手順を並べよ",
  correctAnswerText: "A → B → C",
};
const Q_SHORT: ReviewQuizQuestion = {
  id: "q3",
  number: 3,
  type: "short_answer",
  contentText: "UDを説明せよ",
  correctAnswerText: "誰にとっても使いやすい設計",
};

function attempt(
  submittedAt: string,
  correct: { q1: boolean; q2: boolean },
  shortAnswer = "みんなが使える"
): ReviewAttempt {
  const score = Number(correct.q1) + Number(correct.q2);
  return {
    submittedAt,
    score,
    maxScore: 2,
    answers: [
      { questionId: "q1", isCorrect: correct.q1, answerText: correct.q1 ? "デザインが美しい" : "公平に使える" },
      { questionId: "q2", isCorrect: correct.q2, answerText: correct.q2 ? "A → B → C" : "B → A → C" },
      { questionId: "q3", isCorrect: null, answerText: shortAnswer },
    ],
  };
}

const build = (data: ReviewData, includeMemoText = true) =>
  buildReviewPrompt(data, { includeMemoText, now: NOW });

describe("buildReviewPrompt: 基本構成", () => {
  it("指示・科目・単元（レッスン数・日本時間の出力日）・末尾の再指示を含む", () => {
    const { text } = build(unit([lesson({ id: "1" })]));
    expect(text.startsWith("# ロール")).toBe(true);
    expect(text).toContain("## 科目\n情報Ⅰ");
    expect(text).toContain("2章 情報デザイン（全1レッスン）／出力日 2026-10-04");
    expect(text.endsWith("どのようなアドバイスがほしいかの質問だけにしてください。")).toBe(true);
  });

  it("小テストのないレッスン・未受験のレッスンをそれぞれ明記する", () => {
    const { text } = build(
      unit([
        lesson({ id: "1" }),
        lesson({ id: "2", quiz: { questions: [Q_MC], attempts: [] } }),
      ])
    );
    expect(text).toContain("| 1 レッスン1 | 小テストなし | ― |");
    expect(text).toContain("| 2 レッスン2 | 未受験 | ― |");
  });
});

describe("buildReviewPrompt: 小テスト", () => {
  const quizLesson = (attempts: ReviewAttempt[]) =>
    lesson({ id: "1", quiz: { questions: [Q_MC, Q_ORDER, Q_SHORT], attempts } });

  it("受験の推移は直近5回を古い順に並べ、それより前は回数だけ示す", () => {
    const attempts = [
      attempt("2026-09-30T01:00:00Z", { q1: true, q2: true }),
      attempt("2026-09-29T01:00:00Z", { q1: true, q2: false }),
      attempt("2026-09-28T01:00:00Z", { q1: false, q2: false }),
      attempt("2026-09-27T01:00:00Z", { q1: false, q2: false }),
      attempt("2026-09-26T01:00:00Z", { q1: false, q2: false }),
      attempt("2026-09-25T01:00:00Z", { q1: false, q2: false }),
    ];
    const { text } = build(unit([quizLesson(attempts)]));
    expect(text).toContain("（ほか1回） 9/26 0% → 9/27 0% → 9/28 0% → 9/29 50% → 9/30 100%");
  });

  it("最新の受験の正誤を ○ / ✕ / －（記述式）で示す", () => {
    const { text } = build(unit([quizLesson([attempt("2026-09-30T01:00:00Z", { q1: true, q2: false })])]));
    expect(text).toContain("Q1○ Q2✕ Q3－");
  });

  it("間違えた問題は最新の受験の✕だけを、自分の回答と正解つきで載せる", () => {
    const attempts = [
      attempt("2026-09-30T01:00:00Z", { q1: true, q2: false }),
      attempt("2026-09-29T01:00:00Z", { q1: false, q2: false }),
    ];
    const { text } = build(unit([quizLesson(attempts)]));
    const section = text.split("### 最新の受験で間違えた問題")[1].split("###")[0];
    expect(section).toContain("1-Q2（並び替え）「手順を並べよ」\n  自分の順：B → A → C ／ 正解：A → B → C");
    expect(section).not.toContain("1-Q1");
  });

  it("間違えた問題は最大10問で、超えた分は件数だけ示す。問題文は100字で切る", () => {
    const questions: ReviewQuizQuestion[] = Array.from({ length: 12 }, (_, i) => ({
      id: `w${i}`,
      number: i + 1,
      type: "multiple_choice",
      contentText: "あ".repeat(120),
      correctAnswerText: "正解",
    }));
    const latest: ReviewAttempt = {
      submittedAt: "2026-09-30T01:00:00Z",
      score: 0,
      maxScore: 12,
      answers: questions.map((q) => ({ questionId: q.id, isCorrect: false, answerText: "誤答" })),
    };
    const { text } = build(unit([lesson({ id: "1", quiz: { questions, attempts: [latest] } })]));
    expect(text).toContain("1-Q10（選択式）");
    expect(text).not.toContain("1-Q11（選択式）");
    expect(text).toContain("- ほか2問");
    expect(text).toContain(`「${"あ".repeat(100)}…」`);
  });

  it("何度受けても間違えている問題は、直近3回で2回以上回答し過半数が✕のもの", () => {
    const attempts = [
      attempt("2026-09-30T01:00:00Z", { q1: true, q2: false }),
      attempt("2026-09-29T01:00:00Z", { q1: false, q2: false }),
      attempt("2026-09-28T01:00:00Z", { q1: true, q2: true }),
      // 直近3回の外：数えない
      attempt("2026-09-27T01:00:00Z", { q1: false, q2: false }),
    ];
    const { text } = build(unit([quizLesson(attempts)]));
    const section = text.split("### 何度受けても間違えている問題")[1].split("###")[0];
    expect(section).toContain("1-Q2（直近3回中2回✕）");
    expect(section).not.toContain("1-Q1");
  });

  it("記述式は最新の回答と模範解答を載せる", () => {
    const attempts = [
      attempt("2026-09-30T01:00:00Z", { q1: true, q2: true }, "最新の回答"),
      attempt("2026-09-29T01:00:00Z", { q1: true, q2: true }, "前の回答"),
    ];
    const { text } = build(unit([quizLesson(attempts)]));
    expect(text).toContain("自分の回答：最新の回答 ／ 模範解答：誰にとっても使いやすい設計");
    expect(text).not.toContain("前の回答");
  });
});

describe("buildReviewPrompt: 発問・メモ", () => {
  const memoLesson = lesson({
    id: "1",
    questions: ["なぜ色の作り方が違うのか？"],
    memos: [
      { text: "RGBは光", createdAt: "2026-09-10T01:00:00Z", hasTimestamp: true, shared: true },
      { text: "CMYはインク", createdAt: "2026-09-10T02:00:00Z", hasTimestamp: false, shared: false },
    ],
  });

  it("発問とメモの取り方（件数・文字数・時刻つき・共有・作成日）を載せる", () => {
    const { text } = build(unit([memoLesson]));
    expect(text).toContain("- 1 レッスン1：なぜ色の作り方が違うのか？");
    expect(text).toContain("| 1 レッスン1 | 2 | 12 | 1 | 1 | 9/10 |");
  });

  it("メモの本文は「／」で結合して載せ、含めない設定なら抜粋の節ごと出さない", () => {
    expect(build(unit([memoLesson])).text).toContain("- 1 レッスン1：RGBは光／CMYはインク");
    const without = build(unit([memoLesson]), false).text;
    expect(without).not.toContain("### メモの抜粋");
    expect(without).toContain("### メモの取り方");
  });
});

describe("buildReviewPrompt: コード", () => {
  const snippet = (code: string | null) => ({
    title: "例1",
    language: "python",
    initialCode: "print('hello')",
    code,
    lastOutput: "hello",
  });

  it("未編集のコードは「未編集」とだけ書き、編集したものは初期コードと生徒のコードを載せる", () => {
    const { text } = build(
      unit([
        lesson({ id: "1", snippets: [snippet(null)] }),
        lesson({ id: "2", snippets: [snippet("print('hello')")] }),
        lesson({ id: "3", snippets: [snippet("name = input()\nprint(name)")] }),
      ])
    );
    expect(text).toContain("#### 1 レッスン1\n- 例1（python）：未編集");
    expect(text).toContain("#### 2 レッスン2\n- 例1（python）：未編集");
    expect(text).toContain("生徒のコード：\n```python\nname = input()\nprint(name)\n```");
    expect(text).toContain("直近の実行結果：\n```\nhello\n```");
  });

  it("プレイグラウンドのない単元にはコードの節を出さない", () => {
    expect(build(unit([lesson({ id: "1" })])).text).not.toContain("### コード");
  });
});

describe("buildReviewPrompt: 上限（10,000字）", () => {
  const memo = (text: string) => ({
    text,
    createdAt: "2026-09-10T01:00:00Z",
    hasTimestamp: false,
    shared: false,
  });
  const codeLesson = (id: string, codeLength: number) =>
    lesson({
      id,
      snippets: [
        {
          title: "例1",
          language: "python",
          initialCode: "a".repeat(codeLength),
          code: "b".repeat(codeLength),
          lastOutput: null,
        },
      ],
    });

  it("上限内ならメモの本文は300字のまま", () => {
    const result = build(unit([lesson({ id: "1", memos: [memo("x".repeat(500))] })]));
    expect(result.memoTrimmed).toBe(false);
    expect(result.text).toContain("### メモの抜粋（各レッスン300字まで）");
  });

  it("超える場合はまずメモの本文を均等に短くする", () => {
    const lessons = Array.from({ length: 30 }, (_, i) =>
      lesson({ id: String(i + 1), memos: [memo("x".repeat(500))] })
    );
    const result = build(unit(lessons));
    expect(result.length).toBeLessThanOrEqual(PROMPT_CHAR_LIMIT);
    expect(result.memoTrimmed).toBe(true);
    expect(result.text).not.toContain("各レッスン300字まで");
    expect(result.text).toMatch(/### メモの抜粋（各レッスン\d+字まで）/);
  });

  it("メモの本文を省いても超える場合は、後半のレッスンからコードを取り込む", () => {
    const result = build(
      unit([codeLesson("1", 1750), codeLesson("2", 1750), codeLesson("3", 1750)])
    );
    expect(result.length).toBeLessThanOrEqual(PROMPT_CHAR_LIMIT);
    expect(result.omittedCodeLessonCount).toBe(1);
    expect(result.text).toContain("#### 1 レッスン1\n（字数の上限のため省略）");
    expect(result.text).toContain("#### 3 レッスン3\n- 例1（python）");
    expect(result.text).toContain("#### 2 レッスン2\n- 例1（python）");
  });

  it("後半のレッスンのコードが収まらなければ、そこで打ち切る（前半だけを取り込むことはしない）", () => {
    const result = build(unit([codeLesson("1", 100), codeLesson("2", 6000)]));
    expect(result.omittedCodeLessonCount).toBe(2);
    expect(result.text).toContain("#### 1 レッスン1\n（字数の上限のため省略）");
  });
});
