# Guia de Migração - Proteção de CPF

## Arquivos Criados

1. **`src/utils/userMapping.ts`** - Funções para hash e mapeamento de CPF
2. **`supabase/functions/auth-user/index.ts`** - Edge Function de autenticação
3. **`supabase/functions/image-proxy/index.ts`** - Edge Function de proxy de imagens
4. **`supabase_migration.sql`** - Script SQL para criar tabelas no Supabase

## Passos para Configuração

### 1. Executar Script SQL

Execute o arquivo `supabase_migration.sql` no **SQL Editor** do Dashboard do Supabase para criar:
- Tabela `users` (mapeamento CPF hash → user_id)
- Tabela `image_links` (mapeamento unique_id → file_path)

### 2. Deploy das Edge Functions

No terminal, execute:

```bash
# Deploy da função de autenticação
supabase functions deploy auth-user

# Deploy da função de proxy de imagens
supabase functions deploy image-proxy
```

**Nota:** Se você ainda não configurou o Supabase CLI, siga as instruções em:
https://supabase.com/docs/guides/cli

### 3. Configurar Variáveis de Ambiente

As Edge Functions usam automaticamente as variáveis de ambiente do Supabase:
- `SUPABASE_URL` - Já configurado
- `SUPABASE_SERVICE_ROLE_KEY` - Deve estar configurado nas Secrets das Edge Functions

Para configurar via Dashboard:
1. Vá em **Edge Functions** → **Secrets**
2. Adicione `SUPABASE_SERVICE_ROLE_KEY` com a chave de service role do seu projeto

### 4. Testar

1. **Login:** Tente fazer login com um CPF válido
2. **Upload:** Faça upload de uma imagem
3. **Visualização:** Acesse o link compartilhável da imagem

## Como Funciona

### Autenticação
- CPF nunca é enviado ao Supabase
- Frontend gera hash SHA-256 do CPF (client-side)
- Edge Function `auth-user` recebe apenas o hash
- Retorna `user_id` (primeiros 16 caracteres do hash)

### Armazenamento
- Imagens são salvas em `userId/filename` (não `cpf/filename`)
- Mapeamento `unique_id → userId/filename` é salvo na tabela `image_links`

### Visualização
- Edge Function `image-proxy` recebe `unique_id`
- Busca `file_path` na tabela `image_links`
- Faz download interno do Storage
- Retorna imagem sem expor nenhum path na requisição HTTP visível

## Compatibilidade Retroativa

O sistema mantém compatibilidade com:
- Links antigos que usam CPF (através de fallback)
- Imagens existentes (usa decodificação base64 como fallback)

## Benefícios

✅ **CPF nunca aparece em requisições HTTP visíveis**
✅ **Storage usa userId (hash) ao invés de CPF**
✅ **Links compartilháveis não expõem CPF**
✅ **Autenticação determinística (mesmo CPF = mesmo userId)**
✅ **Compatível com sistema anterior (migração gradual)**

## Troubleshooting

### Erro: "table does not exist"
- Execute o script `supabase_migration.sql` no SQL Editor

### Erro: "function not found"
- Execute o deploy das Edge Functions
- Verifique se as Secrets estão configuradas

### Imagens antigas não aparecem
- Isso é esperado: novas imagens usam userId, antigas usam CPF
- Para migrar imagens antigas, é necessário um script de migração separado

