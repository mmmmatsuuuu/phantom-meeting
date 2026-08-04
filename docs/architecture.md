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

## 認証まわりの方針（Supabase 無料枠のレート制限対策）

Supabase 無料枠の Auth API 呼び出し回数を抑えるため、認証確認は以下の階層に一元化している。

| 層 | 実装 | 役割 |
|---|---|---|
| ミドルウェア（`proxy.ts` → `lib/supabase/middleware.ts`） | `supabase.auth.getClaims()` | 全リクエストで JWT を検証する唯一の場所。JWT Signing Keys（非対称鍵）移行済みのためローカル検証で完結し、Auth サーバーへの通信は発生しない |
| `lib/supabase/server.ts` の `getUser()` | Cookie セッションを読むだけ（`React.cache` でリクエスト内メモ化） | ミドルウェアで検証済みの前提で、下流では再検証しない |
| `lib/supabase/server.ts` の `getUserProfile()` | `getUser()` + `profiles` から role・display_name を1回だけ取得（`React.cache`） | Server Component・API Route で「誰が・どのロールか」が必要な箇所は必ずこれ経由にする |
| `lib/api/auth.ts` の `requireUser()` / `requireTeacher()` | API Route 用のガード。401/403 レスポンスを組み立てて返す | API Route で認証・ロールチェックを行う際は個別に `getSession()` や `profiles` クエリを書かず、これらのヘルパーを使う |

**新しいページ・API Route・`lib/db/` 関数を書く際は `supabase.auth.getUser()` / `getSession()` を直接呼ばないこと。** 上記のヘルパー経由にすることで、1リクエストあたりの Auth 通信・`profiles` クエリを最小限に保つ。

`lib/db/` 側で複数テーブルを跨ぐ集計（分析・エクスポート系）は、可能な限り Supabase のネスト select（例: `subjects(*, units(*, lessons(*)))`）で1クエリにまとめる方針。

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
- 右：自分のメモ（常時表示、タブ切り替えで消えない）。`lessons.enable_playground` が有効なレッスンでは「📝 メモ ⇄ 💻 コード」の切り替えタブが上部に表示される（コーディングプレイグラウンド、Phase 21）
- 左下：クラスに共有されたメモの一覧（小テスト完了後にアンロック）
- タイトル直下に生徒本人の学習状況ステータスバー（直近得点率・受験回数・メモ件数）を表示

---

## フォルダ構成

