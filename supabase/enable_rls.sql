-- ====================================================================
-- SCRIPT COMPLETO: ATIVAR RLS COM PERMISSÕES PÚBLICAS PARA VOTAÇÃO
-- Execute este script no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/cwnixnwbxzjpkikdplaw/sql/new
-- ====================================================================

-- 1. CONCEDER PERMISSÕES DE ACESSO AO ESQUEMA PUBLIC (ESSENCIAL PARA O ANON)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- 2. HABILITAR ROW LEVEL SECURITY (RLS) NAS TABELAS
ALTER TABLE IF EXISTS configuracao_eleicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS votos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS registro_dispositivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS eleitores ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE ACESSO: CONFIGURACAO_ELEICAO (LEITURA E ESCRITA)
DROP POLICY IF EXISTS "Permitir tudo em configuracao_eleicao" ON configuracao_eleicao;
DROP POLICY IF EXISTS "Permitir leitura de configuracao para todos" ON configuracao_eleicao;
DROP POLICY IF EXISTS "Permitir update de configuracao" ON configuracao_eleicao;
CREATE POLICY "Permitir tudo em configuracao_eleicao"
  ON configuracao_eleicao
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- 4. POLÍTICAS DE ACESSO: CARGOS (LEITURA E GERENCIAMENTO)
DROP POLICY IF EXISTS "Permitir tudo em cargos" ON cargos;
DROP POLICY IF EXISTS "Permitir leitura de cargos para todos" ON cargos;
DROP POLICY IF EXISTS "Permitir gerenciamento de cargos" ON cargos;
CREATE POLICY "Permitir tudo em cargos"
  ON cargos
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- 5. POLÍTICAS DE ACESSO: CANDIDATOS (LEITURA E GERENCIAMENTO)
DROP POLICY IF EXISTS "Permitir tudo em candidatos" ON candidatos;
DROP POLICY IF EXISTS "Permitir leitura de candidatos para todos" ON candidatos;
DROP POLICY IF EXISTS "Permitir gerenciamento de candidatos" ON candidatos;
CREATE POLICY "Permitir tudo em candidatos"
  ON candidatos
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- 6. POLÍTICAS DE ACESSO: VOTOS (LEITURA PARA TELÃO/ADMIN E INSERÇÃO PELOS CELULARES)
DROP POLICY IF EXISTS "Permitir tudo em votos" ON votos;
DROP POLICY IF EXISTS "Permitir leitura e insercao de votos" ON votos;
CREATE POLICY "Permitir tudo em votos"
  ON votos
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- 7. POLÍTICAS DE ACESSO: REGISTRO_DISPOSITIVOS (CONTROLE DE 1 VOTO POR APARELHO)
DROP POLICY IF EXISTS "Permitir tudo em registro_dispositivos" ON registro_dispositivos;
DROP POLICY IF EXISTS "Permitir leitura e insercao de dispositivos" ON registro_dispositivos;
CREATE POLICY "Permitir tudo em registro_dispositivos"
  ON registro_dispositivos
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- 8. POLÍTICAS DE ACESSO: ELEITORES
DROP POLICY IF EXISTS "Permitir tudo em eleitores" ON eleitores;
DROP POLICY IF EXISTS "Permitir leitura e atualizacao de eleitores" ON eleitores;
CREATE POLICY "Permitir tudo em eleitores"
  ON eleitores
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- 9. HABILITAR WEBSOCKETS REALTIME PARA ATUALIZAÇÃO INSTANTÂNEA
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE configuracao_eleicao;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE votos;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE registro_dispositivos;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;
