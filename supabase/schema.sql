-- ====================================================================
-- BANCO DE DADOS: URNA ELETRÔNICA JUVENTUDE (JUMP / IGREJA)
-- Execute este script no SQL Editor do seu projeto Supabase
-- ====================================================================

-- 1. TABELA DE CONFIGURAÇÃO DA ELEIÇÃO
CREATE TABLE IF NOT EXISTS configuracao_eleicao (
  id TEXT PRIMARY KEY DEFAULT 'cfg-default',
  titulo TEXT NOT NULL DEFAULT 'Eleições JUMP 2026',
  igreja TEXT NOT NULL DEFAULT 'JUMP',
  subtitulo TEXT DEFAULT 'Escolha com oração e sabedoria a nova diretoria para o próximo mandato',
  status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'aberta', 'encerrada')),
  cargo_ativo_id TEXT NOT NULL DEFAULT 'cargo-presidente',
  modo_votacao TEXT NOT NULL DEFAULT 'sequencial_um_por_vez',
  eleitos JSONB DEFAULT '[]'::jsonb,
  exigir_codigo_eleitor BOOLEAN NOT NULL DEFAULT false,
  codigo_mesario TEXT NOT NULL DEFAULT 'jumpelections@2026',
  som_habilitado BOOLEAN NOT NULL DEFAULT true,
  bloqueio_dispositivo BOOLEAN NOT NULL DEFAULT true,
  rodadas_tokens JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Migrações seguras (para caso o banco já tenha sido criado antes)
ALTER TABLE configuracao_eleicao ADD COLUMN IF NOT EXISTS cargo_ativo_id TEXT DEFAULT 'cargo-presidente';
ALTER TABLE configuracao_eleicao ADD COLUMN IF NOT EXISTS modo_votacao TEXT DEFAULT 'sequencial_um_por_vez';
ALTER TABLE configuracao_eleicao ADD COLUMN IF NOT EXISTS eleitos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE configuracao_eleicao ADD COLUMN IF NOT EXISTS bloqueio_dispositivo BOOLEAN DEFAULT true;
ALTER TABLE configuracao_eleicao ADD COLUMN IF NOT EXISTS rodadas_tokens JSONB DEFAULT '{}'::jsonb;

-- 2. TABELA DE CARGOS EM DISPUTA (5 CARGOS DA DIRETORIA)
CREATE TABLE IF NOT EXISTS cargos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 1,
  digitos INTEGER NOT NULL DEFAULT 2,
  permite_branco BOOLEAN NOT NULL DEFAULT true,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA DE CANDIDATOS
