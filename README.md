# phantom-meeting

「情報Ⅰ」授業用の動画配信プラットフォーム。
動画を「ただ見るだけ」で終わらせず、発問・メモ・小テストを通じて生徒の主体的な学びを支援する。

---

## 機能

### 生徒向け
- **動画視聴** — YouTube埋め込みで科目・単元・レッスンごとに管理
- **発問** — 探究への問い。メモ記入を促す（将来：Claude API による自動生成）
- **メモ** — tiptap リッチエディタで記録。動画のタイムスタンプに紐づけ可能。任意でクラスに匿名共有
- **共有投稿** — メモをクラスに匿名共有。Realtime でリアルタイム更新
- **小テスト** — 選択式・記述式・並び替えによる理解確認。完了するまで他の生徒の投稿を非表示にする完了ゲート付き
- **小テスト結果一覧** — 受験履歴を科目・単元・レッスン階層で確認
- **メモ一覧** — 全レッスンのメモを科目・単元・レッスン階層で一覧。Markdown でエクスポート可能
- **学習状況ダッシュボード** — ホームの学習状況サマリー・「つぎにやること」、レッスンページのステータス表示（要復習レッスンへのナッジ含む）
- **コーディングプレイグラウンド** — メモ欄をコードエディタに切り替え、Python/JavaScriptをその場で実行（PRIMM方式の授業を想定。プログラミング単元のレッスンのみ有効）
- **プロフィール編集** — 学籍番号・備考を自分で編集

### 教師向け
- **教師ハブ**（`/teacher`）— 「授業をつくる」「生徒をみる」で整理したカード導線
- **コンテンツ管理** — 科目・単元・レッスンの追加・編集・削除、小テスト作成（JSON一括インポート対応）、コーディングプレイグラウンドの初期コード管理
- **分析**（`/teacher/analytics`）— 単元別ヒートマップ / レッスン別の生徒×設問一覧 / 生徒別検索から個人詳細へ
- **生徒一覧・個人詳細** — 学籍番号・備考の管理、生徒ごとの学習状況（受験履歴・メモ件数）の確認
- **生徒メモ閲覧** — レッスン単位で生徒のメモを確認
- **データエクスポート** — 小テスト結果・メモを CSV 出力し、AI分析用プロンプトと合わせて活用

## 技術スタック

| 役割 | 技術 |
|---|---|
| フロントエンド | Next.js (App Router) |
| バックエンド | Next.js API Routes（Client からの mutation と秘匿キーが必要な処理のみ） |
| DB / 認証 | Supabase（Google OAuth） |
| ホスティング | Vercel |
| UI | shadcn/ui + Tailwind CSS |
| リッチテキスト | tiptap |
| コードエディタ | CodeMirror 6 |
| コード実行 | Pyodide（Python）/ サンドボックスiframe（JavaScript）、いずれもブラウザ内完結 |
| ドラッグ&ドロップ | @dnd-kit（小テスト並び替え問題） |
| 画像ホスティング | ImageKit |
| アナリティクス | Vercel Analytics / Speed Insights |
| AI | Claude API（Anthropic）※将来：発問自動生成 |

## ドキュメント

- [設計概要](docs/design.md)
- [機能設計](docs/features.md)
- [アーキテクチャ](docs/architecture.md)
- [技術スタック](docs/tech-stack.md)
- [DBスキーマ](docs/schema.md)
- [実装ロードマップ](docs/roadmap.md)

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
#    NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=...

# 3. アプリコンテナを起動（http://localhost:3000）
docker compose up
```

### よく使うコマンド

```bash
docker compose exec app npm run lint
docker compose exec app npm run typecheck
docker compose exec app npm run build
```

### 停止

```bash
docker compose down
supabase stop
```
