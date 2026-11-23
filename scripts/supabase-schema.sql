-- =============================================================
-- 电子旅游手账本 · Supabase Schema（阶段 5）
-- 执行方式：Supabase Dashboard → SQL Editor → New query → 粘贴执行（幂等，可重复跑）
--
-- 本文件分两段：
--   A. 建表（memories / memory_photos）——已在阶段 5 开头执行过，
--      重跑是幂等的（if not exists），无副作用，可放心整段执行。
--   B. RLS 收紧 + Storage bucket + 对象策略——阶段 5 登录功能完成后
--      收紧为 auth.uid 隔离。新增 bucket `photos` 与读/写策略。
--
-- 回退：需要回到"放行版"时，执行文末注释掉的放行策略即可。
-- =============================================================

-- ---------- A. 建表（幂等） ----------

-- 旅行回忆表（主存储，替代 localStorage v2）
-- 注意：表内不含任何默认值！id / user_id / created_at / updated_at
-- 全部由前端 insert 时提供（crypto.randomUUID + Date.toISOString）。
create table if not exists memories (
  id uuid primary key,
  user_id text not null,                        -- 登录后为 auth.uid()；单用户手账曾用 'me'
  visited_key text not null,                    -- 同前端命名空间：CN-440300 / US-CA-06075
  place_name text not null,                     -- 冗余地名，列表展示不依赖地图数据
  date date not null,                           -- 回忆日期（yyyy-mm-dd）
  text text not null default '',                -- 正文（前端限 2000 字；纯图片回忆可为空串）
  ancestor_keys text[] not null default '{}',   -- 父层键链（点亮推导）：['CN','CN-440000']
  created_at timestamptz not null,
  updated_at timestamptz not null
);

-- 照片元数据表（blob 本体存 Storage bucket `photos`，库里只存引用）
-- memory_photos 不含 user_id：归属由 memory_id 指向的 memories.user_id 推导。
create table if not exists memory_photos (
  id uuid primary key,
  memory_id uuid not null references memories(id) on delete cascade,
  storage_path text not null,                   -- bucket 内路径：<user_id>/<memory_id>/<文件名>
  sort_order int not null default 0,            -- 展示顺序
  created_at timestamptz not null
);

-- 查询索引：按用户 + 地区取回忆，日期倒序（与前端排序一致）
create index if not exists memories_user_visited_idx
  on memories (user_id, visited_key, date desc, created_at desc);
create index if not exists memory_photos_memory_idx
  on memory_photos (memory_id);

-- ---------- B. 阶段 5：RLS 收紧 + Storage ----------

-- B1. 照片 bucket（public：URL 公开可访问，前端可直接 <img> 加载）
-- 注意：只有 SQL Editor（postgres 角色）能建 bucket；anon key 无权建。
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict (id) do nothing;

-- B2. 数据库表 RLS 收紧为 auth.uid 隔离（登录功能上线后执行本段）
alter table memories enable row level security;
alter table memory_photos enable row level security;

-- 先清掉阶段 5 开头的放行策略（若存在）
drop policy if exists "memories_all" on memories;
drop policy if exists "photos_all" on memory_photos;

-- memories：user_id 必须等于当前登录用户
create policy "memories_select_own"
  on memories for select using (user_id = auth.uid());
create policy "memories_insert_own"
  on memories for insert with check (user_id = auth.uid());
create policy "memories_update_own"
  on memories for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "memories_delete_own"
  on memories for delete using (user_id = auth.uid());

-- memory_photos：通过 memory_id 反查所属回忆，须属于当前用户
-- （表里没有 user_id 冗余列，用子查询保证归属，见文件头说明）
create policy "memory_photos_select_own"
  on memory_photos for select
  using (exists (
    select 1 from memories m where m.id = memory_id and m.user_id = auth.uid()
  ));
create policy "memory_photos_insert_own"
  on memory_photos for insert
  with check (exists (
    select 1 from memories m where m.id = memory_id and m.user_id = auth.uid()
  ));
create policy "memory_photos_update_own"
  on memory_photos for update
  using (exists (
    select 1 from memories m where m.id = memory_id and m.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from memories m where m.id = memory_id and m.user_id = auth.uid()
  ));
create policy "memory_photos_delete_own"
  on memory_photos for delete
  using (exists (
    select 1 from memories m where m.id = memory_id and m.user_id = auth.uid()
  ));

-- B3. Storage objects 策略：
--   - 公开读：任何人有 URL 就能看图（bucket 是 public，前端直接 <img>）
--   - 写/删：仅登录用户，且路径首段必须是自己的 user_id
--     （路径约定：photos/<user_id>/<memory_id>/<文件名>，杜绝越权写他人目录）
drop policy if exists "photos_public_read" on storage.objects;
drop policy if exists "photos_auth_write" on storage.objects;
drop policy if exists "photos_auth_update" on storage.objects;
drop policy if exists "photos_auth_delete" on storage.objects;

create policy "photos_public_read"
  on storage.objects for select
  using (bucket_id = 'photos');

create policy "photos_auth_write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "photos_auth_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "photos_auth_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================
-- 回退（如需回到阶段 5 开头的放行版，执行以下内容）：
--   drop policy if exists "memories_select_own" on memories;
--   drop policy if exists "memories_insert_own" on memories;
--   drop policy if exists "memories_update_own" on memories;
--   drop policy if exists "memories_delete_own" on memories;
--   drop policy if exists "memory_photos_select_own" on memory_photos;
--   drop policy if exists "memory_photos_insert_own" on memory_photos;
--   drop policy if exists "memory_photos_update_own" on memory_photos;
--   drop policy if exists "memory_photos_delete_own" on memory_photos;
--   drop policy if exists "photos_public_read" on storage.objects;
--   drop policy if exists "photos_auth_write" on storage.objects;
--   drop policy if exists "photos_auth_update" on storage.objects;
--   drop policy if exists "photos_auth_delete" on storage.objects;
--   create policy "memories_all" on memories for all using (true) with check (true);
--   create policy "photos_all" on memory_photos for all using (true) with check (true);
-- =============================================================
