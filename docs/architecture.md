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
| API Route | Client Component からの mutation（メモ・投稿・レッスン登録）と秘匿キーが必要な処理（画像アップロード等） |
| Client Component | API Route 経由で mutation、または Server Component から props を受け取る |

### API Route が必要なケース
- Client Component からの書き込み（POST / PUT / DELETE）
- サーバー秘匿キーが必要な処理（ImageKit アップロード等）

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
- 左下：クラスに共有されたメモの一覧（小テスト完了後にアンロック）

---

## フォルダ構成

```
src/
├── app/
│   ├── (auth)/                                          # ログイン・コールバック
│   │   ├── login/page.tsx
│   │   └── auth/callback/route.ts
│   ├── (admin)/                                         # 管理者用ページ群
│   │   ├── layout.tsx                                   # admin ロール確認
│   │   └── admin/users/page.tsx                         # 生徒→教師昇格ページ
│   ├── (teacher)/                                       # 教師用ページ群
│   │   ├── layout.tsx                                   # teacher/admin ロール確認
│   │   └── teacher/
│   │       ├── contents/page.tsx                        # 科目・単元・レッスン管理
│   │       ├── lessons/
│   │       │   ├── new/page.tsx                         # レッスン登録
│   │       │   └── [lessonId]/
│   │       │       ├── memos/page.tsx                   # 生徒メモ閲覧
│   │       │       └── quiz/new/page.tsx                # 小テスト作成
│   │       └── students/page.tsx                        # 生徒一覧
│   ├── (student)/                                       # 生徒用ページ群
│   │   ├── layout.tsx                                   # ログイン確認
│   │   ├── page.tsx                                     # レッスン一覧
│   │   ├── lessons/[lessonId]/page.tsx                  # レッスンページ（動画・発問・メモ・小テスト）
│   │   ├── memos/page.tsx                               # メモ一覧・Markdownダウンロード
│   │   └── profile/page.tsx                             # プロフィール編集
│   ├── api/
│   │   ├── admin/users/[userId]/route.ts                # ロール昇格（admin のみ）
│   │   ├── contents/
│   │   │   ├── lessons/route.ts                         # レッスン一覧・作成
│   │   │   ├── lessons/[lessonId]/route.ts              # レッスン更新・削除
│   │   │   ├── subjects/route.ts                        # 科目一覧・作成
│   │   │   ├── subjects/[subjectId]/route.ts            # 科目更新・削除
│   │   │   ├── units/route.ts                           # 単元一覧・作成
│   │   │   └── units/[unitId]/route.ts                  # 単元更新・削除
│   │   ├── images/
│   │   │   ├── upload/route.ts                          # ImageKit アップロード（認証済みのみ）
│   │   │   └── [fileId]/route.ts                        # ImageKit 削除
│   │   ├── memos/
│   │   │   ├── route.ts                                 # メモ一覧・作成
│   │   │   └── [memoId]/route.ts                        # メモ削除
│   │   ├── posts/
│   │   │   ├── route.ts                                 # 投稿一覧・作成
│   │   │   └── [postId]/route.ts                        # 投稿削除
│   │   ├── profile/route.ts                             # プロフィール更新
│   │   ├── quiz-questions/[questionId]/route.ts         # 問題削除
│   │   ├── quizzes/
│   │   │   ├── route.ts                                 # クイズ作成
│   │   │   └── [quizId]/
│   │   │       ├── route.ts                             # クイズ削除
│   │   │       ├── attempts/route.ts                    # 提出・完了確認
│   │   │       └── questions/route.ts                   # 問題追加
│   │   └── teacher/lessons/[lessonId]/memo-students/
│   │       ├── route.ts                                 # 生徒メタデータ一覧（クラス絞り込み）
│   │       └── [userId]/route.ts                        # 特定生徒のメモ一覧
│   ├── icon.tsx                                         # Favicon（SVG）
│   ├── layout.tsx                                       # ルートレイアウト
│   └── globals.css
├── components/
│   ├── ui/                                              # shadcn/ui コンポーネント
│   ├── admin/
│   │   └── approve-button.tsx                           # 承認ボタン
│   ├── lesson/                                          # レッスンページ用
│   │   ├── lesson-content.tsx
│   │   ├── lesson-tabs.tsx
│   │   ├── memo-section.tsx                             # tiptap メモエディタ
│   │   ├── memo-toolbar.tsx
│   │   ├── post-list.tsx                                # 共有投稿一覧（Realtime）
│   │   ├── question-section.tsx                         # 発問
│   │   ├── quiz-section.tsx                             # 小テスト（DnD対応）
│   │   ├── subject-list.tsx                             # 科目別レッスン一覧
│   │   └── video-player.tsx
│   ├── memos/
│   │   ├── memo-download-button.tsx                     # Markdownダウンロード
│   │   └── memo-toc.tsx                                 # 目次（IntersectionObserver）
│   ├── profile/
│   │   └── profile-edit-form.tsx
│   ├── shared/
│   │   ├── nav-bar.tsx
│   │   ├── rich-content.tsx                             # tiptap JSON 表示（読み取り専用）
│   │   ├── resizable-image-node.tsx                     # 画像リサイズ対応ノード
│   │   └── user-menu.tsx                                # DropdownMenu（ロール別表示）
│   └── teacher/
│       ├── contents-manager.tsx                         # 科目・単元・レッスン管理UI
│       ├── lesson-new-form.tsx
│       ├── quiz-existing.tsx
│       ├── quiz-form.tsx                                # 小テスト作成フォーム（JSONインポート対応）
│       ├── quiz-question-editor.tsx                     # 問題エディタ（tiptap・画像ペースト対応）
│       ├── student-memo-viewer.tsx                      # 生徒メモ閲覧（アコーディオン）
│       └── students-table.tsx                           # 生徒一覧テーブル
├── lib/
│   ├── supabase/
│   │   ├── client.ts                                    # createBrowserClient
│   │   ├── server.ts                                    # createServerClient
│   │   ├── middleware.ts                                 # updateSession
│   │   └── types.ts                                     # Supabase 自動生成型（手動追記あり）
│   ├── db/                                              # データアクセス層
│   │   ├── contents.ts                                  # 科目・単元・レッスン・発問
│   │   ├── memos.ts                                     # メモ CRUD（生徒・教師向け）
│   │   ├── posts.ts                                     # 共有投稿 CRUD
│   │   ├── quizzes.ts                                   # 小テスト・提出記録
│   │   └── users.ts                                     # プロフィール・生徒一覧
│   ├── tiptap/
│   │   └── resizable-image-extension.ts                 # 画像リサイズ拡張
│   ├── tiptap-utils.ts                                  # プレーンテキスト → tiptap JSON 変換
│   └── utils.ts                                         # shadcn/ui ユーティリティ
└── proxy.ts                                             # middleware.ts のエントリポイント
```
