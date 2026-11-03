-- =====================================================================
-- ノートのひな形のダミーデータ（ローカル開発専用）
-- =====================================================================
-- seed.sql のレッスン「CPUとメモリの役割」「2進数と情報量」に、穴埋めと発問を含むひな形を入れる。
-- 実行するとこの 2 つのひな形は初期状態に戻る。db reset せずに何度でも流せる。
-- =====================================================================

insert into public.memo_templates (lesson_id, content, updated_by) values
(
  '00000000-0000-0000-0000-000000002001',
  $json${"type": "doc", "content": [
    {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "1. CPUとメモリの関係"}]},
    {"type": "paragraph", "content": [{"type": "text", "text": "CPUは【　　　　】から命令を読み出して実行する。"}]},
    {"type": "paragraph", "content": [{"type": "text", "text": "メモリは電源を切ると内容が【　　　　】記憶装置である。"}]},
    {"type": "blockquote", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "考えてみよう：メモリを増やすと、なぜ速くなることがあるのだろう？"}]}]},
    {"type": "paragraph", "content": [{"type": "text", "text": "自分の考え："}]},
    {"type": "horizontalRule"},
    {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "2. 記憶装置の使い分け"}]},
    {"type": "paragraph", "content": [{"type": "text", "text": "速い順に並べると、【　　　　】→ メモリ → 【　　　　】となる。"}]},
    {"type": "blockquote", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "考えてみよう：すべてを一番速い記憶装置で作らないのはなぜだろう？"}]}]},
    {"type": "paragraph", "content": [{"type": "text", "text": "自分の考え："}]}
  ]}$json$::jsonb,
  '00000000-0000-0000-0000-000000000001'
),
(
  '00000000-0000-0000-0000-000000002002',
  $json${"type": "doc", "content": [
    {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "1. 2進数のしくみ"}]},
    {"type": "paragraph", "content": [{"type": "text", "text": "コンピュータは、情報を【　　　　】と【　　　　】の2つの状態で表す。"}]},
    {"type": "paragraph", "content": [{"type": "text", "text": "2進数の1けたを【　　　　】という。"}]},
    {"type": "blockquote", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "考えてみよう：なぜコンピュータは10進数ではなく2進数を使うのだろう？"}]}]},
    {"type": "paragraph", "content": [{"type": "text", "text": "自分の考え："}]},
    {"type": "horizontalRule"},
    {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "2. 情報量"}]},
    {"type": "paragraph", "content": [{"type": "text", "text": "8ビットを【　　　　】という。8ビットで表せるのは【　　　　】通り。"}]}
  ]}$json$::jsonb,
  '00000000-0000-0000-0000-000000000001'
)
on conflict (lesson_id) do update set
  content = excluded.content,
  updated_by = excluded.updated_by,
  updated_at = now();