```
src/
├── app/
│   ├── (auth)/                                          # ログイン・コールバック
│   │   ├── login/page.tsx
│   │   └── auth/callback/route.ts
│   ├── (admin)/                                         # 管理者用ルートグループ
│   │   └── layout.tsx                                   # admin ロール確認のみ（配下ページは現状なし）
│   ├── (teacher)/                                       # 教師用ページ群
│   │   ├── layout.tsx                                   # teacher/admin ロール確認
│   │   └── teacher/
│   │       ├── page.tsx                                 # 教師ハブ（授業をつくる／生徒をみる の2グループ導線）
│   │       ├── contents/page.tsx                        # 科目・単元・レッスン管理（レッスン登録・小テスト作成もここから遷移）
│   │       ├── lessons/
│   │       │   ├── new/page.tsx                         # レッスン登録
│   │       │   └── [lessonId]/
│   │       │       ├── quiz/new/page.tsx                # 小テスト作成
│   │       │       └── code-snippets/page.tsx           # コーディングプレイグラウンド管理（有効化・初期コード）
│   │       ├── analytics/                                # 分析（タブ統合）
│   │       │   ├── layout.tsx                            # タブ切り替えUI（単元別／レッスン別／生徒別）
│   │       │   ├── page.tsx                               # /analytics/units へリダイレクト
│   │       │   ├── units/page.tsx                         # 単元別：授業×設問の正答率ヒートマップ
│   │       │   ├── lessons/page.tsx                       # レッスン別：📝小テスト/💻コード/📋メモのサブタブ
│   │       │   └── students/page.tsx                      # 生徒別：検索付き生徒リスト→個人詳細へ
│   │       ├── quiz-analytics/page.tsx                    # 旧URL。/analytics/units へリダイレクト
│   │       ├── students/
│   │       │   ├── page.tsx                               # 生徒一覧（検索・インライン編集）
│   │       │   └── [userId]/page.tsx                      # 生徒個人詳細（サマリー・単元別・レッスン別）
│   │       └── data-export/page.tsx                       # 小テスト結果・メモの CSV エクスポート
│   ├── (student)/                                       # 生徒用ページ群
│   │   ├── layout.tsx                                   # ログイン確認
│   │   ├── page.tsx                                     # レッスン一覧 + 学習状況ダッシュボード
│   │   ├── lessons/[lessonId]/page.tsx                  # レッスンページ（動画・発問・メモ・小テスト・ステータスバー）
│   │   ├── memos/page.tsx                               # メモ一覧・Markdownダウンロード
│   │   ├── quiz-results/page.tsx                        # 小テスト受験履歴一覧
│   │   └── profile/page.tsx                             # プロフィール編集
│   ├── api/
│   │   ├── code-snippets/[snippetId]/
│   │   │   ├── route.ts                                 # 初期コード更新・削除（teacher/admin）
│   │   │   └── state/route.ts                           # 生徒の編集内容の保存（本人のみ）
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
│   │   ├── lessons/[lessonId]/code-snippets/
│   │   │   ├── route.ts                                 # 初期コード追加（teacher/admin）
│   │   │   └── [snippetId]/move/route.ts                # 初期コードの並び替え（teacher/admin）
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
│   │   │       ├── attempts/route.ts                    # 提出・受験履歴取得
│   │   │       └── questions/route.ts                   # 問題追加
│   │   └── teacher/
│   │       ├── quiz-analytics/route.ts                  # 単元別ヒートマップ用データ
│   │       ├── lessons/[lessonId]/
│   │       │   ├── memo-students/route.ts                # 生徒メタデータ一覧（クラス絞り込み）
│   │       │   ├── memo-students/[userId]/route.ts       # 特定生徒のメモ一覧
│   │       │   ├── quiz-analytics/route.ts                # レッスン別：生徒×設問の回答一覧
│   │       │   └── code-analytics/route.ts                # レッスン別：生徒×コードスニペットの実行状況
│   │       └── units/[unitId]/
│   │           ├── memo-export/route.ts                   # メモ CSV エクスポート
│   │           └── quiz-export/route.ts                   # 小テスト結果 CSV エクスポート
│   ├── icon.tsx                                         # Favicon（SVG）
│   ├── layout.tsx                                       # ルートレイアウト
│   └── globals.css
├── components/
│   ├── ui/                                              # shadcn/ui コンポーネント
│   ├── lesson/                                          # レッスンページ用
│   │   ├── lesson-content.tsx
│   │   ├── lesson-tabs.tsx
│   │   ├── lesson-status-bar.tsx                        # 生徒本人の学習状況バー
│   │   ├── lesson-side-panel.tsx                        # メモ/コード切り替えタブ（enable_playgroundで出し分け）
│   │   ├── playground.tsx                               # コーディングプレイグラウンド本体（実行・コンソール・メモに保存）
│   │   ├── code-editor.tsx                              # CodeMirror 6 ラッパー
│   │   ├── memo-section.tsx                             # tiptap メモエディタ（prefillContentでコード事前入力に対応）
│   │   ├── memo-toolbar.tsx
│   │   ├── post-list.tsx                                # 共有投稿一覧（Realtime）
│   │   ├── question-section.tsx                         # 発問
│   │   ├── quiz-section.tsx                             # 小テスト（DnD対応・提出後の要復習ナッジ）
│   │   ├── subject-list.tsx                             # 科目別レッスン一覧（受験・メモ状況バッジ付き）
│   │   └── video-player.tsx
│   ├── student/
│   │   ├── dashboard-summary.tsx                        # ホームの学習状況サマリー4カード
│   │   ├── next-actions.tsx                             # 「つぎにやること」（要復習・未受験レッスン）
│   │   └── lesson-attempt-history.tsx                   # 小テスト結果一覧の受験履歴表示
│   ├── memos/
│   │   ├── memo-download-button.tsx                     # Markdownダウンロード
│   │   └── memo-toc.tsx                                 # 目次（IntersectionObserver）
│   ├── profile/
│   │   └── profile-edit-form.tsx
│   ├── shared/
│   │   ├── nav-bar.tsx
│   │   ├── login-button.tsx
│   │   ├── submit-button.tsx                            # 送信系ボタン共通コンポーネント（多重送信防止）
│   │   ├── rich-content.tsx                             # tiptap JSON 表示（読み取り専用）
│   │   ├── resizable-image-node.tsx                     # 画像リサイズ対応ノード
│   │   └── user-menu.tsx                                # DropdownMenu（ロール別表示・ロールアイコン）
│   └── teacher/
│       ├── contents-manager.tsx                         # 科目・単元・レッスン管理UI
│       ├── lesson-new-form.tsx
│       ├── quiz-existing.tsx
│       ├── quiz-form.tsx                                # 小テスト作成フォーム（JSONインポート対応）
│       ├── quiz-question-editor.tsx                     # 問題エディタ（tiptap・画像ペースト対応）
│       ├── quiz-analytics.tsx                           # 単元別ヒートマップ
│       ├── lesson-analytics.tsx                         # レッスン別：📝小テスト/💻コード/📋メモのサブタブ切り替え
│       ├── lesson-code-cards.tsx                        # レッスン別「コード」タブ：生徒ごとのカード表示
│       ├── lesson-memo-cards.tsx                        # レッスン別「メモ」タブ：生徒ごとのカード表示
│       ├── analytics-tabs.tsx                           # 分析ページのタブ切り替えUI
│       ├── student-picker.tsx                           # 生徒別分析：検索付き生徒リスト
│       ├── students-table.tsx                           # 生徒一覧テーブル
│       ├── code-snippets-manager.tsx                     # コーディングプレイグラウンド管理（有効化・初期コードCRUD）
│       └── data-export.tsx                              # CSV エクスポートUI
├── lib/
│   ├── supabase/
│   │   ├── client.ts                                    # createBrowserClient
│   │   ├── server.ts                                    # createServerClient・getUser・getUserProfile（React.cache）
│   │   ├── middleware.ts                                # updateSession（getClaims による JWT 検証）
│   │   └── types.ts                                     # Supabase 自動生成型（手動追記あり）
│   ├── api/
│   │   └── auth.ts                                      # requireUser / requireTeacher（API Route 用認証ガード）
│   ├── db/                                              # データアクセス層
│   │   ├── code-snippets.ts                             # 初期コードCRUD・並び替え・生徒の編集内容の保存
│   │   ├── contents.ts                                  # 科目・単元・レッスン・発問
│   │   ├── memos.ts                                     # メモ CRUD（生徒・教師向け）・メモ件数集計
│   │   ├── posts.ts                                     # 共有投稿 CRUD
│   │   ├── quizzes.ts                                   # 小テスト・提出記録・分析・エクスポート集計
│   │   └── users.ts                                     # プロフィール・生徒一覧
│   ├── student-dashboard.ts                             # 生徒ダッシュボード・個人詳細の集計ロジック（純粋関数）
│   ├── pyodide-runner.ts                                # Pyodide による Python 実行（jsDelivr CDNから読み込み）
│   ├── js-runner.ts                                     # サンドボックスiframeによる JavaScript 実行
│   ├── tiptap/
│   │   └── resizable-image-extension.ts                 # 画像リサイズ拡張
│   ├── tiptap-utils.ts                                  # tiptap JSON ⇔ プレーンテキスト変換
│   └── utils.ts                                         # shadcn/ui ユーティリティ
└── proxy.ts                                             # middleware.ts のエントリポイント
```
