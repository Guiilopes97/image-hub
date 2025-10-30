import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { unique_id } = await req.json()
    
    if (!unique_id) {
      return new Response(
        JSON.stringify({ error: 'unique_id é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar file_path da tabela image_links usando unique_id
    const { data: linkData, error: linkError } = await supabaseAdmin
      .from('image_links')
      .select('file_path')
      .eq('unique_id', unique_id)
      .single()

    if (linkError || !linkData) {
      return new Response(
        JSON.stringify({ error: 'Imagem não encontrada' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Download da imagem do Storage (requisição interna, não visível para o cliente)
    // O file_path contém userId/filename, não CPF
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('images')
      .download(linkData.file_path)

    if (downloadError || !fileData) {
      console.error('Erro ao fazer download:', downloadError)
      return new Response(
        JSON.stringify({ error: 'Erro ao carregar imagem' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Converter para arrayBuffer e determinar content-type
    const arrayBuffer = await fileData.arrayBuffer()
    const contentType = fileData.type || 'image/webp'

    // Retornar a imagem sem expor nenhum path ou CPF
    return new Response(arrayBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Erro na função image-proxy:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

