# ノートのひな形の JSON

ノートのひな形は、コンテンツ管理の各レッスンの「ノートのひな形」で作る。
エディタで直接書くほか、生成 AI に下書きを作らせて「JSON で読み込む」から取り込める。
なぜひな形を用意するかは [design.md の「ノートのテンプレート」](design.md#ノートのテンプレート) を参照。

## 形式

tiptap の文書 JSON。最上位は `{"type": "doc", "content": [...]}`。

| 要素 | JSON | 用途 |
|---|---|---|
| 見出し | `{"type": "heading", "attrs": {"level": 2}, "content": [文字]}` | 区切りの題（「1. CPUとメモリの関係」） |
| 段落 | `{"type": "paragraph", "content": [文字]}` | 穴埋めの文。穴は `【　　　　】`（全角の空白）で書く |
| 引用 | `{"type": "blockquote", "content": [段落]}` | 発問（「考えてみよう：…」） |
| 区切り線 | `{"type": "horizontalRule"}` | 区切りと区切りの間 |
| 箇条書き | `{"type": "bulletList", "content": [{"type": "listItem", "content": [段落]}]}` | |
| 文字 | `{"type": "text", "text": "…"}` | 太字は `"marks": [{"type": "bold"}]` |

画像は JSON では入れず、読み込んだあとにエディタへ貼り付ける（貼り付けた画像だけが、生徒のノートで使える）。

## 例

```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "1. CPUとメモリの関係" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "CPUは【　　　　】から命令を読み出して実行する。" }] },
    { "type": "blockquote", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "考えてみよう：メモリを増やすと、なぜ速くなることがあるのだろう？" }] }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "自分の考え：" }] },
    { "type": "horizontalRule" }
  ]
}
```

## 生成 AI への指示文の例

授業資料（edu リポジトリのレッスンの Markdown など）と一緒に渡す。

```
添付の授業資料をもとに、生徒が授業動画を見ながら埋める「ノートのひな形」を作ってください。

・2〜4 個の区切りに分け、それぞれに見出しを付ける
・各区切りに、動画を見れば答えられる穴埋めの文を 2〜3 個入れる。穴は【　　　　】（全角の空白）で書き、答えは書かない
・各区切りの最後に、動画の内容を超えて考える発問を 1 つ入れ、その下に「自分の考え：」の行を置く
・区切りの間には区切り線を入れる
・出力は tiptap の文書 JSON だけにする（形式は次の例に合わせる）

（上の「例」の JSON を貼る）
```