CREATE TABLE IF NOT EXISTS candidatos (
  id TEXT PRIMARY KEY,
  cargo_id TEXT NOT NULL REFERENCES cargos(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  nome TEXT NOT NULL,
  nome_vice TEXT,
  chapa TEXT NOT NULL,
  foto_url TEXT,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(cargo_id, numero)
);

-- 4. TABELA DE ELEITORES APTOS (LISTA DE JOVENS)
CREATE TABLE IF NOT EXISTS eleitores (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo TEXT UNIQUE NOT NULL,
  votou BOOLEAN NOT NULL DEFAULT false,
  votou_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. TABELA DE VOTOS (SIGILO ABSOLUTO: NÃO POSSUI COLUNA ELEITOR_ID)
CREATE TABLE IF NOT EXISTS votos (
  id TEXT PRIMARY KEY,
  cargo_id TEXT NOT NULL REFERENCES cargos(id) ON DELETE CASCADE,
  candidato_id TEXT REFERENCES candidatos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('valido', 'branco', 'nulo')),
  numero_digitado TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. REGISTRO DE DISPOSITIVOS VOTANTES (BLOQUEIO DE VOTO DUPLO POR APARELHO PRESERVANDO O SIGILO)
CREATE TABLE IF NOT EXISTS registro_dispositivos (
  id TEXT PRIMARY KEY,
  cargo_id TEXT NOT NULL REFERENCES cargos(id) ON DELETE CASCADE,
  dispositivo_id TEXT NOT NULL,
  token_rodada TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(cargo_id, dispositivo_id, token_rodada)
);

-- Índices de Alta Performance (Evitam statement timeout em consultas concorrentes)
CREATE INDEX IF NOT EXISTS idx_candidatos_cargo_numero ON candidatos(cargo_id, numero);
CREATE INDEX IF NOT EXISTS idx_votos_cargo_tipo ON votos(cargo_id, tipo);
CREATE INDEX IF NOT EXISTS idx_registro_disp ON registro_dispositivos(cargo_id, dispositivo_id, token_rodada);

-- ====================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ====================================================================
ALTER TABLE configuracao_eleicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE eleitores ENABLE ROW LEVEL SECURITY;
ALTER TABLE votos ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_dispositivos ENABLE ROW LEVEL SECURITY;

-- Políticas públicas com DROP prévio para permitir reexecução idempotente sem erros
DROP POLICY IF EXISTS "Permitir leitura de configuracao para todos" ON configuracao_eleicao;
CREATE POLICY "Permitir leitura de configuracao para todos" ON configuracao_eleicao FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir update de configuracao" ON configuracao_eleicao;
CREATE POLICY "Permitir update de configuracao" ON configuracao_eleicao FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir leitura de cargos para todos" ON cargos;
CREATE POLICY "Permitir leitura de cargos para todos" ON cargos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir gerenciamento de cargos" ON cargos;
CREATE POLICY "Permitir gerenciamento de cargos" ON cargos FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir leitura de candidatos para todos" ON candidatos;
CREATE POLICY "Permitir leitura de candidatos para todos" ON candidatos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir gerenciamento de candidatos" ON candidatos;
CREATE POLICY "Permitir gerenciamento de candidatos" ON candidatos FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir leitura e atualizacao de eleitores" ON eleitores;
CREATE POLICY "Permitir leitura e atualizacao de eleitores" ON eleitores FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir leitura e insercao de votos" ON votos;
CREATE POLICY "Permitir leitura e insercao de votos" ON votos FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir leitura e insercao de dispositivos" ON registro_dispositivos;
CREATE POLICY "Permitir leitura e insercao de dispositivos" ON registro_dispositivos FOR ALL USING (true);

-- ====================================================================
-- HABILITAR REALTIME NO SUPABASE (WEBSOCKETS PARA ATUALIZAÇÃO INSTANTÂNEA)
-- ====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE votos;
    ALTER PUBLICATION supabase_realtime ADD TABLE configuracao_eleicao;
    ALTER PUBLICATION supabase_realtime ADD TABLE registro_dispositivos;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ====================================================================
-- DADOS INICIAIS: OS 5 CARGOS DA DIRETORIA DO JUMP
-- ====================================================================

-- Configuração inicial
INSERT INTO configuracao_eleicao (id, titulo, igreja, subtitulo, status, exigir_codigo_eleitor, codigo_mesario, som_habilitado)
VALUES (
  'cfg-default',
  'Eleições JUMP 2026',
  'JUMP',
  'Escolha com oração e sabedoria a nova diretoria para o próximo mandato',
  'aguardando',
  false,
  'jumpelections@2026',
  true
) ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  igreja = EXCLUDED.igreja;

-- Os 5 Cargos da Diretoria em ordem sequencial
INSERT INTO cargos (id, nome, ordem, digitos, permite_branco, descricao) VALUES
('cargo-presidente', 'PRESIDENTE', 1, 2, true, 'Presidente da Juventude JUMP'),
('cargo-vice', 'VICE-PRESIDENTE', 2, 2, true, 'Vice-Presidente da Juventude JUMP'),
('cargo-sec-1', '1º SECRETÁRIO', 3, 2, true, 'Primeiro Secretário(a)'),
('cargo-sec-2', '2º SECRETÁRIO', 4, 2, true, 'Segundo Secretário(a)'),
('cargo-tesoureiro', 'TESOUREIRO', 5, 2, true, 'Tesoureiro(a) da Juventude JUMP')
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  ordem = EXCLUDED.ordem;

-- Candidatos de Demonstração (Apenas Foto e Nome)
INSERT INTO candidatos (id, cargo_id, numero, nome, chapa, foto_url) VALUES
-- Presidente
('cand-pres-1', 'cargo-presidente', '10', 'LUCAS EMANUEL', 'JUMP', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'),
('cand-pres-2', 'cargo-presidente', '20', 'GABRIEL SANTOS', 'JUMP', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'),

-- Vice-presidente
('cand-vice-1', 'cargo-vice', '11', 'REBECA LIMA', 'JUMP', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80'),
('cand-vice-2', 'cargo-vice', '21', 'SARAH MARTINS', 'JUMP', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80'),

-- 1º Secretário
('cand-sec1-1', 'cargo-sec-1', '12', 'ANA CLARA ALBUQUERQUE', 'JUMP', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80'),
('cand-sec1-2', 'cargo-sec-1', '22', 'DANIEL RIBEIRO', 'JUMP', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80'),

-- 2º Secretário
('cand-sec2-1', 'cargo-sec-2', '13', 'FELIPE AUGUSTO', 'JUMP', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80'),
('cand-sec2-2', 'cargo-sec-2', '23', 'CAMILA FERREIRA', 'JUMP', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'),

-- Tesoureiro
('cand-tes-1', 'cargo-tesoureiro', '14', 'MATHEUS SILVA', 'JUMP', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80'),
('cand-tes-2', 'cargo-tesoureiro', '24', 'BEATRIZ SOUZA', 'JUMP', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;
