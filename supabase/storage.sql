-- Creates the public "avatars" bucket for profile pictures. Run once per Supabase project:
--   node scripts/setup-supabase-storage.js
--
-- Public bucket = anyone can VIEW a picture by its URL (needed to show avatars in <img>).
-- Uploads and deletes are impossible for anon/authenticated: storage.objects has RLS enabled and we add no
-- write policies, so only the server (service-role key) can change files. Size and type limits are enforced
-- by the bucket as well as by the API route.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects already has RLS enabled by Supabase.
