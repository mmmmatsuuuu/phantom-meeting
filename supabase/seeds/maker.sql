-- =====================================================================
-- 自由制作のダミーデータ（ローカル開発専用）
-- =====================================================================
-- 確認できる状態:
--   1年1組: 作品一覧を開放済み。1101〜1105 は提出済み、1106 は下書きのみ、1107・1108 は未着手
--   1年2組: 未開放。1201〜1203 は提出済み、1204 は公開停止中
-- 実行するとこの課題の内容は初期状態に戻る。db reset せずに何度でも流せる。
-- =====================================================================

delete from public.maker_events where id = '00000000-0000-0000-0000-000000009001';

insert into public.maker_events (id, unit_id, title, description, settings, status, created_by) values (
  '00000000-0000-0000-0000-000000009001',
  '00000000-0000-0000-0000-000000001102',
  '自由制作：作りたいプログラムを作ろう',
  E'これまで学んだ if・for・リストを使って、自分で作りたいプログラムを考えて作りましょう。\n他の人が使うことを考えて、使い方の説明も書いてください。',
  $json${
    "starterCode": "# ここにプログラムを書きましょう\n",
    "prompts": [
      {
        "title": "作るものを決めたい",
        "body": "高校の情報Iでプログラミングを学んでいます。if文、for文、リストを使って作れる、短いPythonプログラムの案を5つ出してください。コードは書かず、案だけを教えてください。"
      },
      {
        "title": "作り方の手順を考えたい",
        "body": "次のプログラムを作りたいです。コードは書かずに、作る手順を順番に教えてください。\n\n作りたいもの："
      }
    ],
    "examples": [
      {
        "title": "じゃんけん",
        "description": "コンピュータとじゃんけんで勝負します。",
        "code": "import random\nme = input(\"ぐー/ちょき/ぱー: \")\ncpu = random.choice([\"ぐー\", \"ちょき\", \"ぱー\"])\nprint(\"相手は\", cpu)"
      }
    ]
  }$json$::jsonb,
  'open',
  '00000000-0000-0000-0000-000000000001'
);

insert into public.maker_gallery_openings (event_id, grade, class_num) values
  ('00000000-0000-0000-0000-000000009001', 1, 1);

-- 提出済みの作品（hidden は教員による公開停止）
with works (student_number, title, description, code, hidden) as (values
  (1101, 'じゃんけん勝負', E'「ぐー」「ちょき」「ぱー」のどれかを入力すると、コンピュータと勝負できます。',
$py$import random

hands = ["ぐー", "ちょき", "ぱー"]
me = input("ぐー/ちょき/ぱー: ")
cpu = random.choice(hands)
print("相手は", cpu)
if me == cpu:
    print("あいこ")
elif (me == "ぐー" and cpu == "ちょき") or (me == "ちょき" and cpu == "ぱー") or (me == "ぱー" and cpu == "ぐー"):
    print("あなたの勝ち！")
else:
    print("あなたの負け")
$py$, false),
  (1102, '今日の運勢', '名前を入力すると、今日の運勢を占います。',
$py$import random

def fortune(name):
    return name + "さんの運勢は" + random.choice(["大吉", "中吉", "小吉", "凶"]) + "です"

print(fortune(input("名前: ")))
$py$, false),
  (1103, '九九の表', '好きな段を入力すると、その段の九九を表示します。',
$py$dan = int(input("何の段？ "))
for i in range(1, 10):
    print(dan, "×", i, "=", dan * i)
$py$, false),
  (1104, '情報Iクイズ', '3問のクイズに答えると、正解数が表示されます。',
$py$questions = [
    ["1バイトは何ビット？", "8"],
    ["2進数の11は10進数でいくつ？", "3"],
    ["リストの最初の要素の番号は？", "0"],
]
score = 0
for q in questions:
    if input(q[0] + " ") == q[1]:
        print("正解！")
        score += 1
    else:
        print("不正解。答えは", q[1])
print(score, "問正解でした")
$py$, false),
  (1105, 'テストの平均', '何も入力しなくても動きます。リストの点数の平均と最高点を表示します。',
$py$scores = [72, 85, 64, 90, 58]
total = 0
best = scores[0]
for s in scores:
    total += s
    if s > best:
        best = s
print("平均", total / len(scores))
print("最高", best)
$py$, false),
  (1201, '数当てゲーム', '1〜10の数を当てます。チャンスは3回です。',
$py$import random

answer = random.randint(1, 10)
for i in range(3):
    guess = int(input("数を入力: "))
    if guess == answer:
        print("正解！")
        break
    print("大きい" if guess < answer else "小さい")
else:
    print("答えは", answer)
$py$, false),
  (1202, '止まらないプログラム', '無限ループの動作確認用です。10秒で止まります。',
$py$while True:
    pass
$py$, false),
  (1203, 'エラーが出るプログラム', 'エラー表示の確認用です。',
$py$print(1 / 0)
$py$, false),
  (1204, '公開停止の確認用', '教員が公開停止した作品の確認用です。',
$py$print("公開停止中の作品です")
$py$, true)
),
inserted as (
  insert into public.maker_works (event_id, user_id, plan, title, description, code)
  select
    '00000000-0000-0000-0000-000000009001',
    ('00000000-0000-0000-0000-' || lpad(student_number::text, 12, '0'))::uuid,
    title || 'を作ります。',
    title, description, code
  from works
)
insert into public.maker_submissions (event_id, user_id, student_number, title, description, code, hidden_at)
select
  '00000000-0000-0000-0000-000000009001',
  ('00000000-0000-0000-0000-' || lpad(student_number::text, 12, '0'))::uuid,
  student_number, title, description, code,
  case when hidden then now() end
from works;

-- 下書きのみ（未提出）
insert into public.maker_works (event_id, user_id, plan, title, description, code) values (
  '00000000-0000-0000-0000-000000009001',
  '00000000-0000-0000-0000-000000001106',
  '身長と体重からBMIを計算するプログラムを作りたい。',
  'BMI計算', '', E'height = float(input("身長(m): "))\n'
);
