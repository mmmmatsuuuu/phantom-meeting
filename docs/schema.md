# DBスキーマ

## テーブル関係図

```
subjects
  └── units
        └── lessons
              ├── questions
              ├── memo_templates（ノートのひな形。1 レッスンに 1 つ）
              ├── memos ──→ posts（廃止予定）
              ├── quizzes
              │     ├── quiz_questions
              │     └── quiz_attempts
              │           └── quiz_attempt_answers
              └── code_snippets
                    └── code_states

maker_events（自由制作。既存テーブルへは unit_id の一方向のみ）
  ├── maker_gallery_openings
  ├── maker_works
  └── maker_submissions
```

---

## テーブル定義

### profiles
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK、auth.usersと連携 |
| role | enum | 'admin' / 'teacher' / 'student'。本人・教師は変更不可、変更できるのは admin のみ（RLS、`20260927000001_profiles_role_lock.sql`） |
| is_approved | bool | default false。**未使用**（teacher承認フローのUIを撤去したため参照箇所なし。列は削除せず残置） |
| display_name | text | |
| student_number | int | nullable、学籍番号 |
| note | text | nullable、備考 |
| created_at | timestamptz | |

### subjects
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK |
| name | text | 科目名 |
| order | int | 表示順 |
| created_by | uuid | FK → profiles |
| created_at | timestamptz | |

### units
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK |
| subject_id | uuid | FK → subjects |
| name | text | 単元名 |
| order | int | 表示順 |
| created_at | timestamptz | |

### lessons
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK |
| unit_id | uuid | FK → units |
| title | text | |
| youtube_url | text | |
| order | int | 表示順 |
| enable_playground | bool | default false。コーディングプレイグラウンド（Phase 21）の有効/無効 |
| created_at | timestamptz | |

### questions（発問）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK |
| lesson_id | uuid | FK → lessons |
| content | text | 発問内容 |
| order | int | 表示順 |
| created_at | timestamptz | |

### memo_templates（ノートのひな形）
| カラム | 型 | 備考 |
|---|---|---|
| lesson_id | uuid | PK、FK → lessons（on delete cascade） |
| content | jsonb | tiptap JSON。穴埋めと発問を含むプリントのようなひな形 |
| updated_by | uuid | nullable、FK → profiles（on delete set null） |
| updated_at | timestamptz | |

閲覧は認証ユーザー全員、作成・更新・削除は teacher/admin（RLS、`20261103000001_memo_templates.sql`）。

### memos（画面上は「ノート」）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK |
| lesson_id | uuid | FK → lessons |
| user_id | uuid | FK → profiles |
| content | jsonb | tiptap JSON |
| timestamp_seconds | int | nullable、動画タイムスタンプ（画面からは記録しなくなった） |
| created_at | timestamptz | |
| updated_at | timestamptz | レッスンを開いたときに、最後に更新したノートを開くのに使う |

画像は、そのレッスンの `memo_templates` にあるものだけを保存できる（API で検証）。

### posts（共有投稿・廃止予定）

画面と API からは使っていない。マージ後に別の PR でテーブルを削除する。

| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK |
| memo_id | uuid | FK → memos |
| lesson_id | uuid | FK → lessons（クエリ効率化のため非正規化） |
| user_id | uuid | FK → profiles（投稿者。自分の投稿判定・削除権限に使用） |
| content | jsonb | 共有時点のスナップショット |
| timestamp_seconds | int | nullable、投稿元メモのタイムスタンプ |
| created_at | timestamptz | |

### quizzes
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK |
| lesson_id | uuid | FK → lessons |
| title | text | |
| created_at | timestamptz | |

### quiz_questions
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK |
| quiz_id | uuid | FK → quizzes |
| type | enum | 'multiple_choice' / 'short_answer' / 'ordering' |
| content | jsonb | tiptap JSON（問題文） |
| explanation | jsonb | nullable、tiptap JSON（解説） |
| correct_answer | jsonb | 正解 |
| options | jsonb | nullable（選択肢・並び替えの要素） |
| order | int | 表示順 |

