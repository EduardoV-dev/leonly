update storage.buckets
set file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'memory-photos';

create policy "Members can view their staged private memory photo objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'memory-photos'
  and (select private.can_write_memory_photo_object(name))
);
