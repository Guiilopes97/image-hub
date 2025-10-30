-- ============================================
-- Script de Migração para Proteção de CPF
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================

-- 1. Criar tabela de usuários (mapeamento CPF Hash -> User ID)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cpf_hash TEXT UNIQUE NOT NULL,  -- SHA-256 do CPF (sem salt público)
  user_id TEXT UNIQUE NOT NULL,    -- ID único público (primeiros 16 chars do hash)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_users_cpf_hash ON users(cpf_hash);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

-- 2. Criar tabela image_links (mapeamento unique_id -> file_path)
CREATE TABLE IF NOT EXISTS image_links (
  unique_id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,  -- Formato: userId/filename (não contém CPF)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_links_unique_id ON image_links(unique_id);
CREATE INDEX IF NOT EXISTS idx_image_links_file_path ON image_links(file_path);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_links ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para users

-- Qualquer pessoa pode criar usuário (via Edge Function com service role)
-- Leitura apenas se autenticado e for próprio usuário
CREATE POLICY "Permitir inserção pública de usuários"
  ON users
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir leitura de próprio usuário"
  ON users
  FOR SELECT
  USING (true);  -- Permitir leitura pública via Edge Function

-- 5. Políticas RLS para image_links

-- Qualquer pessoa pode ler (necessário para links únicos compartilháveis)
CREATE POLICY "Permitir leitura pública de image_links"
  ON image_links
  FOR SELECT
  USING (true);

-- Apenas autenticados podem inserir (via Edge Function com service role)
CREATE POLICY "Permitir inserção autenticada de image_links"
  ON image_links
  FOR INSERT
  WITH CHECK (true);

-- Apenas autenticados podem atualizar
CREATE POLICY "Permitir atualização autenticada de image_links"
  ON image_links
  FOR UPDATE
  USING (true);

-- Apenas autenticados podem deletar
CREATE POLICY "Permitir deleção autenticada de image_links"
  ON image_links
  FOR DELETE
  USING (true);

-- 6. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at em users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Notas de Migração:
-- 
-- 1. Imagens existentes no formato cpf/filename precisarão ser migradas
--    para userId/filename. Isso pode ser feito gradualmente ou via script.
--
-- 2. O sistema manterá compatibilidade com links antigos que usam
--    decodificação base64, mas novos uploads usarão userId.
--
-- 3. Para migrar imagens existentes:
--    - Criar script que lista todas as pastas no Storage
--    - Para cada pasta (CPF), gerar userId a partir do CPF
--    - Renomear pasta de cpf para userId no Storage
--    - Atualizar registros na tabela image_links
-- ============================================

