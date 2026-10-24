# 技術スタック

## スタック一覧

| 役割 | 技術 |
|---|---|
| フロントエンド | Next.js (App Router) |
| バックエンド | Next.js API Routes（Client からの mutation と秘匿キーが必要な処理のみ） |
| DB | Supabase |
| 認証 | Supabase Auth（Google OAuth） |
| ホスティング | Vercel |
| 動画 | YouTube埋め込み |
| UIコンポーネント | shadcn/ui + Tailwind CSS |
| リッチテキスト | tiptap |
| コードエディタ | CodeMirror 6（コーディングプレイグラウンド） |
| コード実行 | Pyodide（Python、jsDelivr CDN配信）/ サンドボックスiframe（JavaScript）※いずれもブラウザ内完結、サーバー実行なし |
| ドラッグ&ドロップ | @dnd-kit（小テスト並び替え問題） |
| 画像ホスティング | ImageKit（小テスト問題文・解説の画像） |
| Markdown変換 | tiptap-markdown（メモの Markdown エクスポート） |
| 画面遷移フィードバック | nextjs-toploader（画面遷移中のトップローディングバー） |
| アナリティクス | Vercel Analytics / Speed Insights（ページビュー・Core Web Vitals） |
| テスト | Vitest（`lib/` の純粋関数の単体テスト。開発用の依存のみ） |
| AI | Claude API（Anthropic）※将来：発問自動生成 |

## 選定理由

- **Clerk廃止**：Supabase AuthがGoogle認証をネイティブサポート
- **無料枠**：Supabase・Vercel共に無料枠で運用可能（ImageKit も無料枠内）
- **Google連携**：生徒・教師ともにGoogleアカウントで認証
- **Next.js**：React 5年以上の経験があり学習コストゼロ、AI補助の情報量が最大
- **Claude API**：将来の発問生成時のみ呼び出すため、最上位モデルでもコストは無視できる水準
- **ImageKit**：無料枠でも画像変換・CDN配信が使えるため画像最適化を別途実装不要
- **Pyodide / サンドボックスiframe**：コード実行をサーバーに頼らずブラウザ内で完結させることで、任意コード実行のセキュリティリスクとサーバーコストの両方を回避

## デプロイ構成

### Node.js バージョン

本番（Vercel）・開発コンテナともに **Node.js 24.x（Active LTS）** に揃える。

- 本番：[`package.json`](../package.json) の `engines.node`（`"24.x"`）で固定する。
  ダッシュボードの Node.js Version 設定より `engines` が優先される
- 開発：[`docker-compose.yml`](../docker-compose.yml) の `node:24-alpine`

**理由**：2026年10月の Node.js セキュリティリリースは 26.x / 24.x / 22.x のみが対象で、
EOL の 20.x には修正が提供されない。サポート中の LTS に揃え、バージョンをリポジトリで管理して
ダッシュボード側の設定漏れや、プロジェクト作り直し時に既定値へ戻る事故を防ぐ。

**補足**

- `24.x` 指定のため、パッチ版（セキュリティ修正）は Vercel 側で自動的に最新が使われる
- 開発コンテナは `docker compose pull` でイメージを更新すると最新のパッチ版になる
- メジャーバージョンを上げるときは `engines`・`docker-compose.yml`・`@types/node` を同時に変更する

### 実行リージョン

Vercel Functions は**東京（`hnd1`）**に固定する。設定は [`vercel.json`](../vercel.json) で管理する。

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["hnd1"]
}
```

**理由**：Supabase を AWS 東京リージョン（`ap-northeast-1`）で運用しているため、
Server Component・API Route から DB への往復を同一リージョン内に収める。
Vercel の既定は `iad1`（米国東部）で、そのままだと 1 クエリごとに太平洋を往復することになる。

**補足**

- ダッシュボードの Functions 設定でも同じ値を指定できるが、リポジトリに残らないため
  `vercel.json` を正とする。プロジェクトを作り直した際に既定値へ戻る事故を防ぐ
- Hobby プランで指定できるのは 1 リージョンのみ。上限を超えるとビルド前にデプロイが失敗する
- `functionFailoverRegions`（フェイルオーバー先の指定）は Enterprise 限定のため使用しない
- ルーティングミドルウェア（`proxy.ts`）はリージョン設定に関わらず全リージョンへ配信される。
  未認証リクエストのリダイレクトはユーザーに最も近いエッジで完結し、`hnd1` まで到達しない
- リージョン変更は次回デプロイから反映される。反映確認は次のコマンドで行う

```bash
curl -sI https://phantom-meeting.vercel.app/login | grep x-vercel-id
# => x-vercel-id: kix1::hnd1::...
#    2つ目のセグメントが関数の実行リージョン
```
