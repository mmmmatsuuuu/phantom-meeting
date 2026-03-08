# アーキテクチャ

## データアクセス方針

```
[Server Component]  [Client Component]
        |                   |
        |             [API Route]      ← Client からの mutation のみ
        |                   |
        +-------+   +-------+
                |   |
          [src/lib/db/]               ← 全データアクセスロジックを集約
                |
          [Supabase]
```

### 各層の責務

| 層 | 役割 |
|---|---|
| `src/lib/db/` | Supabaseクエリを関数として集約。Server Component・API Route 両方から呼ぶ |
| Server Component | `lib/db/` を直接呼び出してSSRでデータ取得（一覧・詳細の表示） |
| API Route | Client Component からの mutation（メモ・投稿・レッスン登録）と AI 連携 |
| Client Component | API Route 経由で mutation、または Server Component から props を受け取る |

### API Route が必要なケース
- Client Component からの書き込み（POST / PUT / DELETE）
- サーバー秘匿キーが必要な処理（Claude API 呼び出しなど）

---

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

---

## フォルダ構成

```
src/
├── app/
│   ├── (auth)/                            # ログイン・コールバック
│   │   ├── login/page.tsx
│   │   └── auth/callback/route.ts
│   ├── (admin)/                           # 管理者用ページ群（Phase 6）
│   │   └── layout.tsx                     # 権限チェック
│   ├── (teacher)/                         # 教師用ページ群
│   │   ├── layout.tsx                     # 権限チェック（teacher/admin のみ）
│   │   └── teacher/
│   │       └── lessons/new/page.tsx       # レッスン登録
│   ├── (student)/                         # 生徒用ページ群
│   │   ├── layout.tsx                     # ログイン確認
│   │   ├── page.tsx                       # レッスン一覧
│   │   └── lessons/[lessonId]/page.tsx    # レッスンページ（動画・発問・メモ）
│   └── api/
│       ├── memos/                         # メモ CRUD（Phase 4）
│       ├── posts/                         # 投稿（Phase 5）
│       └── ai/                            # AI発問提案（Phase 6）
├── components/
│   ├── ui/                                # shadcn/ui
│   ├── lesson/                            # レッスンページ用コンポーネント
│   └── shared/                            # 共通コンポーネント（NavBar等）
├── lib/
│   ├── supabase/                          # Supabaseクライアント
│   │   ├── client.ts                      # createBrowserClient
│   │   ├── server.ts                      # createServerClient
│   │   └── middleware.ts                  # updateSession（proxy.ts から呼ばれる）
│   └── db/                               # データアクセス層（Repository）
│       ├── contents.ts                    # 科目・単元・レッスン・発問のクエリ
│       ├── memos.ts                       # メモのCRUD
│       └── posts.ts                       # 投稿のCRUD
└── types/                                 # 共通型定義（Supabase自動生成 + 拡張）
```
