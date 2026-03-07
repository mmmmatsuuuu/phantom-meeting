// =====================
// 型定義（DBスキーマに準拠）
// =====================

export type Role = "admin" | "teacher" | "student";

export type Subject = {
  id: string;
  name: string;
  order: number;
  created_by: string;
  created_at: string;
};

export type Unit = {
  id: string;
  subject_id: string;
  name: string;
  order: number;
  created_at: string;
};

export type Lesson = {
  id: string;
  unit_id: string;
  title: string;
  youtube_url: string;
  order: number;
  created_at: string;
};

export type Question = {
  id: string;
  lesson_id: string;
  content: string;
  order: number;
  created_at: string;
};

export type TiptapText = {
  type: "text";
  text: string;
};

export type TiptapParagraph = {
  type: "paragraph";
  content?: TiptapText[];
};

export type TiptapContent = {
  type: "doc";
  content: TiptapParagraph[];
};

export type Memo = {
  id: string;
  lesson_id: string;
  user_id: string;
  content: TiptapContent;
  timestamp_seconds: number | null;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  memo_id: string;
  lesson_id: string;
  content: TiptapContent;
  created_at: string;
};

// =====================
// ダミーデータ
// =====================

export const MOCK_SUBJECTS: Subject[] = [
  {
    id: "subject-1",
    name: "情報Ⅰ",
    order: 1,
    created_by: "teacher-1",
    created_at: "2024-04-01T00:00:00Z",
  },
];

export const MOCK_UNITS: Unit[] = [
  {
    id: "unit-1",
    subject_id: "subject-1",
    name: "コンピュータとデジタル",
    order: 1,
    created_at: "2024-04-01T00:00:00Z",
  },
  {
    id: "unit-2",
    subject_id: "subject-1",
    name: "プログラミング基礎",
    order: 2,
    created_at: "2024-04-01T00:00:00Z",
  },
  {
    id: "unit-3",
    subject_id: "subject-1",
    name: "ネットワークと情報セキュリティ",
    order: 3,
    created_at: "2024-04-01T00:00:00Z",
  },
];

// youtube_url のIDはモック用ダミー（実際の動画IDに差し替える）
export const MOCK_LESSONS: Lesson[] = [
  {
    id: "lesson-1",
    unit_id: "unit-1",
    title: "CPUとメモリの役割",
    youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    order: 1,
    created_at: "2024-04-01T00:00:00Z",
  },
  {
    id: "lesson-2",
    unit_id: "unit-1",
    title: "2進数と情報の表現",
    youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    order: 2,
    created_at: "2024-04-01T00:00:00Z",
  },
  {
    id: "lesson-3",
    unit_id: "unit-2",
    title: "変数とデータ型",
    youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    order: 1,
    created_at: "2024-04-01T00:00:00Z",
  },
  {
    id: "lesson-4",
    unit_id: "unit-2",
    title: "条件分岐とループ",
    youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    order: 2,
    created_at: "2024-04-01T00:00:00Z",
  },
  {
    id: "lesson-5",
    unit_id: "unit-3",
    title: "インターネットの仕組み",
    youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    order: 1,
    created_at: "2024-04-01T00:00:00Z",
  },
];

export const MOCK_QUESTIONS: Question[] = [
  {
    id: "question-1",
    lesson_id: "lesson-1",
    content:
      "CPUとメモリをあなたの身の回りにあるものに例えると、それぞれ何に相当すると思いますか？その理由も考えてみてください。",
    order: 1,
    created_at: "2024-04-01T00:00:00Z",
  },
  {
    id: "question-2",
    lesson_id: "lesson-1",
    content:
      "コンピュータが高速に処理できる理由は何でしょうか？動画の内容をもとに、自分の言葉でまとめてみてください。",
    order: 2,
    created_at: "2024-04-01T00:00:00Z",
  },
  {
    id: "question-3",
    lesson_id: "lesson-2",
    content:
      "私たちが普段使っている10進数を、コンピュータが2進数で扱う理由は何だと思いますか？",
    order: 1,
    created_at: "2024-04-01T00:00:00Z",
  },
];

export const MOCK_POSTS: Post[] = [
  {
    id: "post-1",
    memo_id: "memo-1",
    lesson_id: "lesson-1",
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "CPUは料理人で、メモリはまな板みたいなものだと思った。料理人がたくさんの材料を同時に切るには、まな板が大きい方が効率的。これと同じで、メモリが大きいほど処理が速くなるのかな。",
            },
          ],
        },
      ],
    },
    created_at: "2024-04-02T10:30:00Z",
  },
  {
    id: "post-2",
    memo_id: "memo-2",
    lesson_id: "lesson-1",
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "「なぜスマホは熱くなるの？」と思っていたけど、CPUがたくさん処理をしているからなのかもしれない。処理が増えると発熱するって考えると納得できた。",
            },
          ],
        },
      ],
    },
    created_at: "2024-04-02T11:15:00Z",
  },
  {
    id: "post-3",
    memo_id: "memo-3",
    lesson_id: "lesson-1",
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "メモリは短期記憶、ストレージは長期記憶という説明で、人間の脳と同じ構造だと気づいた。進化の中で似たような仕組みに収束したのか、それとも人間が脳を参考にして設計したのか気になった。",
            },
          ],
        },
      ],
    },
    created_at: "2024-04-02T12:00:00Z",
  },
];

// =====================
// ヘルパー関数
// =====================

export function getLessonById(id: string): Lesson | undefined {
  return MOCK_LESSONS.find((l) => l.id === id);
}

export function getUnitById(id: string): Unit | undefined {
  return MOCK_UNITS.find((u) => u.id === id);
}

export function getSubjectById(id: string): Subject | undefined {
  return MOCK_SUBJECTS.find((s) => s.id === id);
}

export function getUnitsBySubjectId(subjectId: string): Unit[] {
  return MOCK_UNITS.filter((u) => u.subject_id === subjectId).sort(
    (a, b) => a.order - b.order
  );
}

export function getLessonsByUnitId(unitId: string): Lesson[] {
  return MOCK_LESSONS.filter((l) => l.unit_id === unitId).sort(
    (a, b) => a.order - b.order
  );
}

export function getQuestionsByLessonId(lessonId: string): Question[] {
  return MOCK_QUESTIONS.filter((q) => q.lesson_id === lessonId).sort(
    (a, b) => a.order - b.order
  );
}

export function getPostsByLessonId(lessonId: string): Post[] {
  return MOCK_POSTS.filter((p) => p.lesson_id === lessonId).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  return match?.[1] ?? null;
}
