/**
 * AI 振り返りプロンプト（Phase 19b）の生成。
 *
 * 生徒1人×1単元の学習データ（API で取得・テキスト化済み）から、生徒が自分の使いたい AI に
 * 貼り付けるプロンプトを組み立てる。仕様は docs/roadmap.md の Phase 19b を参照。
 * ブラウザでも動く純粋関数（オプションの切り替えをその場で反映するため）。
 */

export type ReviewQuestionType = "multiple_choice" | "short_answer" | "ordering";

export type ReviewQuizQuestion = {
  id: string;
  /** 1始まりの設問番号（Q1, Q2 …） */
  number: number;
  type: ReviewQuestionType;
  contentText: string;
  correctAnswerText: string;
};

export type ReviewAttempt = {
  submittedAt: string;
  score: number;
  maxScore: number;
  answers: { questionId: string; isCorrect: boolean | null; answerText: string }[];
};

export type ReviewMemo = {
  text: string;
  createdAt: string;
  hasTimestamp: boolean;
  shared: boolean;
};

export type ReviewSnippet = {
  title: string;
  language: string;
  initialCode: string;
  /** 生徒の保存済みコード。保存がなければ null */
  code: string | null;
  lastOutput: string | null;
};

export type ReviewLesson = {
  id: string;
  title: string;
  /** 発問 */
  questions: string[];
  quiz: {
    questions: ReviewQuizQuestion[];
    /** 新しい順 */
    attempts: ReviewAttempt[];
  } | null;
  /** 作成日時の古い順 */
  memos: ReviewMemo[];
  /** プレイグラウンドのないレッスンは空 */
  snippets: ReviewSnippet[];
};

export type ReviewData = {
  subjectName: string;
  unitName: string;
  /** 単元内の順 */
  lessons: ReviewLesson[];
};

export type ReviewPromptOptions = {
  includeMemoText: boolean;
  now: Date;
};

export type ReviewPromptResult = {
  text: string;
  length: number;
  /** 上限に収めるためにメモの本文を短くした・省いた */
  memoTrimmed: boolean;
  /** 上限に収めるために省いたコードのレッスン数 */
  omittedCodeLessonCount: number;
};

export const PROMPT_CHAR_LIMIT = 10_000;
const MAX_ATTEMPTS_SHOWN = 5;
const MAX_WRONG_QUESTIONS = 10;
const QUESTION_TEXT_LIMIT = 100;
const SHORT_ANSWER_LIMIT = 100;
const MEMO_EXCERPT_LIMIT = 300;
const MEMO_EXCERPT_MIN = 50;
const MEMO_EXCERPT_STEP = 50;
const OUTPUT_LIMIT = 200;
/** 「何度受けても間違えている」の判定に使う直近の受験回数（/quiz-results と同じ） */
const FREQUENT_MISS_WINDOW = 3;
const TRIMMED_NOTE = "（字数の上限のため省略）";

const TIME_ZONE = "Asia/Tokyo";
const shortDateFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: TIME_ZONE,
  month: "numeric",
  day: "numeric",
});
const fullDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const TEMPLATE_HEAD = `# ロール
あなたは高校で情報を教えるプロフェッショナルです。コンピュータサイエンスなどの情報分野の知識だけでなく教育の知見もあり、生徒に的確なアドバイスができます。

# 指示
このメッセージを送っているのは、下のデータの本人である生徒です。生徒に直接語りかけてください。
以下のデータをもとに生徒にアドバイスをしてください。

最初の返信では、まずデータから読み取れることを、次の観点ごとに2〜3文で簡潔に伝えてください（詳しいアドバイスはまだ書かないでください）。
- 小テストの結果
- メモの傾向
- コードの書き方（データに「コード」がある場合のみ）

そのうえで、どのようなアドバイスがほしいか質問をしてください。質問を思いつかない生徒もいるので、以下のような例を提示してください。
- 点数を上げたい・苦手をなくしたい
- 勉強のやり方を見直したい
- 授業の内容をもっと深く知りたい
- 何から手をつければいいか分からない

その後は生徒の回答に応じて、データの分析結果をもとにアドバイスをしてください。単発のやりとりで終わると表面的なアドバイスで終わるので、生徒の自己改善が深まるように適宜質問をしていってください。
データにない情報（この単元で立てた目標、単元テストの結果と実施日、動画の見方など）は、必要に応じて生徒に尋ねてください。

# データ
（データの読み方）
- 得点率は自動採点の問題（選択式・並び替え）だけで計算しています。記述式は生徒の自己採点のため、得点率に含みません
- 小テストは何度でも受け直せます
- 日付は受験・メモ作成の日です`;