### quiz_attempts
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK |
| quiz_id | uuid | FK → quizzes |
| user_id | uuid | FK → profiles |
| score | int | 正解数（short_answer 除く） |
| max_score | int | 採点対象の問題数 |
| submitted_at | timestamptz | |

### quiz_attempt_answers
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK |
| attempt_id | uuid | FK → quiz_attempts |
| question_id | uuid | FK → quiz_questions |
| answer | jsonb | 回答内容（選択肢テキスト / 記述テキスト / 順序配列） |
| is_correct | bool | nullable（null = short_answer・自己採点のため） |

`answer` カラムの格納形式：
- 選択式：`{"type": "multiple_choice", "selectedText": "..."}`
- 記述式：`{"type": "short_answer", "text": "..."}`
- 並び替え：`{"type": "ordering", "items": [...]}`

### code_snippets（教師が登録する初期コード。Phase 21）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK |
| lesson_id | uuid | FK → lessons |
| title | text | 例:「例1」 |
| language | enum | 'python' / 'javascript' |
| initial_code | text | 初期コード |
| order | int | 表示順 |
| created_at | timestamptz | |

### code_states（生徒ごとのコード編集内容の保存。Phase 21）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK |
| snippet_id | uuid | FK → code_snippets |
| user_id | uuid | FK → profiles |
| code | text | 生徒が編集した現在のコード |
| last_output | text | nullable、直近の実行結果（出力・エラーを含む）。実行のたびに上書き |
| updated_at | timestamptz | |

`unique(snippet_id, user_id)`。書き込みは本人のみ（RLS）。閲覧は本人に加えteacher/adminも可（Phase 22c、`20260804000001_code_states_teacher_select.sql`）。

### maker_events（自由制作の課題）
既存テーブルに列を追加せず、`maker_*` だけで完結させている（年1回程度の特設イベントで、次年度以降も使う保証がないため）。廃止手順は [features.md](features.md) の「自由制作」を参照。

| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK |
| unit_id | uuid | nullable、FK → units（on delete set null）。レッスン一覧で表示する単元 |
| title | text | 1〜100文字 |
| description | text | 課題の詳細（プレーンテキスト、5000文字以内） |
| settings | jsonb | `{ prompts: [{title, body}], examples: [{title, description, code}], starterCode }` |
| status | text | 'draft' / 'open' / 'closed'。draft は生徒から見えない |
| created_by | uuid | nullable、FK → profiles |
| created_at / updated_at | timestamptz | |

### maker_gallery_openings（作品一覧を閲覧できるクラス）
| カラム | 型 | 備考 |
|---|---|---|
| event_id | uuid | PK、FK → maker_events |
| grade | smallint | PK、1〜3 |
| class_num | smallint | PK、1〜9 |
| opened_at | timestamptz | |

行があるクラスの生徒だけが他の生徒の作品を閲覧できる。読み書きは teacher/admin のみ。

### maker_works（生徒の下書き）
| カラム | 型 | 備考 |
|---|---|---|
| event_id | uuid | PK、FK → maker_events |
| user_id | uuid | PK、FK → profiles |
| plan | text | 課題設定。他の生徒には公開しない（2000文字以内） |
| title | text | 作品名（100文字以内） |
| description | text | 説明（2000文字以内） |
| code | text | Pythonコード（2万文字以内） |
| updated_at | timestamptz | |

閲覧は本人と teacher/admin。書き込みは受付中（status = 'open'）の本人のみ。

### maker_submissions（提出時点のコピー）
| カラム | 型 | 備考 |
|---|---|---|
| event_id | uuid | PK、FK → maker_events |
| user_id | uuid | PK、FK → profiles |
| student_number | int | nullable、提出時点の学籍番号（作者表示用。生徒は他の生徒の profiles を読めないため） |
| title / description / code | text | 提出時点の下書きのコピー |
| submitted_at | timestamptz | 再提出で更新 |
| hidden_at | timestamptz | nullable、教員による公開停止。再提出しても解除されない |

書き込みは RPC `submit_maker_work` のみ（生徒に `hidden_at` を書き換えさせないため）。閲覧は本人、teacher/admin、および公開停止されていない作品を開放済みクラスの生徒（`maker_can_view_gallery`）。
