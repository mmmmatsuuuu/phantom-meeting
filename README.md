# ruminy

> 飲み込んで終わりにしない。反芻する学習サイト

「情報Ⅰ」授業用の動画配信プラットフォーム。`phantom-meeting` はコードネームで、リポジトリ名などはそのまま残している。
動画で学び、ノートで広げ深め、小テストで確かめる。動画を「ただ見るだけ」で終わらせず、自分のことばにする場をつくる。
名前・コンセプト・見た目の決まりは [docs/design.md](docs/design.md) の「UIコンセプト」を参照。

---

## 機能

### 生徒向け
- **動画視聴** — YouTube埋め込みで科目・単元・レッスンごとに管理
- **ノート** — 先生が用意したひな形（穴埋めと発問）を読み込み、方眼の用紙に自分の考えを書き足す。保存しても続きを書ける（DB では `memos`）
- **小テスト** — 選択式・記述式・並び替えによる理解確認。答案用紙に答え、赤ペンで答え合わせする
- **小テスト結果一覧** — 受験履歴を科目・単元・レッスン階層で確認
- **ノート一覧** — 全レッスンのノートを科目・単元・レッスン階層で一覧。Markdown でエクスポート可能
- **AIで振り返る** — 単元の学習データ（小テスト・ノート・コード）を埋め込んだプロンプトを生成し、生徒が自分の使いたい AI に貼り付けて振り返りの壁打ちができる（AI API は呼ばない）
- **目次** — 単元ごとのルーズリーフにレッスンを並べ、ノートの有無と小テストの得点を示す
- **コーディングプレイグラウンド** — ノートの横のインデックスからコードエディタに切り替え、Python/JavaScriptをその場で実行（PRIMM方式の授業を想定。プログラミング単元のレッスンのみ有効）
- **自由制作** — 生徒が作るものを自分で決めて制作・提出し、作品を共有して実行し合う特設課題（作品展はクラスごとに開放し、クラス単位で表示。問題のある作品は教師が公開停止）
- **プロフィール編集** — 学籍番号・備考を自分で編集

### 教師向け
- **教師ハブ**（`/teacher`）— 「授業をつくる」「生徒をみる」で整理した一覧
- **コンテンツ管理** — 科目・単元・レッスンの追加・編集・削除、ノートのひな形の作成（JSON の読み込み対応）、小テスト作成（JSON一括インポート対応）、コーディングプレイグラウンドの初期コード管理
- **分析**（`/teacher/analytics`）— 単元別ヒートマップ（小テスト・単元・科目の平均正答率つき） / レッスン別の生徒×設問一覧 / 生徒別検索から個人詳細へ
- **生徒一覧・個人詳細** — 学籍番号・備考の管理、生徒ごとの学習状況（受験履歴・ノート件数）の確認
- **生徒ノート閲覧** — レッスン単位で生徒のノートを確認
- **データエクスポート** — 小テスト結果・ノートを CSV 出力し、AI分析用プロンプトと合わせて活用

## 技術スタック