const TEMPLATE_TAIL =
  "最初の返信は、観点ごとの簡潔な読み取りと、どのようなアドバイスがほしいかの質問だけにしてください。";

// ─── 上限処理 ─────────────────────────────────────────────────────

/**
 * プロンプトを生成する。上限（10,000字）を超える場合は次の順で削る。
 * 1. メモの本文を全レッスンで均等に短くし、それでも超えるなら本文を省く
 * 2. コードをレッスン単位で後半から取り込み、収まらなくなったところで打ち切る
 */
export function buildReviewPrompt(
  data: ReviewData,
  options: ReviewPromptOptions
): ReviewPromptResult {
  const codeLessonIds = data.lessons.filter((l) => l.snippets.length > 0).map((l) => l.id);
  const allCode = new Set(codeLessonIds);

  const render = (memoLimit: number | null, codeIds: Set<string>) =>
    renderPrompt(data, options, memoLimit, codeIds);
  const result = (text: string, memoTrimmed: boolean, codeIds: Set<string>) => ({
    text,
    length: text.length,
    memoTrimmed,
    omittedCodeLessonCount: codeLessonIds.length - codeIds.size,
  });

  const memoLimits: (number | null)[] = [];
  if (options.includeMemoText) {
    for (let limit = MEMO_EXCERPT_LIMIT; limit >= MEMO_EXCERPT_MIN; limit -= MEMO_EXCERPT_STEP) {
      memoLimits.push(limit);
    }
  }
  memoLimits.push(null);

  for (const [i, memoLimit] of memoLimits.entries()) {
    const text = render(memoLimit, allCode);
    if (text.length <= PROMPT_CHAR_LIMIT) return result(text, i > 0, allCode);
  }

  // メモの本文を省いても超える：後半のレッスンから順にコードを取り込む
  const memoTrimmed = options.includeMemoText;
  let included = new Set<string>();
  for (const id of [...codeLessonIds].reverse()) {
    const next = new Set([...included, id]);
    if (render(null, next).length > PROMPT_CHAR_LIMIT) break;
    included = next;
  }
  return result(render(null, included), memoTrimmed, included);
}

// ─── 組み立て ─────────────────────────────────────────────────────

function renderPrompt(
  data: ReviewData,
  options: ReviewPromptOptions,
  /** メモ本文の1レッスンあたりの上限。null は上限のため省略 */
  memoLimit: number | null,
  codeLessonIds: Set<string>
): string {
  const lessons = data.lessons.map((lesson, i) => ({ lesson, no: i + 1 }));
  const sections = [
    TEMPLATE_HEAD,
    `## 科目\n${data.subjectName}`,
    `## 単元\n${data.unitName}（全${data.lessons.length}レッスン）／出力日 ${fullDateFormat.format(options.now)}`,
    "## 学習データ",
    quizSection(lessons),
    wrongQuestionsSection(lessons),
    frequentlyMissedSection(lessons),
    shortAnswerSection(lessons),
    hatsumonSection(lessons),
    memoStatsSection(lessons),
  ];
  if (options.includeMemoText) sections.push(memoExcerptSection(lessons, memoLimit));
  if (lessons.some(({ lesson }) => lesson.snippets.length > 0)) {
    sections.push(codeSection(lessons, codeLessonIds));
  }
  sections.push(TEMPLATE_TAIL);
  return sections.join("\n\n");
}

type NumberedLesson = { lesson: ReviewLesson; no: number };

function quizSection(lessons: NumberedLesson[]): string {
  const rows = lessons.map(({ lesson, no }) => {
    const label = cell(`${no} ${lesson.title}`);
    if (!lesson.quiz) return `| ${label} | 小テストなし | ― |`;
    const { attempts, questions } = lesson.quiz;
    if (attempts.length === 0) return `| ${label} | 未受験 | ― |`;
    return `| ${label} | ${attemptHistory(attempts)} | ${latestMarks(questions, attempts[0])} |`;
  });
  return [
    "### 小テスト",
    "| レッスン | 受験の推移（日付 得点率） | 最新の受験の正誤（－は記述式） |",
    "|---|---|---|",
    ...rows,
  ].join("\n");
}

