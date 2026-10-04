# アーキテクチャ

## データアクセス方針

```
[Server Component]  [Client Component]
        |                   |
        |             [API Route]      ← Client からの書き込み・フィルタ操作に応じた読み取り
        |                   |
        +-------+   +-------+
                |   |
          [src/lib/db/]               ← 全データアクセスロジックを集約
                |
          [Supabase]                  ← RLS・SQL関数（RPC）・トリガー・制約
```

### 各層の責務

| 層 | 役割 |
|---|---|
| `src/lib/db/` | Supabaseクエリを関数として集約。Server Component・API Route 両方から呼ぶ |
| Server Component | `lib/db/` を直接呼び出してSSRでデータ取得（一覧・詳細の表示） |
| API Route | Client Component からの mutation（メモ・投稿・レッスン登録）、秘匿キーが必要な処理（画像アップロード等）、Client Component のフィルタ操作に応じた読み取り（分析・エクスポート）、操作したときだけ必要になるデータの読み取り（「AIで振り返る」ダイアログ） |
| Client Component | API Route 経由で読み書き、または Server Component から props を受け取る |

### API Route が必要なケース
- Client Component からの書き込み（POST / PUT / DELETE）
- サーバー秘匿キーが必要な処理（ImageKit アップロード等）
- Client Component の操作（学年・クラスの選択など）に応じて読み取り直す必要がある処理（教師向け分析・CSV エクスポート）
- 操作したときだけ必要になり、ページ表示時に取得すると無駄になるデータの読み取り（「AIで振り返る」ダイアログを開いたときの学習データ）

---

## 処理の配置方針（フロント／バックエンド／DB）

どの処理をどの層に置くかの判断基準。各機能で実際にどの層が何をしているかは [処理の配置一覧](processing-map.md) にまとめている。

### 各層に置く処理・置かない処理

| 層 | 置く処理 | 置かない処理 |
|---|---|---|
| **フロント**（Client Component・`lib/` のブラウザ実行コード） | 入力・選択の状態管理、表示用の整形（色分け・ラベル・並べ替え）、受け取った少量データのグループ化、ブラウザ内で完結する処理（コード実行・ファイル生成） | 権限の判定、正誤判定など結果の確定、大量データの集計 |
| **バックエンド**（Server Component・API Route・`lib/db/`） | 認証・ロールの確認、入力値の検証、正誤判定・採点、複数クエリの組み立て、少〜中規模データの整形・集計、CSV 生成 | 1000行を超えうる生データの集計 |
| **DB**（Supabase） | アクセス制御（RLS）、大量の行を集計して小さな結果にする処理（SQL 関数 / RPC）、整合性の保証（外部キー・一意制約・CASCADE）、行の作成・更新に連動する処理（トリガー） | 表示の都合によるロジック |

### 集計をどこでやるか

判断基準は「**DB から返ってくる行数が、上限や通信量の問題になるか**」。

Supabase（PostgREST）は1リクエストで返す行数に上限がある（`supabase/config.toml` の `max_rows = 1000`。本番の既定値も同じ）。この上限はクエリ側の `.limit()` より優先されるため、`.limit(20000)` と書いても1000行で打ち切られる。打ち切りはエラーにならず、**古いデータが静かに欠ける**形で現れる。

| 状況 | 置き場所 | 例 |
|---|---|---|
| 返る行数が常に少ない（数十〜数百行） | `lib/db/` でネスト select → JS で整形 | 科目・単元・レッスンのツリー、1生徒分のメモ件数 |
| 行数が生徒数・受験回数に比例して増え、1000行を超えうる | **DB の SQL 関数（RPC）で集計**し、結果だけ返す | 学年全体の設問別正答率、学年全体のメモ件数 |
| 集計ではなく中身そのものを表示し、1000行を超えうる | まず対象を絞れないか検討する（画面の単位を小さくして上限内に収める）。絞れない場合は `lib/db/` で `.range()` によるページ取得 | レッスン別分析はクラス単位に限定（1クラスなら受験記録・メモは上限内） |

RPC は「多くの行を集計して小さな結果にする」ために使う。個別のデータ（生徒ごとの回答内容など）を JSON に詰めて行数を減らす目的では使わない。

複数テーブルを跨ぐ取得は、引き続き可能な限りネスト select（例: `subjects(*, units(*, lessons(*)))`）で1クエリにまとめる。リクエスト数を増やす方法（`.in()` のチャンク分割、生徒ごとの個別 fetch など）は無料枠の制約から避け、行数が多いものは RPC にする。

### SQL 関数（RPC）のルール

