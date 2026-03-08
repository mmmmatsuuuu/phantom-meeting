# DBスキーマ

## テーブル関係図

```
subjects
  └── units
        └── lessons
              ├── questions
              ├── memos ──→ posts
              └── quizzes
                    └── quiz_questions
```

---

## テーブル定義

### profiles
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK、auth.usersと連携 |
| role | enum | 'admin' / 'teacher' / 'student' |
| is_approved | bool | default false（teacher承認フラグ） |
| display_name | text | |
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
| created_at | timestamptz | |

### questions（発問）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK |
| lesson_id | uuid | FK → lessons |
| content | text | 発問内容 |
| order | int | 表示順 |
| created_at | timestamptz | |

### memos
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK |
| lesson_id | uuid | FK → lessons |
| user_id | uuid | FK → profiles |
| content | jsonb | tiptap JSON |
| timestamp_seconds | int | nullable、動画タイムスタンプ |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### posts（共有投稿）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK |
| memo_id | uuid | FK → memos |
| lesson_id | uuid | FK → lessons（クエリ効率化のため非正規化） |
| user_id | uuid | FK → profiles（投稿者。自分の投稿判定・削除権限に使用） |
| content | jsonb | 共有時点のスナップショット |
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
| correct_answer | jsonb | 正解 |
| options | jsonb | nullable（選択肢・並び替えの要素） |
| order | int | 表示順 |
