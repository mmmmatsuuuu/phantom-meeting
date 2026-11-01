-- =====================
-- 自由制作（maker）
--
-- 年1回程度の特設イベントで、次年度以降も使う保証がない機能のため、既存テーブルには
-- 列を追加しない。外部キーは maker_* から既存テーブルへの一方向のみで、
-- 廃止するときは次の drop だけで DB から取り除ける。
--
--   drop function public.submit_maker_work(uuid);
--   drop table public.maker_submissions, public.maker_works, public.maker_gallery_openings;
--   drop function public.maker_can_view_gallery(uuid);
--   drop table public.maker_events;
-- =====================

-- 配信する課題
create table public.maker_events (
  id          uuid primary key default gen_random_uuid(),
  unit_id     uuid references public.units(id) on delete set null,
  title       text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description) <= 5000),
  -- プロンプト・作品例・初期コード。年度ごとに項目が変わってもマイグレーション不要にする
  settings    jsonb not null default '{}'::jsonb,
  status      text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on public.maker_events (unit_id);

-- 作品一覧を閲覧できるクラス。行があれば公開中
-- （提出前に他の生徒の作品を見られないよう、教員がクラスごとに開放する）
create table public.maker_gallery_openings (
  event_id  uuid not null references public.maker_events(id) on delete cascade,
  grade     smallint not null check (grade between 1 and 3),
  class_num smallint not null check (class_num between 1 and 9),
  opened_at timestamptz not null default now(),
  primary key (event_id, grade, class_num)
);

-- 生徒の下書き。RLS は行単位のため、下書きを読まれないよう提出物と別テーブルにする
create table public.maker_works (
  event_id    uuid not null references public.maker_events(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  plan        text not null default '' check (char_length(plan) <= 2000),
  title       text not null default '' check (char_length(title) <= 100),
  description text not null default '' check (char_length(description) <= 2000),
  code        text not null default '' check (char_length(code) <= 20000),
  updated_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- 提出時点のコピー。書き込みは submit_maker_work 経由のみ
create table public.maker_submissions (
  event_id       uuid not null references public.maker_events(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  -- 生徒は他の生徒の profiles を読めないため、作者表示用に提出時点の値を持つ
  student_number int,
  title          text not null,
  description    text not null,
  code           text not null,
  submitted_at   timestamptz not null default now(),
  -- 教員による公開停止。再提出しても解除されない
  hidden_at      timestamptz,
  primary key (event_id, user_id)
);

alter table public.maker_events           enable row level security;
alter table public.maker_gallery_openings enable row level security;
alter table public.maker_works            enable row level security;
alter table public.maker_submissions      enable row level security;

-- ログインユーザーのクラスが作品一覧を閲覧できるか（学籍番号は GCNN 形式）
create function public.maker_can_view_gallery(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.maker_gallery_openings o
      on o.grade = p.student_number / 1000
     and o.class_num = (p.student_number % 1000) / 100
    where p.id = auth.uid()
      and o.event_id = p_event_id
  );
$$;

-- maker_events
create policy "maker_events: 公開中は閲覧可"
  on public.maker_events for select
  using (status <> 'draft' or (select public.my_role()) in ('teacher', 'admin'));

create policy "maker_events: teacher/admin のみ作成"
  on public.maker_events for insert
  with check ((select public.my_role()) in ('teacher', 'admin'));

create policy "maker_events: teacher/admin のみ更新"
  on public.maker_events for update
  using ((select public.my_role()) in ('teacher', 'admin'));

create policy "maker_events: teacher/admin のみ削除"
  on public.maker_events for delete
  using ((select public.my_role()) in ('teacher', 'admin'));

-- maker_gallery_openings
create policy "maker_gallery_openings: teacher/admin のみ閲覧"
  on public.maker_gallery_openings for select
  using ((select public.my_role()) in ('teacher', 'admin'));

create policy "maker_gallery_openings: teacher/admin のみ作成"
  on public.maker_gallery_openings for insert
  with check ((select public.my_role()) in ('teacher', 'admin'));

create policy "maker_gallery_openings: teacher/admin のみ削除"
  on public.maker_gallery_openings for delete
  using ((select public.my_role()) in ('teacher', 'admin'));

-- maker_works
create policy "maker_works: 本人と teacher/admin が閲覧"
  on public.maker_works for select
  using (
    user_id = (select auth.uid())
    or (select public.my_role()) in ('teacher', 'admin')
  );

create policy "maker_works: 受付中のみ本人が作成"
  on public.maker_works for insert
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.maker_events e
      where e.id = event_id and e.status = 'open'
    )
  );

create policy "maker_works: 受付中のみ本人が更新"
  on public.maker_works for update
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.maker_events e
      where e.id = event_id and e.status = 'open'
    )
  );

-- maker_submissions
create policy "maker_submissions: 閲覧条件"
  on public.maker_submissions for select
  using (
    user_id = (select auth.uid())
    or (select public.my_role()) in ('teacher', 'admin')
    or (hidden_at is null and public.maker_can_view_gallery(event_id))
  );

create policy "maker_submissions: teacher/admin のみ更新"
  on public.maker_submissions for update
  using ((select public.my_role()) in ('teacher', 'admin'));

-- 下書きを提出物へコピーする。生徒には hidden_at を書き換えられないよう
-- maker_submissions への書き込み権限を与えず、この関数だけを入口にする
create function public.submit_maker_work(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_student_number int;
  v_role public.role;
  v_work public.maker_works%rowtype;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from public.maker_events
    where id = p_event_id and status = 'open'
  ) then
    raise exception 'event_not_open';
  end if;

  select student_number, role into v_student_number, v_role
  from public.profiles where id = v_user_id;

  if v_role = 'student' and v_student_number is null then
    raise exception 'student_number_required';
  end if;

  select * into v_work
  from public.maker_works
  where event_id = p_event_id and user_id = v_user_id;

  if not found
    or btrim(v_work.title) = ''
    or btrim(v_work.description) = ''
    or btrim(v_work.code) = '' then
    raise exception 'work_incomplete';
  end if;

  insert into public.maker_submissions
    (event_id, user_id, student_number, title, description, code)
  values
    (p_event_id, v_user_id, v_student_number, v_work.title, v_work.description, v_work.code)
  on conflict (event_id, user_id) do update set
    student_number = excluded.student_number,
    title = excluded.title,
    description = excluded.description,
    code = excluded.code,
    submitted_at = now();
end;
$$;

revoke execute on function public.submit_maker_work(uuid) from public, anon;
revoke execute on function public.maker_can_view_gallery(uuid) from public, anon;
grant execute on function public.submit_maker_work(uuid) to authenticated;
grant execute on function public.maker_can_view_gallery(uuid) to authenticated;