/** 新しい順の受験から直近5回を古い順に並べる */
function attemptHistory(attempts: ReviewAttempt[]): string {
  const shown = attempts.slice(0, MAX_ATTEMPTS_SHOWN).reverse();
  const history = shown
    .map((a) => `${shortDateFormat.format(new Date(a.submittedAt))} ${rateText(a)}`)
    .join(" → ");
  const older = attempts.length - shown.length;
  return older > 0 ? `（ほか${older}回） ${history}` : history;
}

function rateText(attempt: ReviewAttempt): string {
  if (attempt.maxScore === 0) return "記述式のみ";
  return `${Math.round((attempt.score / attempt.maxScore) * 100)}%`;
}

function latestMarks(questions: ReviewQuizQuestion[], latest: ReviewAttempt): string {
  const byQuestion = new Map(latest.answers.map((a) => [a.questionId, a]));
  return questions
    .filter((q) => byQuestion.has(q.id))
    .map((q) => {
      const isCorrect = byQuestion.get(q.id)!.isCorrect;
      return `Q${q.number}${isCorrect === null ? "－" : isCorrect ? "○" : "✕"}`;
    })
    .join(" ");
}

function wrongQuestionsSection(lessons: NumberedLesson[]): string {
  const items: string[] = [];
  for (const { lesson, no } of lessons) {
    const latest = lesson.quiz?.attempts[0];
    if (!lesson.quiz || !latest) continue;
    const byQuestion = new Map(latest.answers.map((a) => [a.questionId, a]));
    for (const q of lesson.quiz.questions) {
      const answer = byQuestion.get(q.id);
      if (answer?.isCorrect !== false) continue;
      const label = q.type === "ordering" ? "自分の順" : "自分の回答";
      items.push(
        `- ${no}-Q${q.number}（${TYPE_LABELS[q.type]}）「${truncate(q.contentText, QUESTION_TEXT_LIMIT)}」\n` +
          `  ${label}：${answer.answerText || "（無回答）"} ／ 正解：${q.correctAnswerText}`
      );
    }
  }
  const shown = items.slice(0, MAX_WRONG_QUESTIONS);
  if (items.length > shown.length) shown.push(`- ほか${items.length - shown.length}問`);
  return ["### 最新の受験で間違えた問題", ...(shown.length > 0 ? shown : ["なし"])].join("\n");
}

const TYPE_LABELS: Record<ReviewQuestionType, string> = {
  multiple_choice: "選択式",
  short_answer: "記述式",
  ordering: "並び替え",
};

/** 直近3回のうち2回以上回答し、過半数が✕の設問（/quiz-results の「よく間違える設問」と同じ判定） */
function frequentlyMissedSection(lessons: NumberedLesson[]): string {
  const items: string[] = [];
  for (const { lesson, no } of lessons) {
    if (!lesson.quiz) continue;
    const recent = lesson.quiz.attempts.slice(0, FREQUENT_MISS_WINDOW);
    for (const q of lesson.quiz.questions) {
      const graded = recent
        .map((a) => a.answers.find((ans) => ans.questionId === q.id)?.isCorrect)
        .filter((c): c is boolean => c === true || c === false);
      const wrong = graded.filter((c) => !c).length;
      if (graded.length >= 2 && wrong > graded.length / 2) {
        items.push(`- ${no}-Q${q.number}（直近${graded.length}回中${wrong}回✕）`);
      }
    }
  }
  return ["### 何度受けても間違えている問題", ...(items.length > 0 ? items : ["なし"])].join("\n");
}