| 役割 | 技術 |
|---|---|
| フロントエンド | Next.js (App Router) |
| バックエンド | Next.js API Routes（Client からの mutation と秘匿キーが必要な処理のみ） |
| DB / 認証 | Supabase（Google OAuth） |
| ホスティング | Vercel（Functions は東京リージョン `hnd1` 固定。[理由](docs/tech-stack.md#実行リージョン)） |
| ランタイム | Node.js 24.x（本番・開発コンテナ共通。[理由](docs/tech-stack.md#nodejs-バージョン)） |
| UI | shadcn/ui + Tailwind CSS |
| リッチテキスト | tiptap |
| コードエディタ | CodeMirror 6 |
| コード実行 | Pyodide（Python）/ サンドボックスiframe（JavaScript）、いずれもブラウザ内完結 |
| ドラッグ&ドロップ | @dnd-kit（小テスト並び替え問題） |
| 画像ホスティング | ImageKit |
| アナリティクス | Vercel Analytics / Speed Insights |
| AI | API 連携なし（AIで振り返る・データエクスポートは、プロンプトを生徒・教師が自分の AI に貼り付ける） |

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [設計](docs/design.md) | 目的・名前・コンセプト・見た目の決まりと、その理由 |
| [機能設計](docs/features.md) | 各機能の仕様と決めた理由、廃止・見送りした機能 |
| [アーキテクチャ](docs/architecture.md) | データアクセスと処理の配置の方針、フォルダ構成 |
| [処理の配置一覧](docs/processing-map.md) | 画面ごとに、どの処理をどの層（フロント・API・DB）に置いたか |
| [DBスキーマ](docs/schema.md) | テーブルの定義と関係 |
| [技術スタック](docs/tech-stack.md) | 使っている技術と選んだ理由、デプロイ構成 |
| [ロードマップ](docs/roadmap.md) | これまでのフェーズと、これからの予定 |
| [AIで振り返る](docs/review-prompt.md) | 生徒向けの振り返りプロンプトの仕様と理由 |
| [ノートのひな形の JSON](docs/note-template-json.md) / [小テストの JSON](docs/quiz-json.md) | 生成 AI に下書きを作らせて取り込むときの形式と指示文の例 |
| [ヤギの絵](docs/mascot.md) | マスコットの一覧と生成の指示文 |

## 開発

コマンドはすべて Docker コンテナ内で実行する（ホストで直接 `npm` は実行しない。`git` のみホストで実行）。

### 前提

- Docker / Docker Compose
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)（ローカル DB・認証を起動するため）

### 起動手順

```bash
# 1. ローカル Supabase を起動（app コンテナとは別プロセス）
supabase start

# 2. .env.local を用意し、`supabase start` の出力に表示される値を設定
#    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
#    SUPABASE_INTERNAL_URL=http://host.docker.internal:54321   # コンテナ→ホストの接続用
#    SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=...
#    SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=...
#    IMAGEKIT_PRIVATE_KEY=...                                  # 画像アップロード機能を使う場合

# 3. アプリコンテナを起動（http://localhost:3000）
docker compose up
```

### ダミーアカウントでのログイン

開発環境では、ログイン画面のパネルから Google OAuth を使わずにシードの教師1名・生徒32名でログインできる。`NODE_ENV=development` かつ接続先がローカルの Supabase のときだけ有効で、本番では表示されず、ログイン用のルートも 404 を返す。

`supabase db reset` をすれば自動で準備される。reset せずに既存のローカル DB で使えるようにするには、次を実行する。

```bash
docker exec -i supabase_db_phantom_meeting psql -U postgres -d postgres < supabase/seeds/dev-login.sql
```

自由制作のダミーデータ（課題1件と提出物。内容はファイル冒頭に記載）も `db reset` で入る。reset せずに入れる、または初期状態に戻すには `supabase/seeds/maker.sql` を同様に流す。

ノートのひな形のダミーデータ（「CPUとメモリの役割」「2進数と情報量」の 2 レッスン）も同様で、`supabase/seeds/note-templates.sql` を流すと入る。

### よく使うコマンド

```bash
docker compose exec app npm run lint
docker compose exec app npm run typecheck
docker compose exec app npm test        # 単体テスト（Vitest。src/**/*.test.ts）
docker compose exec -e NODE_ENV=production app npm run build   # コンテナ既定の NODE_ENV=development のままだとプリレンダーで失敗する
docker compose exec app npm audit       # 依存パッケージの既知の脆弱性を確認
```

### 停止

```bash
docker compose down
supabase stop
```

## 進捗

- [x] 動画・ノート・小テストの基本の流れ（Phase 0〜15.9）
- [x] データの利活用（エクスポート・AIで振り返る、Phase 19）
- [x] 分析と導線の整理（Phase 20）
- [x] コーディングプレイグラウンド（Phase 21〜22）
- [x] 自由制作（Phase 24）
- [x] ruminy へのリニューアル（Phase 25）
- [ ] `posts` テーブルの削除

フェーズごとの内容とウェイトリストは [docs/roadmap.md](docs/roadmap.md)。