- マイグレーション（`supabase/migrations/`）で定義する。ダッシュボードから直接作らない
- 原則 `security invoker` とし、呼び出したユーザーの権限で実行して RLS を効かせる。`security definer` は `my_role()` のように RLS を越える必要がある場合に限る
- アプリからの呼び出しは、対応する `lib/db/` の関数1か所にまとめる。`supabase.rpc()` をページやコンポーネントから直接呼ばない
- 関数を追加・変更したら [処理の配置一覧](processing-map.md) も同じ PR で更新する

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

複数テーブルを跨ぐ集計（分析・エクスポート系）をどこで行うかは、上の「処理の配置方針」を参照。

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
│   │       ├── analytics/                                # 分析（タブ統合。/analytics 自体は next.config.ts で /analytics/units へリダイレクト）
│   │       │   ├── layout.tsx                            # タブ切り替えUI（単元別／レッスン別／生徒別）
│   │       │   ├── units/page.tsx                         # 単元別：授業×設問の正答率ヒートマップ（小テスト・単元・科目の平均つき）
│   │       │   ├── lessons/page.tsx                       # レッスン別：📝小テスト/💻コード/📋メモのサブタブ
│   │       │   └── students/page.tsx                      # 生徒別：検索付き生徒リスト→個人詳細へ
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
│   │   │   ├── lessons/route.ts                         # レッスン作成（発問・初期コードも一括）
│   │   │   ├── lessons/[lessonId]/route.ts              # プレイグラウンド有効/無効の切り替え・レッスン削除
│   │   │   ├── subjects/route.ts                        # 科目作成
│   │   │   ├── subjects/[subjectId]/route.ts            # 科目更新・削除
│   │   │   ├── units/route.ts                           # 単元作成
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
│   │   ├── units/[unitId]/review-data/route.ts          # AIで振り返る：本人の1単元分の学習データ
│   │   └── teacher/
│   │       ├── quiz-analytics/route.ts                  # 単元別ヒートマップ用データ
│   │       ├── lessons/[lessonId]/
│   │       │   ├── memos/route.ts                         # レッスン別：クラス全員分のメモ（生徒ごと）
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
│   │   ├── lesson-attempt-history.tsx                   # 小テスト結果一覧の受験履歴表示
│   │   └── review-prompt-dialog.tsx                     # 「AIで振り返る」ダイアログ（プロンプトのプレビュー・コピー）
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
│       ├── rate-bar.tsx                                 # 分析画面共通：正答率・得点率の横棒
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
│   │   ├── auth.ts                                      # requireUser / requireTeacher（API Route 用認証ガード）
│   │   └── params.ts                                    # 学年・クラスのクエリ解析（API Route 用。不正なら 400）
│   ├── db/                                              # データアクセス層
│   │   ├── code-snippets.ts                             # 初期コードCRUD・並び替え・生徒の編集内容の保存
│   │   ├── contents.ts                                  # 科目・単元・レッスン・発問
│   │   ├── memos.ts                                     # メモ CRUD（生徒・教師向け）・メモ件数集計
│   │   ├── posts.ts                                     # 共有投稿 CRUD
│   │   ├── quizzes.ts                                   # 小テスト・提出記録・分析・エクスポート集計
│   │   ├── review.ts                                    # AIで振り返る：本人の1単元分の学習データ
│   │   └── users.ts                                     # プロフィール・生徒一覧
│   ├── review-prompt.ts                                 # AIで振り返る：プロンプトの組み立てと上限処理（純粋関数）
│   ├── student-dashboard.ts                             # 生徒ダッシュボード・個人詳細の集計ロジック（純粋関数）
│   ├── student-number.ts                                # 学籍番号（GCNN 形式）の範囲算出・学年／クラスの取り出し
│   ├── rate-level.ts                                    # 分析画面共通：正答率の段階（40/70/90%）と色・表示形式
│   ├── hooks/
│   │   └── use-lazy-fetch.ts                            # 必要になったときだけ取得し、同じ URL なら再取得しないフック
│   ├── pyodide-runner.ts                                # Pyodide による Python 実行（jsDelivr CDNから読み込み）
│   ├── js-runner.ts                                     # サンドボックスiframeによる JavaScript 実行
│   ├── tiptap/
│   │   └── resizable-image-extension.ts                 # 画像リサイズ拡張
│   ├── tiptap-utils.ts                                  # tiptap JSON ⇔ プレーンテキスト変換
│   └── utils.ts                                         # shadcn/ui ユーティリティ
└── proxy.ts                                             # middleware.ts のエントリポイント
```
