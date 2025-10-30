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
    const { cpf_hash } = await req.json()
    
    if (!cpf_hash) {
      return new Response(
        JSON.stringify({ error: 'cpf_hash é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar formato do hash (deve ser SHA-256: 64 caracteres hex)
    if (!/^[a-f0-9]{64}$/i.test(cpf_hash)) {
      return new Response(
        JSON.stringify({ error: 'cpf_hash inválido' }),
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

    // Gerar user_id a partir do hash (primeiros 16 caracteres)
    const userId = cpf_hash.substring(0, 16);
    
    // Buscar usuário existente
    let { data: user, error } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .eq('cpf_hash', cpf_hash)
      .single()

    // Se não existir, criar novo usuário
    if (!user || error?.code === 'PGRST116') {
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          cpf_hash: cpf_hash,
          user_id: userId
        })
        .select('user_id')
        .single()

      if (insertError) {
        console.error('Erro ao criar usuário:', insertError)
        return new Response(
          JSON.stringify({ error: 'Erro ao criar usuário' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      user = newUser
    }

    // Retornar apenas user_id (CPF nunca é retornado ou armazenado de forma exposta)
    return new Response(
      JSON.stringify({ user_id: user.user_id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Erro na função auth-user:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