function shortAnswerSection(lessons: NumberedLesson[]): string {
  const items: string[] = [];
  for (const { lesson, no } of lessons) {
    const latest = lesson.quiz?.attempts[0];
    if (!lesson.quiz || !latest) continue;
    const byQuestion = new Map(latest.answers.map((a) => [a.questionId, a]));
    for (const q of lesson.quiz.questions) {
      if (q.type !== "short_answer") continue;
      const answer = byQuestion.get(q.id);
      if (!answer) continue;
      items.push(
        `- ${no}-Q${q.number}「${truncate(q.contentText, QUESTION_TEXT_LIMIT)}」\n` +
          `  自分の回答：${truncate(answer.answerText, SHORT_ANSWER_LIMIT) || "（無回答）"} ／ ` +
          `模範解答：${truncate(q.correctAnswerText, SHORT_ANSWER_LIMIT)}`
      );
    }
  }
  return ["### 記述式（最新の回答・自己採点）", ...(items.length > 0 ? items : ["なし"])].join("\n");
}

function hatsumonSection(lessons: NumberedLesson[]): string {
  const items = lessons
    .filter(({ lesson }) => lesson.questions.length > 0)
    .map(({ lesson, no }) => `- ${no} ${lesson.title}：${lesson.questions.join(" ／ ")}`);
  return ["### 発問", ...(items.length > 0 ? items : ["なし"])].join("\n");
}

function memoStatsSection(lessons: NumberedLesson[]): string {
  const rows = lessons.map(({ lesson, no }) => {
    const memos = lesson.memos;
    const chars = memos.reduce((sum, m) => sum + m.text.length, 0);
    const dates = [...new Set(memos.map((m) => shortDateFormat.format(new Date(m.createdAt))))];
    return (
      `| ${cell(`${no} ${lesson.title}`)} | ${memos.length} | ${chars} | ` +
      `${memos.filter((m) => m.hasTimestamp).length} | ${memos.filter((m) => m.shared).length} | ` +
      `${dates.length > 0 ? dates.join(", ") : "―"} |`
    );
  });
  return [
    "### メモの取り方",
    "| レッスン | 件数 | 合計文字数 | 動画の時刻つき | クラスに共有 | 作成日 |",
    "|---|---|---|---|---|---|",
    ...rows,
  ].join("\n");
}

function memoExcerptSection(lessons: NumberedLesson[], limit: number | null): string {
  if (limit === null) return `### メモの抜粋\n${TRIMMED_NOTE}`;
  const items = lessons
    .map(({ lesson, no }) => {
      const joined = lesson.memos.map((m) => m.text).filter((t) => t !== "").join("／");
      return joined ? `- ${no} ${lesson.title}：${truncate(joined, limit)}` : null;
    })
    .filter((item): item is string => item !== null);
  return [`### メモの抜粋（各レッスン${limit}字まで）`, ...(items.length > 0 ? items : ["なし"])].join("\n");
}

function codeSection(lessons: NumberedLesson[], included: Set<string>): string {
  const blocks = lessons
    .filter(({ lesson }) => lesson.snippets.length > 0)
    .map(({ lesson, no }) => {
      const heading = `#### ${no} ${lesson.title}`;
      if (!included.has(lesson.id)) return `${heading}\n${TRIMMED_NOTE}`;
      return [heading, ...lesson.snippets.map(snippetBlock)].join("\n");
    });
  return ["### コード（教師が配った初期コードと、それを生徒が編集したもの）", ...blocks].join("\n\n");
}

function snippetBlock(snippet: ReviewSnippet): string {
  const name = `- ${snippet.title}（${snippet.language}）`;
  if (snippet.code === null || snippet.code === snippet.initialCode) return `${name}：未編集`;
  const lines = [
    name,
    "初期コード：",
    fence(snippet.initialCode, snippet.language),
    "生徒のコード：",
    fence(snippet.code, snippet.language),
  ];
  if (snippet.lastOutput) {
    lines.push("直近の実行結果：", fence(truncate(snippet.lastOutput, OUTPUT_LIMIT), ""));
  }
  return lines.join("\n");
}

// ─── 文字列ユーティリティ ───────────────────────────────────────────

function fence(body: string, language: string): string {
  return `\`\`\`${language}\n${body.replace(/\n+$/, "")}\n\`\`\``;
}

function truncate(text: string, limit: number): string {
  const trimmed = text.trim();
  return trimmed.length > limit ? `${trimmed.slice(0, limit)}…` : trimmed;
}

/** Markdown の表のセルを壊さないよう、区切り文字と改行を置き換える */
function cell(text: string): string {
  return text.replace(/\|/g, "｜").replace(/\s*\n\s*/g, " ");
}
