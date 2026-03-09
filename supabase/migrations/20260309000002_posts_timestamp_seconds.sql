-- posts テーブルに timestamp_seconds カラムを追加（メモ投稿時のタイムスタンプを引き継ぐ）
alter table public.posts
  add column timestamp_seconds int default null;
