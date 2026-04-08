-- supabase/migrations/011_resumes_bucket.sql
-- Create the resumes storage bucket and RLS policies
-- Files are stored at: {enterprise_id}/{candidate_id}/{filename}

-- Create the bucket (public: false = private bucket)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  10485760, -- 10MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- RLS: members can select (download) files in their enterprise folder
create policy "enterprise members can read own resumes"
  on storage.objects for select
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] in (
      select enterprise_id::text
      from public.enterprise_members
      where user_id = auth.uid()
    )
  );

-- RLS: members can upload files into their enterprise folder
create policy "enterprise members can upload resumes"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] in (
      select enterprise_id::text
      from public.enterprise_members
      where user_id = auth.uid()
    )
  );

-- RLS: members can update (replace) files in their enterprise folder
create policy "enterprise members can update resumes"
  on storage.objects for update
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] in (
      select enterprise_id::text
      from public.enterprise_members
      where user_id = auth.uid()
    )
  );

-- RLS: members can delete files in their enterprise folder
create policy "enterprise members can delete resumes"
  on storage.objects for delete
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] in (
      select enterprise_id::text
      from public.enterprise_members
      where user_id = auth.uid()
    )
  );
