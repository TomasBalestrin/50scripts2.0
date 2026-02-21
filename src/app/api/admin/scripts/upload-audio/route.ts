import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';

export async function POST(request: NextRequest) {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const scriptId = formData.get('script_id') as string | null;

    if (!file || !scriptId) {
      return NextResponse.json(
        { error: 'file e script_id sao obrigatorios' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4',
      'audio/webm',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use MP3, WAV, OGG, M4A ou WebM.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo excede o limite de 10MB.' },
        { status: 400 }
      );
    }

    // Verify script exists
    const { data: script, error: scriptError } = await supabase
      .from('scripts')
      .select('id')
      .eq('id', scriptId)
      .single();

    if (scriptError || !script) {
      return NextResponse.json(
        { error: 'Script não encontrado' },
        { status: 404 }
      );
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'mp3';
    const fileName = `${scriptId}/${Date.now()}.${ext}`;

    // Convert File to ArrayBuffer then to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('script-audios')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[upload-audio] Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Falha ao enviar arquivo de audio' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('script-audios')
      .getPublicUrl(fileName);

    const audioUrl = urlData.publicUrl;

    // Update script record with audio_url
    const { error: updateError } = await supabase
      .from('scripts')
      .update({
        audio_url: audioUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scriptId);

    if (updateError) {
      console.error('[upload-audio] Error updating script:', updateError);
      return NextResponse.json(
        { error: 'Falha ao atualizar script com URL do audio' },
        { status: 500 }
      );
    }

    return NextResponse.json({ audio_url: audioUrl });
  } catch (err) {
    console.error('[upload-audio] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const body = await request.json();
    const { script_id } = body as { script_id?: string };

    if (!script_id) {
      return NextResponse.json(
        { error: 'script_id e obrigatorio' },
        { status: 400 }
      );
    }

    // Get current audio_url to extract file path
    const { data: script } = await supabase
      .from('scripts')
      .select('audio_url')
      .eq('id', script_id)
      .single();

    if (script?.audio_url) {
      // Extract file path from public URL
      const urlParts = script.audio_url.split('/script-audios/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('script-audios').remove([filePath]);
      }
    }

    // Clear audio_url from script
    const { error: updateError } = await supabase
      .from('scripts')
      .update({
        audio_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', script_id);

    if (updateError) {
      console.error('[upload-audio] Error clearing audio_url:', updateError);
      return NextResponse.json(
        { error: 'Falha ao remover audio do script' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[upload-audio] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
