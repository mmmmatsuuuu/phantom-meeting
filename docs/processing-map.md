# 処理の配置一覧

各機能の処理が、フロント・バックエンド・DB のどの層で行われているかの一覧。
どの層に何を置くべきかの方針は [アーキテクチャ > 処理の配置方針](architecture.md#処理の配置方針フロントバックエンドdb) を参照。

**機能の追加・変更で処理の置き場所が変わったら、同じ PR でこのファイルも更新する。**

## 層の表記

| 表記 | 層 | 実体 |
|---|---|---|
| フロント | ブラウザで動く処理 | Client Component（`"use client"`）、`lib/js-runner.ts`・`lib/pyodide-runner.ts` |
| SC | バックエンド：Server Component | `app/**/page.tsx`・`layout.tsx` |
| API | バックエンド：API Route | `app/api/**/route.ts` |
| lib/db | バックエンド：データアクセス層 | `lib/db/*.ts`（Server Component・API Route から呼ばれる） |
| lib | バックエンド：純粋関数 | `lib/student-dashboard.ts` など |
| DB | Supabase（Postgres） | RLS・SQL 関数・トリガー・制約（`supabase/migrations/`） |

---

## 共通

### 認証・ルーティング

| 層 | 処理 | 場所 |
|---|---|---|
| フロント | Google OAuth の開始、ログアウト | `components/shared/login-button.tsx`、`user-menu.tsx` |
| API | OAuth コールバック（セッション確立） | `app/(auth)/auth/callback/route.ts` |
| ミドルウェア | 全リクエストで JWT を検証し、未ログインなら `/login` へリダイレクト | `proxy.ts` → `lib/supabase/middleware.ts` |
| SC | ロールによるページの出し分け（教師ページは teacher/admin のみ、管理ページは admin のみ） | `app/(teacher)/layout.tsx`、`app/(admin)/layout.tsx` |
| API | API ごとのログイン・ロール確認 | `lib/api/auth.ts`（`requireUser` / `requireTeacher`） |
| API | 学年・クラスのクエリの解析と検証（学年 1〜3、クラス 1〜9。不正なら 400） | `lib/api/params.ts`（`parseGradeParam` / `parseGradeClassParams` / `parseGradeClassOrAllParams`） |
| ルーティング | 旧 URL から新 URL へのリダイレクト | `next.config.ts` |
| DB | 新規ユーザー登録時に `profiles` を自動作成（Google の表示名を初期値に） | トリガー `on_auth_user_created` → 関数 `handle_new_user()` |
| DB | 自分のロールを返す（RLS の条件で使用） | 関数 `my_role()`（`security definer`） |

---

## 生徒向け

### ホーム（`/`）

| 層 | 処理 | 場所 |
|---|---|---|
| SC | 科目ツリー・受験状況・メモ件数の取得 | `app/(student)/page.tsx` |
| lib/db | 科目→単元→レッスンをネスト select で取得 | `contents.ts` `getContents` |
| lib/db | 自分の受験記録から、クイズごとの最新得点率・受験回数を集計 | `quizzes.ts` `getStudentQuizStatuses` |
| lib/db | 自分のレッスンごとのメモ件数を集計 | `memos.ts` `getMemoCountsByLesson` |
| lib | サマリー（受験数・平均得点率・要復習数）、レッスンのバッジ、「つぎにやること」の算出 | `lib/student-dashboard.ts` `buildStudentDashboard` |
| SC | 科目の折りたたみ状態を Cookie から復元 | `app/(student)/page.tsx` |
| フロント | 科目の折りたたみ操作と Cookie への保存 | `components/lesson/subject-list.tsx` |

### レッスンページ（`/lessons/[lessonId]`）

**ページ表示・ステータスバー**

| 層 | 処理 | 場所 |
|---|---|---|
| SC | レッスン・発問・小テスト・受験状況・メモ件数を並列取得し、ステータスバー（直近得点率・受験回数・メモ件数）と要復習件数を算出 | `app/(student)/lessons/[lessonId]/page.tsx` |
| lib/db | レッスンと発問をネスト select で取得 | `contents.ts` `getLessonWithQuestions` |
| lib/db | 小テストと設問をネスト select で取得 | `quizzes.ts` `getQuizWithQuestions` |
| フロント | 動画・小テストのタブ切り替え、小テスト完了による共有メモ一覧のアンロック表示 | `components/lesson/lesson-content.tsx`、`lesson-tabs.tsx` |
| フロント | YouTube の埋め込み再生 | `components/lesson/video-player.tsx` |

**メモ**

| 層 | 処理 | 場所 |
|---|---|---|
| フロント | tiptap エディタでの編集、動画の再生位置の記録 | `components/lesson/memo-section.tsx`、`memo-toolbar.tsx` |
| API | メモの一覧取得・作成・削除 | `api/memos/route.ts`、`api/memos/[memoId]/route.ts` |
| lib/db | メモの取得・作成・削除 | `memos.ts` `getMemosByLessonId` / `createMemo` / `deleteMemo` |
| DB | 本人のメモのみ読み書き可 | RLS（`memos`） |
| DB | 更新時に `updated_at` を自動更新 | トリガー `memos_set_updated_at` |

**共有投稿**

| 層 | 処理 | 場所 |
|---|---|---|
| フロント | メモを投稿として共有 | `components/lesson/memo-section.tsx` |
| API | 投稿の一覧取得（教師は投稿者情報つき）・作成（同じメモの二重投稿を確認）・削除 | `api/posts/route.ts`、`api/posts/[postId]/route.ts` |
| lib/db | 投稿の取得・存在確認・作成・削除 | `posts.ts` |
| フロント | 新規投稿・削除をリアルタイムで一覧に反映（ブラウザから Supabase Realtime を直接購読） | `components/lesson/post-list.tsx` |
| DB | 閲覧は認証ユーザー全員、作成は自分のメモからのみ、削除は本人または教師 | RLS（`posts`） |
| DB | 投稿の変更を Realtime に配信 | `supabase_realtime` publication |

**小テスト**

| 層 | 処理 | 場所 |
|---|---|---|
| フロント | 選択肢のシャッフル、並び替え問題のドラッグ操作、回答の入力 | `components/lesson/quiz-section.tsx` |
| API | 提出された回答の**採点**（選択式・並び替えを正誤判定、記述式は判定なし）と保存 | `api/quizzes/[quizId]/attempts/route.ts`（POST） |
| lib/db | 受験記録と回答詳細の保存 | `quizzes.ts` `createQuizAttempt` |
| フロント | 提出後の正誤・解説表示、要復習のナッジ | `components/lesson/quiz-section.tsx` |
| API / lib/db | 直近10回の受験履歴を回答詳細つきで取得 | `api/quizzes/[quizId]/attempts/route.ts`（GET）→ `quizzes.ts` `getRecentQuizAttemptsWithAnswers` |
| DB | 受験記録・回答は本人のみ作成・閲覧可（教師は全件閲覧可） | RLS（`quiz_attempts`・`quiz_attempt_answers`） |

**コーディングプレイグラウンド**（`lessons.enable_playground` が有効なレッスンのみ）

| 層 | 処理 | 場所 |
|---|---|---|
| SC | 初期コードと自分の保存済みコードを取得 | `app/(student)/lessons/[lessonId]/page.tsx` |
| lib/db | 初期コード一覧、自分の保存済みコード・実行結果の取得 | `code-snippets.ts` `getCodeSnippetsByLesson` / `getStudentCodeStatesByLesson` |
| フロント | Python の実行（Pyodide を jsDelivr から読み込み、メインスレッドで実行） | `lib/pyodide-runner.ts` |
| フロント | JavaScript の実行（sandbox 属性つき iframe 内で実行） | `lib/js-runner.ts` |
| フロント | 編集内容・実行結果を一定時間おいて自動保存、メモへの貼り付け | `components/lesson/playground.tsx` |
| API / lib/db | 編集内容・実行結果の保存（存在すれば更新・なければ作成） | `api/code-snippets/[snippetId]/state/route.ts` → `code-snippets.ts` `saveStudentCodeState` |
| DB | 生徒×初期コードで1行（一意制約）。本人のみ読み書き可、教師は閲覧可 | 一意制約・RLS（`code_states`） |

### メモ一覧（`/memos`）

| 層 | 処理 | 場所 |
|---|---|---|
| lib/db | 自分の全メモを取得 | `memos.ts` `getAllMemos` |
| SC | メモを科目→単元→レッスンのツリーに振り分け、メモのないレッスンを除外 | `app/(student)/memos/page.tsx` |
| フロント | 目次のスクロール連動 | `components/memos/memo-toc.tsx` |
| フロント | Markdown ファイルの生成とダウンロード | `components/memos/memo-download-button.tsx` |

### 小テスト結果（`/quiz-results`）

| 層 | 処理 | 場所 |
|---|---|---|
| lib/db | 自分の全受験記録を、科目・単元・レッスン・回答詳細つきで取得 | `quizzes.ts` `getQuizResultsByUser` |
| SC | レッスン別の統計（直近3回の最高・平均得点率）、よく間違える設問、単元平均の算出とツリー化 | `app/(student)/quiz-results/page.tsx` |
| フロント | 受験履歴の開閉 | `components/student/lesson-attempt-history.tsx` |

### プロフィール（`/profile`）

| 層 | 処理 | 場所 |
|---|---|---|
| SC | 自分のプロフィールを取得 | `app/(student)/profile/page.tsx` |
| フロント | 編集フォーム | `components/profile/profile-edit-form.tsx` |
| API | ログイン確認、他人を更新する場合は教師のみ許可、更新項目（表示名・学籍番号・備考）の組み立て | `api/profile/route.ts` |
| DB | 本人は自分を閲覧・更新可、教師は生徒を閲覧・更新可、管理者は全件。`role` を変更できるのは管理者のみ | RLS（`profiles`） |

---

## 教師向け

### 教師ハブ（`/teacher`）

| 層 | 処理 | 場所 |
|---|---|---|
| SC | 各機能へのリンクのみ（データ取得なし） | `app/(teacher)/teacher/page.tsx` |

### コンテンツ管理・レッスン登録（`/teacher/contents`、`/teacher/lessons/new`）

| 層 | 処理 | 場所 |
|---|---|---|
| lib/db | 科目ツリーの取得 | `contents.ts` `getContents` |
| フロント | 科目・単元の作成・名前変更・削除、レッスン削除の操作 | `components/teacher/contents-manager.tsx` |
| フロント | レッスン登録フォーム（YouTube URL・発問・初期コード） | `components/teacher/lesson-new-form.tsx` |
| API | 教師確認と入力値の検証 | `api/contents/**/route.ts` |
| lib/db | 科目・単元の作成・更新・削除 | `contents.ts` |
| lib/db | レッスンの作成：単元内のレッスン数から表示順を決め、レッスン→発問→初期コードの順に挿入 | `contents.ts` `createLesson` |
| DB | コンテンツの作成・更新・削除は教師のみ、閲覧は認証ユーザー全員 | RLS（`subjects`・`units`・`lessons`・`questions`） |
| DB | レッスン削除時に、メモ・投稿・小テストなどを連鎖削除 | 外部キーの `on delete cascade` |

### 小テスト作成・編集（`/teacher/lessons/[lessonId]/quiz/new`）

| 層 | 処理 | 場所 |
|---|---|---|
| SC | レッスンと既存の小テストを取得 | `app/(teacher)/teacher/lessons/[lessonId]/quiz/new/page.tsx` |
| フロント | 作成フォーム（JSON インポート対応）、既存小テストへの設問追加・削除 | `components/teacher/quiz-form.tsx`、`quiz-existing.tsx` |
| フロント | 設問エディタ（tiptap・画像の貼り付け） | `components/teacher/quiz-question-editor.tsx` |
| API | 教師確認と入力値の検証 | `api/quizzes/route.ts`、`api/quizzes/[quizId]/**`、`api/quiz-questions/[questionId]/route.ts` |
| lib/db | 小テスト・設問の作成・追加・削除 | `quizzes.ts` `createQuiz` / `addQuizQuestion` / `deleteQuizQuestion` / `deleteQuiz` |
| API | 画像を ImageKit にアップロード・削除（秘匿キーを使用、画像形式・5MB 以下を検証） | `api/images/upload/route.ts`、`api/images/[fileId]/route.ts` |
| DB | 小テスト・設問の作成・更新・削除は教師のみ | RLS（`quizzes`・`quiz_questions`） |

### プレイグラウンド管理（`/teacher/lessons/[lessonId]/code-snippets`）

| 層 | 処理 | 場所 |
|---|---|---|
| SC | レッスンと初期コード一覧を取得 | `app/(teacher)/teacher/lessons/[lessonId]/code-snippets/page.tsx` |
| フロント | 有効/無効の切り替え、初期コードの追加・編集・削除・並び替え | `components/teacher/code-snippets-manager.tsx` |
| API | 教師確認と入力値の検証 | `api/contents/lessons/[lessonId]/route.ts`、`api/lessons/[lessonId]/code-snippets/**`、`api/code-snippets/[snippetId]/route.ts` |
| lib/db | 初期コードの CRUD。並び替えは隣の行と `order` を入れ替える2回の更新 | `code-snippets.ts` |
| DB | 初期コードの作成・更新・削除は教師のみ | RLS（`code_snippets`） |

### 生徒一覧（`/teacher/students`）

| 層 | 処理 | 場所 |
|---|---|---|
| lib/db | 生徒ロールの全プロフィールを取得 | `users.ts` `getAllProfiles` |
| フロント | 学年・クラスの絞り込み、並べ替え、インライン編集 | `components/teacher/students-table.tsx` |
| API | プロフィール更新（教師による生徒の更新） | `api/profile/route.ts` |

### 生徒個人詳細（`/teacher/students/[userId]`）

| 層 | 処理 | 場所 |
|---|---|---|
| SC | 生徒のプロフィール取得（生徒ロール以外は 404） | `app/(teacher)/teacher/students/[userId]/page.tsx` |
| lib/db | 生徒の受験状況・メモ件数の集計 | `quizzes.ts` `getStudentQuizStatuses`、`memos.ts` `getMemoCountsByLesson` |
| lib | サマリー・レッスンのバッジの算出（生徒ホームと同じ関数） | `lib/student-dashboard.ts` `buildStudentDashboard` |

### 分析：単元別（`/teacher/analytics/units`）

| 層 | 処理 | 場所 |
|---|---|---|
| フロント | 学年・クラス・科目の選択、単元ごとのグループ化、正答率による色分け、設問の Tooltip | `components/teacher/quiz-analytics.tsx` |
| API | 教師確認、学年・クラスの検証 | `api/teacher/quiz-analytics/route.ts` |
| lib/db | 科目→単元→レッスン→小テスト→設問をネスト select で取得し、RPC の集計結果から正答率を算出して組み立て | `quizzes.ts` `getQuizAnalytics` |
| lib | 学年・クラスから学籍番号の範囲を算出 | `lib/student-number.ts` `studentNumberRange`（学籍番号から学年・クラスを取り出す `gradeOf` / `classOf` も同ファイル） |
| DB | 対象生徒×小テストごとの最新受験を特定し、設問ごとの正答数・回答数を集計 | RPC `quiz_question_stats` |

### 分析：レッスン別（`/teacher/analytics/lessons`）

| 層 | 処理 | 場所 |
|---|---|---|
| フロント | 学年・クラス・科目・レッスンの選択（クラスは必須。学年全体は扱わない）、サブタブ（小テスト／コード／メモ）の切り替え | `components/teacher/lesson-analytics.tsx` |
| フロント | 各タブ（小テスト・コード・メモ）はタブを開いたときだけ取得し、同じ条件で取得済みなら再取得しない。条件を切り替えた後に届いた古いレスポンスは破棄。コード・メモは非表示にするだけでアンマウントしない | `components/teacher/lesson-analytics.tsx`、`lib/hooks/use-lazy-fetch.ts` |
| フロント | 小テスト：生徒×設問の表、正誤・誤答内容・記述内容の表示。小テストのないレッスンはその旨を表示 | `components/teacher/lesson-analytics.tsx` |
| API | 小テスト：教師確認、学年・クラスの検証（どちらも必須） | `api/teacher/lessons/[lessonId]/quiz-analytics/route.ts` |
| lib/db | 小テスト：レッスン→小テスト→設問、クラスの生徒、メモ、受験記録（回答をネスト）の4クエリを並列取得し、生徒ごとの最新受験の特定・回答の表示用テキスト化・メモ件数の集計（JS）、正解テキストの組み立て | `quizzes.ts` `getLessonQuizResultsByStudent` |
| フロント | コード：生徒ごとのカード表示 | `components/teacher/lesson-code-cards.tsx` |
| API | コード：教師確認、学年・クラスの検証（どちらも必須） | `api/teacher/lessons/[lessonId]/code-analytics/route.ts` |
| lib/db | コード：レッスン→初期コード、クラスの生徒、保存内容（初期コードのレッスンと学籍番号で絞り込み）の3クエリを並列取得し、生徒ごとに振り分け（JS） | `code-snippets.ts` `getLessonCodeStatesByStudent` |
| フロント | メモ：生徒ごとのカード表示（クラス全員分を1リクエストで取得） | `components/teacher/lesson-memo-cards.tsx` |
| API | メモ：教師確認、学年・クラスの検証（どちらも必須） | `api/teacher/lessons/[lessonId]/memos/route.ts` |
| lib/db | メモ：クラスの生徒と、クラス全員分のメモ（学籍番号で絞り込み）の2クエリを並列取得し、生徒ごとに振り分け（JS） | `memos.ts` `getLessonMemosByClass` |
| DB | 教師は全生徒の受験記録・メモ・コードを閲覧可 | RLS（`quiz_attempts`・`quiz_attempt_answers`・`memos`・`code_states`） |

### 分析：生徒別（`/teacher/analytics/students`）

| 層 | 処理 | 場所 |
|---|---|---|
| lib/db | 生徒ロールの全プロフィールを取得 | `users.ts` `getAllProfiles` |
| フロント | 表示名・学籍番号での絞り込み、生徒個人詳細へのリンク | `components/teacher/student-picker.tsx` |

### データエクスポート（`/teacher/data-export`）

| 層 | 処理 | 場所 |
|---|---|---|
| フロント | 学年・科目・単元の選択、CSV のダウンロード（Blob）、AI 分析用プロンプトのテンプレート表示とコピー | `components/teacher/data-export.tsx` |
| API | 教師確認、CSV の生成（エスケープ・ラベル付け）とファイル名の決定 | `api/teacher/units/[unitId]/quiz-export/route.ts`、`memo-export/route.ts` |
| lib/db | 小テスト：最新受験の特定、設問ごとの正答率（全体・クラス別）、選択肢の回答分布、記述式の回答からランダムに3件を抽出（JS） | `quizzes.ts` `getUnitQuizResultsForExport` |
| lib/db | メモ：レッスンごとに、メモを書いた生徒からランダムに最大10人を抽出し、1人分のメモを結合して300文字で切り詰め（学籍番号・氏名は含めない）（JS） | `memos.ts` `getUnitMemoSamplesForExport` |

---

## DB 側の処理

### SQL 関数・トリガー

| 名前 | 種類 | 処理 | 定義 |
|---|---|---|---|
| `my_role()` | 関数（`security definer`） | ログインユーザーのロールを返す。RLS の条件で使用 | `20260308000002_rls.sql` |
| `handle_new_user()` | トリガー関数（`security definer`） | `auth.users` への登録時に `profiles` を作成 | `20260308000001_init_schema.sql` |
| `on_auth_user_created` | トリガー | 上記を `auth.users` の INSERT 後に実行 | 同上 |
| `set_updated_at()` / `memos_set_updated_at` | トリガー | `memos` 更新時に `updated_at` を更新 | 同上 |

### アプリから呼び出す SQL 関数（RPC）

すべて `security invoker`（呼び出したユーザーの RLS が効く）で、未ログイン（anon）からは実行できない。

| 名前 | 処理 | 呼び出し元 | 定義 |
|---|---|---|---|
| `quiz_question_stats(subject_id, min, max)` | 科目内の小テストについて、学籍番号が範囲内の生徒ごとに最新受験を特定し、設問ごとの正答数・回答数（記述式を除く）を返す | `quizzes.ts` `getQuizAnalytics` | `20260928000001_quiz_question_stats.sql` |

### RLS の概要

| テーブル | 閲覧 | 作成・更新・削除 |
|---|---|---|
| `profiles` | 本人／教師は生徒のみ／管理者は全件 | 本人が更新（`role` は変更不可）／教師は生徒を更新（`role` は変更不可）／管理者は全件更新（作成はトリガー） |
| `subjects`・`units`・`lessons`・`questions` | 認証ユーザー全員 | 教師・管理者のみ |
| `quizzes`・`quiz_questions` | 認証ユーザー全員 | 教師・管理者のみ |
| `code_snippets` | 認証ユーザー全員 | 教師・管理者のみ |
| `memos` | 本人／教師・管理者は全件 | 本人のみ |
| `posts` | 認証ユーザー全員 | 作成は本人のメモからのみ／削除は本人または教師・管理者 |
| `quiz_attempts`・`quiz_attempt_answers` | 本人／教師・管理者は全件 | 作成は本人のみ（更新・削除なし） |
| `code_states` | 本人／教師・管理者は全件 | 作成・更新は本人のみ |

### インデックス（主キー・一意制約以外）

| テーブル | 列 |
|---|---|
| `quiz_attempts` | `(quiz_id, user_id, submitted_at desc)`（最新受験の特定用） |
| `quiz_attempt_answers` | `attempt_id`、`question_id` |
| `code_snippets` | `lesson_id` |
| `code_states` | `snippet_id` |

---

## 行数上限（1000行）の影響を受ける箇所

Supabase の `max_rows = 1000` により、1リクエストで1000行を超えるデータは打ち切られる（[詳細](architecture.md#集計をどこでやるか)）。以下は、データ量によって上限に達しうる箇所。

| 関数 | 取得対象 | 上限に達する条件 |
|---|---|---|
| `quizzes.ts` `getLessonQuizResultsByStudent` | 1レッスン×1クラスの受験記録 | 1クラスの受験記録が1000件を超える場合（40人なら1人平均25回以上の再受験）。回答は受験記録にネストしているため対象外 |
| `quizzes.ts` `getUnitQuizResultsForExport` | 単元内の全クイズ×学年の受験記録 | 単元の小テスト数×学年の生徒数×受験回数が1000を超える場合 |
| 上記関数の回答取得（100受験ずつ分割） | 受験100件分の回答 | 1つの小テストの設問が10問を超える場合 |
| `code-snippets.ts` `getLessonCodeStatesByStudent` | 1レッスン×1クラスの保存内容 | 1クラスの生徒数×初期コード数が1000を超える場合（40人なら初期コード25個以上） |
| `memos.ts` `getLessonMemosByClass` | 1レッスン×1クラスのメモ | 1クラスのメモが1000件を超える場合（40人なら1人平均25件以上） |
| `memos.ts` `getUnitMemoSamplesForExport` | 生徒100人分×単元内のメモ | 単元のメモが多い場合 |
| `users.ts` `getAllProfiles` | 全生徒のプロフィール | 生徒数が1000人を超える場合 |

1人分のデータだけを取る関数（`getStudentQuizStatuses`・`getMemoCountsByLesson`・`getAllMemos`・`getQuizResultsByUser`）は、1人の件数が1000を超えない限り影響しない。
