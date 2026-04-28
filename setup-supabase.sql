-- ============================================================
-- RSN Live Chat — Setup do Supabase
-- ============================================================
-- 1. Crie uma conta gratuita em https://supabase.com
-- 2. Crie um novo projeto (qualquer nome, região perto de vc)
-- 3. Espere o projeto ficar ativo
-- 4. Vá em SQL Editor > New query
-- 5. Cole este script inteiro e clique em RUN
-- 6. Depois vá em Project Settings > API e copie:
--    - URL
--    - anon public key
-- 7. Cole esses valores no arquivo script.js nas constantes:
--    SUPABASE_URL e SUPABASE_ANON_KEY
-- ============================================================

-- Cria tabela de mensagens
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL DEFAULT 'Anon',
  text text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilita Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Política: qualquer um pode ler mensagens
CREATE POLICY "Allow public read" ON public.messages
  FOR SELECT USING (true);

-- Política: qualquer um pode inserir mensagens
CREATE POLICY "Allow public insert" ON public.messages
  FOR INSERT WITH CHECK (true);

-- Política: admins podem deletar (vamos simplificar: qualquer um pode deletar no client)
-- Se quiser restringir deleção no servidor, use uma função ou secret key.
-- Por simplicidade do chat público, liberamos delete:
CREATE POLICY "Allow public delete" ON public.messages
  FOR DELETE USING (true);

-- Índice pra ordenação rápida
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at);

-- ============================================================
-- HABILITAR REALTIME (Chat em tempo real)
-- ============================================================
-- Vá em Database > Replication > Source (0 tables)
-- Clique em "messages" para habilitar realtime na tabela
-- Ou execute no SQL Editor:
-- ============================================================

BEGIN;
  -- Garante que o realtime está habilitado
  INSERT INTO realtime.schema_migrations (version, name)
  VALUES ('00000000000000', 'init')
  ON CONFLICT DO NOTHING;
COMMIT;

-- Adiciona a tabela messages à publicação do realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
