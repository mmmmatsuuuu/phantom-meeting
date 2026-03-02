# アーキテクチャ

## データ取得・更新方針

- **API Routes**：データ取得・更新・外部連携（OpenAI、YouTube含む）
- **Server Actions**：フォーム送信のみ

## UIレイアウト（レッスンページ）

```
┌─────────────────────┬──────────────┐
│  [動画] [小テスト]  │              │
│                     │  自分のメモ  │
│   動画 or 小テスト  │  （tiptap）  │
│                     │              │
├─────────────────────┤              │
│  共有されたメモ一覧  │              │
└─────────────────────┴──────────────┘
```

- 左：動画・小テストをタブで切り替え
- 右：自分のメモ（常時表示、タブ切り替えで消えない）
- 左下：クラスに共有されたメモの一覧

## フォルダ構成

```
src/
├── app/
│   ├── (auth)/                            # ログイン・コールバック
│   ├── (admin)/                           # 管理者用ページ群
│   │   └── layout.tsx                     # 権限チェック
│   ├── (teacher)/                         # 教師用ページ群
│   │   ├── layout.tsx                     # 権限チェック
│   │   └── contents/
│   │       ├── new/                       # レッスン登録
│   │       └── [lessonId]/edit/           # レッスン編集
│   ├── (student)/                         # 生徒用ページ群
│   │   ├── layout.tsx                     # 権限チェック
│   │   └── contents/
│   │       ├── page.tsx                   # 科目一覧
│   │       └── [subjectId]/
│   │           ├── page.tsx               # 単元一覧
│   │           └── [unitId]/
│   │               ├── page.tsx           # レッスン一覧
│   │               └── [lessonId]/
│   │                   └── page.tsx       # レッスンページ（動画・小テスト・メモ）
│   └── api/
│       ├── contents/
│       ├── questions/
│       ├── memos/
│       ├── posts/
│       ├── quizzes/
│       └── ai/
├── components/
│   ├── ui/                                # shadcn/ui
│   ├── video/
│   ├── memo/
│   ├── quiz/
│   └── shared/
├── lib/
│   ├── supabase/
│   └── openai/
└── types/
```
