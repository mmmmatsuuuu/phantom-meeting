# 小テストの JSON

小テストは、コンテンツ管理の各レッスンの「小テスト」で作る。
1 問ずつ手で入力するほか、生成 AI に問題を作らせて「JSON で一括インポート」から取り込める。
取り込んだあとは手で入力したときと同じ状態になるため、内容を確かめて直してから保存する。

## 形式

```json
{
  "title": "小テストのタイトル",
  "questions": [
    {
      "type": "multiple_choice",
      "content": "問題文",
      "explanation": "解説",
      "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
      "correctAnswerIndex": 0
    },
    {
      "type": "short_answer",
      "content": "問題文",
      "explanation": "解説",
      "correctAnswerText": "模範解答"
    },
    {
      "type": "ordering",
      "content": "問題文",
      "explanation": "解説",
      "options": ["1番目", "2番目", "3番目"]
    }
  ]
}
```

| 項目 | 内容 |
|---|---|
| `title` | 省略すると、フォームのタイトルは変えない |
| `type` | `multiple_choice`（選択式）/ `short_answer`（記述式）/ `ordering`（並び替え） |
| `content`・`explanation` | 文字だけ。改行ごとに段落になる。`explanation` は省略・空文字でもよい |
| `options` | 選択式は選択肢、並び替えは**正しい順**に並べる（生徒には混ぜて出す） |
| `correctAnswerIndex` | 選択式の正解の位置（0 から数える） |
| `correctAnswerText` | 記述式の模範解答。記述式は生徒の自己採点で、得点には含めない |

画像・表・コードブロックは JSON では入れず、取り込んだあとにエディタで足す。
JSON として読めない、`questions` がない、未対応の `type` があるときは、フォームを変えずにエラーを出す。

## 生成 AI への指示文の例

授業資料と一緒に渡す。

```
添付の授業資料をもとに、授業動画の理解を確かめる小テストを 5 問作ってください。

・選択式を中心に、並び替えと記述式を 1 問ずつ入れる
・選択式の誤りの選択肢は、生徒が間違えやすい内容にする
・各問に、なぜその答えになるかの解説を付ける
・出力は次の形式の JSON だけにする

（上の「形式」の JSON を貼る）
```
