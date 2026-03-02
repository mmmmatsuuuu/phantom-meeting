# phantom-meeting

「情報Ⅰ」授業用の動画配信プラットフォーム。
動画を「ただ見るだけ」で終わらせず、発問・メモ・小テストを通じて生徒の主体的な学びを支援する。

---

## 機能

- **動画視聴** — YouTube埋め込みで科目・単元・レッスンごとに管理
- **発問** — AIが生成する探究への問い。メモ記入を促す
- **メモ** — 動画のタイムスタンプに紐づけて記録。任意でクラスに匿名共有
- **小テスト** — 選択式・記述式・並び替えによる理解確認

## 技術スタック

| 役割 | 技術 |
|---|---|
| フロントエンド | Next.js (App Router) |
| DB / 認証 | Supabase（Google OAuth） |
| ホスティング | Vercel |
| UI | shadcn/ui + Tailwind CSS |
| リッチテキスト | tiptap |
| AI | OpenAI API |

## ドキュメント

- [設計概要](docs/design.md)
- [機能設計](docs/features.md)
- [アーキテクチャ](docs/architecture.md)
- [技術スタック](docs/tech-stack.md)
- [DBスキーマ](docs/schema.md)

## セットアップ

（実装環境構築後に追記）
