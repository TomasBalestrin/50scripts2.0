-- ============================================================
-- 004_storage_setup.sql
-- Storage bucket and policies for script audio files
-- ============================================================

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'script-audios',
  'script-audios',
  true,
  10485760, -- 10MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Admins can upload audio files
CREATE POLICY "Admins can upload audio" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'script-audios' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policy: Anyone can read audio files (public bucket)
CREATE POLICY "Anyone can read audio" ON storage.objects
  FOR SELECT USING (bucket_id = 'script-audios');

-- RLS Policy: Admins can update (overwrite) audio files
CREATE POLICY "Admins can update audio" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'script-audios' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policy: Admins can delete audio files
CREATE POLICY "Admins can delete audio" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'script-audios' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
