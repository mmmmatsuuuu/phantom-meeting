-- =====================
-- 作品展の RLS の判定を、1 クエリにつき 1 回にする
--
-- 症状：作品展を開くと、提出物の閲覧ポリシーの maker_can_view_gallery(event_id) が行ごとに実行される。
-- 引数が行の値（event_id）のため、(select ...) で囲んで initPlan にする手（20261029000001_db_performance.sql）が使えない。
-- 1 クラス分（約 40 行）でも、行ごとにプロフィールとクラスの開放状況を引き直していた。
--
-- 対策：ログインユーザーのクラスが閲覧できる課題の ID の一覧を返す関数を作り、
-- ポリシーは event_id in (select ...) にする。相関のないサブクエリなので、1 クエリにつき 1 回だけ評価される。
-- 許可する範囲（本人・教員・管理者・開放されたクラスの公開中の作品）は変えない。
--
-- あわせて、作品展の取得（課題 × 学籍番号の範囲、学籍番号順）に合うインデックスを足す
-- =====================

-- ログインユーザーのクラスが作品展を閲覧できる課題の ID（学籍番号は GCNN 形式）
create function public.maker_viewable_event_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select o.event_id
  from public.profiles p
  join public.maker_gallery_openings o
    on o.grade = p.student_number / 1000
   and o.class_num = (p.student_number % 1000) / 100
  where p.id = auth.uid();
$$;

-- 作品展のページが RPC で呼ぶ判定も、同じ関数を使って条件を 1 か所にまとめる
create or replace function public.maker_can_view_gallery(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_event_id in (select public.maker_viewable_event_ids());
$$;

alter policy "maker_submissions: 閲覧条件" on public.maker_submissions
  using (
    user_id = (select auth.uid())
    or (select public.my_role()) in ('teacher', 'admin')
    or (hidden_at is null and event_id in (select public.maker_viewable_event_ids()))
  );

create index if not exists maker_submissions_event_student_number_idx
  on public.maker_submissions (event_id, student_number);
