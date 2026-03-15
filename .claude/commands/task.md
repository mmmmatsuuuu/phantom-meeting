以下のタスク実行フローに従って、ユーザーから受け取ったタスクを進めてください。

## タスク実行フロー

### Step 1: タスクの確認
- `docs/` ディレクトリの内容（`design.md`, `roadmap.md` 等）を確認し、タスクの背景・設計方針を把握する
- タスクの内容を整理する
- 不明点・曖昧な点があれば、**着手前に質問する**
- 明確になったら次のステップへ

### Step 2: ブランチ作成
mainブランチから以下の命名規則でブランチを作成する：
- `feature/xxx` — 新機能
- `fix/xxx` — バグ修正
- `chore/xxx` — 設定・ドキュメント等

```bash
git checkout main && git pull
git checkout -b <branch-name>
```

### Step 3: タスクの分割
- 必要に応じてタスクを細かく分割し、TodoWriteで管理する
- 分割内容をユーザーに提示し、承認を得てから着手する

### Step 4: 分割タスクを順に実施

各タスクについて以下を繰り返す：

#### 4-1. タスクの実行
- コーディング規約（CLAUDE.md）に従って実装する

#### 4-2. セルフレビュー
実装内容を自己点検する：
- ロジックに誤りがないか
- コーディング規約（命名・型・コンポーネント分割）を守っているか
- `any`型・`console.log`が残っていないか

#### 4-3. lint / typecheck
```bash
docker compose exec app npm run lint
docker compose exec app npm run typecheck
```
エラーが出たら修正してから次へ進む。

#### 4-4. コミット
Conventional Commits形式でコミットする：
```
<type>: <summary>
```
| type | 用途 |
|---|---|
| feat | 新機能 |
| fix | バグ修正 |
| chore | 設定・依存関係・ドキュメント |
| refactor | リファクタリング |
| style | コードスタイル（動作変更なし） |
| test | テスト |

### Step 5: push & PR作成
全タスク完了後、リモートにプッシュしてPRを作成する：
```bash
git push -u origin <branch-name>
```

PRはCLAUDE.mdのPRメッセージ規約に従って作成する：
```
## 概要
何をしたか1〜2行で

## 変更内容
- 箇条書きで変更点

## 確認事項
- [ ] セルフレビュー済み
```

---

ユーザーから渡されたタスク: $ARGUMENTS
