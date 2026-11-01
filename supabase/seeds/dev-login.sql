-- =====================================================================
-- ダミーアカウントでのログインを可能にする（ローカル開発専用）
-- =====================================================================
-- seed.sql の seed-*@example.com に、パスワードログインに必要な情報を補う。
-- 実行しても他のデータは変わらないため、db reset せずに何度でも流せる。
-- パスワードは src/lib/dev-login.ts の DEV_LOGIN_PASSWORD と揃える。
-- =====================================================================

update auth.users
set
  encrypted_password = extensions.crypt('dev-login-password', extensions.gen_salt('bf')),
  raw_app_meta_data = '{"provider":"email","providers":["email"]}',
  -- Auth サーバーはこれらの列が NULL だとユーザーを読み込めない
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  reauthentication_token = coalesce(reauthentication_token, '')
where email like 'seed-%@example.com';

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  id::text,
  id,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email',
  now(),
  now(),
  now()
from auth.users
where email like 'seed-%@example.com'
on conflict (provider_id, provider) do nothing;
