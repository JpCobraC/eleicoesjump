import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  Cargo,
  Candidato,
  Eleitor,
  Voto,
  ConfiguracaoEleicao,
  ApuracaoCargo,
  PessoaEleita,
  RegistroDispositivo,
} from '@/types/election';
import {
  INITIAL_CARGOS,
  INITIAL_CANDIDATOS,
  INITIAL_ELEITORES,
  INITIAL_CONFIG,
} from './mockData';

const STORAGE_KEYS = {
  CONFIG: 'eleicoes_jump_config_v2',
  CARGOS: 'eleicoes_jump_cargos_v2',
  CANDIDATOS: 'eleicoes_jump_candidatos_v2',
  ELEITORES: 'eleicoes_jump_eleitores_v2',
  VOTOS: 'eleicoes_jump_votos_v2',
  DISPOSITIVOS: 'eleicoes_jump_dispositivos_v2',
};

export const BROADCAST_CHANNEL_NAME = 'eleicoes_jump_realtime_bus';

export function notifyRealtimeChange(tipo: string = 'GERAL') {
  if (typeof window !== 'undefined') {
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.postMessage({ type: tipo, timestamp: Date.now() });
        bc.close();
      }
      window.dispatchEvent(
        new CustomEvent('eleicoes_jump_update', {
          detail: { type: tipo, timestamp: Date.now() },
        })
      );
    } catch {
      // noop
    }
  }
}

// Cache rápido em memória para evitar requisições redundantes a cada poll sub-segundo
let cargosCache: { data: Cargo[]; timestamp: number } | null = null;
let candidatosCache: { data: Candidato[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 6000;

export function invalidateElectionCache(): void {
  cargosCache = null;
  candidatosCache = null;
}

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

// ======================== LOCALSTORAGE HELPERS ======================== //

function getLocal<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Erro ao ler ${key} do localStorage:`, e);
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Erro ao salvar ${key} no localStorage:`, e);
  }
}

// Inicializa o localStorage caso esteja vazio
export function initializeLocalStorage(): void {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
    setLocal(STORAGE_KEYS.CONFIG, INITIAL_CONFIG);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CARGOS)) {
    setLocal(STORAGE_KEYS.CARGOS, INITIAL_CARGOS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CANDIDATOS)) {
    setLocal(STORAGE_KEYS.CANDIDATOS, INITIAL_CANDIDATOS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.ELEITORES)) {
    setLocal(STORAGE_KEYS.ELEITORES, INITIAL_ELEITORES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.VOTOS)) {
    setLocal(STORAGE_KEYS.VOTOS, []);
  }
}

// ======================== CONFIGURAÇÃO ======================== //

export async function getConfiguracao(): Promise<ConfiguracaoEleicao> {
  let config: ConfiguracaoEleicao = INITIAL_CONFIG;

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('configuracao_eleicao')
        .select('*')
        .single();
      if (!error && data) {
        config = { ...INITIAL_CONFIG, ...data };
      }
    } catch (err) {
      console.warn('Erro ao carregar configuracao do Supabase, usando local:', err);
      config = getLocal<ConfiguracaoEleicao>(STORAGE_KEYS.CONFIG, INITIAL_CONFIG);
    }
  } else {
    config = getLocal<ConfiguracaoEleicao>(STORAGE_KEYS.CONFIG, INITIAL_CONFIG);
  }

  // Garante que campos novos existam
  return {
    ...INITIAL_CONFIG,
    ...config,
    exigir_codigo_eleitor: false,
    bloqueio_dispositivo: config.bloqueio_dispositivo ?? true,
    rodadas_tokens: config.rodadas_tokens || {
      'cargo-presidente': 'rodada-1',
      'cargo-vice': 'rodada-1',
      'cargo-sec-1': 'rodada-1',
      'cargo-sec-2': 'rodada-1',
      'cargo-tesoureiro': 'rodada-1',
    },
    modo_votacao: config.modo_votacao || 'sequencial_um_por_vez',
    cargo_ativo_id: config.cargo_ativo_id || 'cargo-presidente',
    eleitos: config.eleitos || [],
  };
}

export async function updateConfiguracao(
  config: Partial<ConfiguracaoEleicao>
): Promise<ConfiguracaoEleicao> {
  const current = await getConfiguracao();
  const updated: ConfiguracaoEleicao = { ...current, ...config };

  // Atualiza imediatamente o LocalStorage para resposta instantânea
  setLocal(STORAGE_KEYS.CONFIG, updated);

  if (isSupabaseConfigured() && supabase) {
    try {
      const configId = current.id || 'cfg-default';
      const payload: Record<string, unknown> = {
        id: configId,
        updated_at: new Date().toISOString(),
        ...config,
      };

      // 1. Tenta atualizar com todos os campos
      const { error } = await supabase
        .from('configuracao_eleicao')
        .update(payload)
        .eq('id', configId);

      if (error) {
        console.warn('Aviso no update completo do Supabase:', error.message);
        // 2. Fallback: tenta atualizar com os campos seguros, incluindo cargo_ativo_id e status
        const safePayload: Record<string, unknown> = {
          status: updated.status,
          updated_at: new Date().toISOString(),
        };
        if (config.cargo_ativo_id !== undefined) safePayload.cargo_ativo_id = config.cargo_ativo_id;
        if (config.eleitos !== undefined) safePayload.eleitos = config.eleitos;
        if (config.titulo !== undefined) safePayload.titulo = config.titulo;
        if (config.igreja !== undefined) safePayload.igreja = config.igreja;
        if (config.codigo_mesario !== undefined) safePayload.codigo_mesario = config.codigo_mesario;
        if (config.rodadas_tokens !== undefined) safePayload.rodadas_tokens = config.rodadas_tokens;
        if (config.bloqueio_dispositivo !== undefined) safePayload.bloqueio_dispositivo = config.bloqueio_dispositivo;

        const { error: safeError } = await supabase
          .from('configuracao_eleicao')
          .update(safePayload)
          .eq('id', configId);

        if (safeError) {
          console.warn('Aviso no fallback de update do Supabase:', safeError.message);
          // Tenta atualizar minimamente status e cargo_ativo_id
          await supabase
            .from('configuracao_eleicao')
            .update({ status: updated.status, updated_at: new Date().toISOString() })
            .eq('id', configId);
        }
      }
    } catch (err) {
      console.warn('Erro ao atualizar config no Supabase:', err);
    }
  }

  notifyRealtimeChange('CONFIG');
  return updated;
}

// ======================== CARGOS ======================== //

export async function getCargos(forceRefresh = false): Promise<Cargo[]> {
  if (!forceRefresh && cargosCache && Date.now() - cargosCache.timestamp < CACHE_TTL_MS) {
    return cargosCache.data;
  }
  let result: Cargo[];
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('cargos')
        .select('*')
        .order('ordem', { ascending: true });
      if (!error && data && data.length > 0) {
        result = data as Cargo[];
        cargosCache = { data: result, timestamp: Date.now() };
        return result;
      }
    } catch (err) {
      console.warn('Erro ao carregar cargos do Supabase, usando local:', err);
    }
  }
  result = getLocal<Cargo[]>(STORAGE_KEYS.CARGOS, INITIAL_CARGOS);
  cargosCache = { data: result, timestamp: Date.now() };
  return result;
}

export async function salvarCargos(cargos: Cargo[]): Promise<void> {
  invalidateElectionCache();
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('cargos').upsert(cargos);
    } catch (err) {
      console.warn('Erro ao salvar cargos no Supabase:', err);
    }
  }
  setLocal(STORAGE_KEYS.CARGOS, cargos);
  notifyRealtimeChange('CARGOS');
}

// ======================== CANDIDATOS ======================== //

export async function getCandidatos(forceRefresh = false): Promise<Candidato[]> {
  let list: Candidato[] = [];

  if (!forceRefresh && candidatosCache && Date.now() - candidatosCache.timestamp < CACHE_TTL_MS) {
    list = candidatosCache.data;
  } else {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('candidatos')
          .select('*')
          .order('numero', { ascending: true });
        if (!error && data && data.length > 0) {
          list = data as Candidato[];
          candidatosCache = { data: list, timestamp: Date.now() };
        }
      } catch (err) {
        console.warn('Erro ao carregar candidatos do Supabase, usando local:', err);
        list = getLocal<Candidato[]>(STORAGE_KEYS.CANDIDATOS, INITIAL_CANDIDATOS);
        candidatosCache = { data: list, timestamp: Date.now() };
      }
    } else {
      list = getLocal<Candidato[]>(STORAGE_KEYS.CANDIDATOS, INITIAL_CANDIDATOS);
      candidatosCache = { data: list, timestamp: Date.now() };
    }
  }

  // Cruza com a lista de eleitos para garantir que inelegibilidade seja aplicada dinamicamente
  const config = await getConfiguracao();
  const eleitosNomes = (config.eleitos || []).map((e) => ({
    norm: normalizeName(e.nome),
    cargoNome: e.cargo_nome,
  }));

  return list.map((cand) => {
    const eleitoAnterior = eleitosNomes.find((e) => e.norm === normalizeName(cand.nome));
    if (eleitoAnterior) {
      return {
        ...cand,
        inelegivel: true,
        motivo_inelegivel: `Já eleito(a) como ${eleitoAnterior.cargoNome}`,
      };
    }
    return cand;
  });
}

export async function salvarCandidato(candidato: Candidato): Promise<void> {
  invalidateElectionCache();
  const candidatos = await getCandidatos(true);
  const index = candidatos.findIndex((c) => c.id === candidato.id);
  let updated: Candidato[];

  if (index >= 0) {
    updated = [...candidatos];
    updated[index] = candidato;
  } else {
    updated = [...candidatos, candidato];
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('candidatos').upsert(candidato);
    } catch (err) {
      console.warn('Erro ao salvar candidato no Supabase:', err);
    }
  }

  setLocal(STORAGE_KEYS.CANDIDATOS, updated);
  notifyRealtimeChange('CANDIDATOS');
}

export async function removerCandidato(id: string): Promise<void> {
  invalidateElectionCache();
  const candidatos = (await getCandidatos(true)).filter((c) => c.id !== id);

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('candidatos').delete().eq('id', id);
    } catch (err) {
      console.warn('Erro ao deletar candidato no Supabase:', err);
    }
  }

  setLocal(STORAGE_KEYS.CANDIDATOS, candidatos);
}

// ======================== ELEITORES ======================== //

export async function getEleitores(): Promise<Eleitor[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('eleitores')
        .select('*')
        .order('nome', { ascending: true });
      if (!error && data && data.length > 0) return data as Eleitor[];
    } catch (err) {
      console.warn('Erro ao carregar eleitores do Supabase, usando local:', err);
    }
  }
  return getLocal<Eleitor[]>(STORAGE_KEYS.ELEITORES, INITIAL_ELEITORES);
}

export async function validarEleitor(codigo: string): Promise<{
  valido: boolean;
  eleitor?: Eleitor;
  mensagem: string;
}> {
  const cleanCode = codigo.trim().toUpperCase();
  const eleitores = await getEleitores();
  const eleitor = eleitores.find(
    (e) => e.codigo.trim().toUpperCase() === cleanCode
  );

  if (!eleitor) {
    return { valido: false, mensagem: 'Código de eleitor não encontrado.' };
  }

  if (eleitor.votou) {
    return {
      valido: false,
      eleitor,
      mensagem: 'Este eleitor já exerceu seu voto para esta votação em andamento.',
    };
  }

  return { valido: true, eleitor, mensagem: 'Eleitor liberado para votar!' };
}

export async function marcarEleitorVotou(codigo: string): Promise<void> {
  const cleanCode = codigo.trim().toUpperCase();
  const eleitores = await getEleitores();
  const index = eleitores.findIndex(
    (e) => e.codigo.trim().toUpperCase() === cleanCode
  );

  if (index >= 0) {
    eleitores[index].votou = true;
    eleitores[index].votou_em = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('eleitores')
          .update({ votou: true, votou_em: new Date().toISOString() })
          .eq('id', eleitores[index].id);
      } catch (err) {
        console.warn('Erro ao atualizar eleitor no Supabase:', err);
      }
    }

    setLocal(STORAGE_KEYS.ELEITORES, eleitores);
  }
}

export async function salvarEleitor(eleitor: Eleitor): Promise<void> {
  const eleitores = await getEleitores();
  const index = eleitores.findIndex((e) => e.id === eleitor.id);
  let updated: Eleitor[];

  if (index >= 0) {
    updated = [...eleitores];
    updated[index] = eleitor;
  } else {
    updated = [...eleitores, eleitor];
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('eleitores').upsert(eleitor);
    } catch (err) {
      console.warn('Erro ao salvar eleitor no Supabase:', err);
    }
  }

  setLocal(STORAGE_KEYS.ELEITORES, updated);
}

export async function removerEleitor(id: string): Promise<void> {
  const eleitores = (await getEleitores()).filter((e) => e.id !== id);

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('eleitores').delete().eq('id', id);
    } catch (err) {
      console.warn('Erro ao remover eleitor no Supabase:', err);
    }
  }

  setLocal(STORAGE_KEYS.ELEITORES, eleitores);
}

export async function resetarStatusEleitores(): Promise<void> {
  const eleitores = (await getEleitores()).map((e) => ({
    ...e,
    votou: false,
    votou_em: undefined,
  }));

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase
        .from('eleitores')
        .update({ votou: false, votou_em: null });
    } catch (err) {
      console.warn('Erro ao resetar eleitores no Supabase:', err);
    }
  }

  setLocal(STORAGE_KEYS.ELEITORES, eleitores);
}

// ======================== IDENTIFICAÇÃO E BLOQUEIO DE DISPOSITIVO ======================== //

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let devId = localStorage.getItem('eleicao_jump_device_id');
  if (!devId) {
    const match = document.cookie.match(/eleicao_jump_device_id=([^;]+)/);
    if (match && match[1]) {
      devId = match[1];
    }
  }
  if (!devId) {
    devId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  localStorage.setItem('eleicao_jump_device_id', devId);
  try {
    document.cookie = `eleicao_jump_device_id=${devId}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}
  return devId;
}

export async function verificarDispositivoJaVotou(
  cargoId: string,
  dispositivoId?: string
): Promise<boolean> {
  const config = await getConfiguracao();
  if (config.bloqueio_dispositivo === false) return false;

  const devId = dispositivoId || getOrCreateDeviceId();
  const tokenRodada = config.rodadas_tokens?.[cargoId] || 'rodada-1';

  // 1. Tenta verificar no Supabase
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('registro_dispositivos')
        .select('id')
        .eq('cargo_id', cargoId)
        .eq('dispositivo_id', devId)
        .eq('token_rodada', tokenRodada);
      if (!error && data && data.length > 0) {
        return true;
      }
    } catch (e) {
      console.warn('Erro ao verificar dispositivo no Supabase:', e);
    }
  }

  // 2. Fallback / Verificação local
  const registros = getLocal<RegistroDispositivo[]>(STORAGE_KEYS.DISPOSITIVOS, []);
  return registros.some(
    (r) =>
      r.cargo_id === cargoId &&
      r.dispositivo_id === devId &&
      r.token_rodada === tokenRodada
  );
}

export async function registrarVotoDispositivo(
  cargoId: string,
  dispositivoId: string,
  tokenRodada: string
): Promise<void> {
  const novoRegistro: RegistroDispositivo = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `devreg-${Date.now()}-${Math.random()}`,
    cargo_id: cargoId,
    dispositivo_id: dispositivoId,
    token_rodada: tokenRodada,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('registro_dispositivos').insert([novoRegistro]);
    } catch (err) {
      console.warn('Erro ao inserir registro de dispositivo no Supabase:', err);
    }
  }

  const registros = getLocal<RegistroDispositivo[]>(STORAGE_KEYS.DISPOSITIVOS, []);
  registros.push(novoRegistro);
  setLocal(STORAGE_KEYS.DISPOSITIVOS, registros);
}

export async function contarDispositivosVotaram(cargoId: string): Promise<number> {
  const config = await getConfiguracao();
  const tokenRodada = config.rodadas_tokens?.[cargoId] || 'rodada-1';

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('registro_dispositivos')
        .select('dispositivo_id')
        .eq('cargo_id', cargoId)
        .eq('token_rodada', tokenRodada);
      if (!error && data) {
        const unique = new Set(data.map((d: { dispositivo_id: string }) => d.dispositivo_id));
        return unique.size;
      }
    } catch (e) {
      console.warn('Erro ao contar dispositivos no Supabase:', e);
    }
  }

  const registros = getLocal<RegistroDispositivo[]>(STORAGE_KEYS.DISPOSITIVOS, []);
  const filtrados = registros.filter(
    (r) => r.cargo_id === cargoId && r.token_rodada === tokenRodada
  );
  const unique = new Set(filtrados.map((r) => r.dispositivo_id));
  return unique.size;
}

/**
 * Libera todos os dispositivos que votaram neste cargo específico
 * gerando um novo token de rodada para o cargo.
 */
export async function liberarDispositivosCargo(cargoId: string): Promise<void> {
  const config = await getConfiguracao();
  const novoToken = `rodada-${Date.now()}`;
  const novosTokens = {
    ...(config.rodadas_tokens || {}),
    [cargoId]: novoToken,
  };

  await updateConfiguracao({
    rodadas_tokens: novosTokens,
  });

  // Limpa registros locais deste cargo
  const registros = getLocal<RegistroDispositivo[]>(STORAGE_KEYS.DISPOSITIVOS, []);
  const limpos = registros.filter((r) => r.cargo_id !== cargoId);
  setLocal(STORAGE_KEYS.DISPOSITIVOS, limpos);
}

/**
 * Zera apenas a votação do cargo informado, apagando seus votos
 * e liberando todos os dispositivos para votar do zero neste cargo.
 */
export async function zerarVotacaoCargo(cargoId: string): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('votos').delete().eq('cargo_id', cargoId);
      await supabase.from('registro_dispositivos').delete().eq('cargo_id', cargoId);
    } catch (e) {
      console.warn('Erro ao zerar votos do cargo no Supabase:', e);
    }
  }

  // Limpa votos locais deste cargo
  const votos = getLocal<Voto[]>(STORAGE_KEYS.VOTOS, []);
  const votosRestantes = votos.filter((v) => v.cargo_id !== cargoId);
  setLocal(STORAGE_KEYS.VOTOS, votosRestantes);

  // Libera dispositivos com novo token
  await liberarDispositivosCargo(cargoId);
}

// ======================== REGISTRO DE VOTOS ======================== //

export async function registrarVoto(
  cargoId: string,
  candidatoId: string | null,
  tipo: 'valido' | 'branco' | 'nulo',
  numeroDigitado: string
): Promise<void> {
  const novoVoto: Voto = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `voto-${Date.now()}-${Math.random()}`,
    cargo_id: cargoId,
    candidato_id: candidatoId,
    tipo,
    numero_digitado: numeroDigitado,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('votos').insert([novoVoto]);
    } catch (err) {
      console.warn('Erro ao inserir voto no Supabase:', err);
    }
  }

  const votos = getLocal<Voto[]>(STORAGE_KEYS.VOTOS, []);
  votos.push(novoVoto);
  setLocal(STORAGE_KEYS.VOTOS, votos);
  notifyRealtimeChange('VOTO');
}

export async function registrarVotosCompletos(
  votosLista: Array<{
    cargoId: string;
    candidatoId: string | null;
    tipo: 'valido' | 'branco' | 'nulo';
    numeroDigitado: string;
  }>,
  dispositivoId?: string,
  codigoEleitor?: string
): Promise<void> {
  const devId = dispositivoId || getOrCreateDeviceId();
  const config = await getConfiguracao();

  // Bloqueio por dispositivo
  if (config.bloqueio_dispositivo !== false) {
    for (const v of votosLista) {
      const jaVotou = await verificarDispositivoJaVotou(v.cargoId, devId);
      if (jaVotou) {
        throw new Error('Este aparelho já votou nesta votação.');
      }
    }
  }

  for (const v of votosLista) {
    await registrarVoto(v.cargoId, v.candidatoId, v.tipo, v.numeroDigitado);
    const tokenRodada = config.rodadas_tokens?.[v.cargoId] || 'rodada-1';
    await registrarVotoDispositivo(v.cargoId, devId, tokenRodada);
  }

  if (codigoEleitor) {
    await marcarEleitorVotou(codigoEleitor);
  }
}

// ======================== APURAÇÃO ======================== //

export async function getVotos(): Promise<Voto[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('votos').select('*');
      if (!error && data) return data as Voto[];
    } catch (err) {
      console.warn('Erro ao carregar votos do Supabase, usando local:', err);
    }
  }
  return getLocal<Voto[]>(STORAGE_KEYS.VOTOS, []);
}

export async function getApuracao(): Promise<ApuracaoCargo[]> {
  const [cargos, candidatos, votos] = await Promise.all([
    getCargos(),
    getCandidatos(),
    getVotos(),
  ]);

  return cargos.map((cargo) => {
    const votosCargo = votos.filter((v) => v.cargo_id === cargo.id);
    const totalVotos = votosCargo.length;

    const votosBrancos = votosCargo.filter((v) => v.tipo === 'branco').length;
    const votosNulos = votosCargo.filter((v) => v.tipo === 'nulo').length;
    const votosValidos = votosCargo.filter((v) => v.tipo === 'valido').length;

    const candidatosDoCargo = candidatos
      .filter((c) => c.cargo_id === cargo.id)
      .map((candidato) => {
        const votosCandidato = votosCargo.filter(
          (v) => v.candidato_id === candidato.id && v.tipo === 'valido'
        ).length;

        const porcentagem =
          votosValidos > 0
            ? Math.round((votosCandidato / votosValidos) * 1000) / 10
            : 0;

        return {
          candidato,
          votos: votosCandidato,
          porcentagem,
        };
      })
      .sort((a, b) => b.votos - a.votos);

    return {
      cargo,
      totalVotos,
      votosValidos,
      votosBrancos,
      votosNulos,
      candidatos: candidatosDoCargo,
    };
  });
}

// ======================== ELEIÇÃO SEQUENCIAL (PROCLAMAÇÃO E AVANÇO) ======================== //

/**
 * Proclama o vencedor do cargo atual:
 * 1. Registra a pessoa como eleita no cargo.
 * 2. Inabilita automaticamente a pessoa em todos os cargos subsequentes.
 * 3. Reseta o status de voto dos eleitores para a próxima etapa.
 * 4. Avança o cargo ativo para o próximo da fila ou encerra a eleição.
 */
export async function proclamarEleitoEAvancar(
  cargoId: string,
  vencedorNome: string,
  votosCount: number,
  candidatoId?: string
): Promise<{ proximoCargo?: Cargo; finalizada: boolean }> {
  const [config, cargos, candidatos] = await Promise.all([
    getConfiguracao(),
    getCargos(),
    getCandidatos(),
  ]);

  const cargoAtual = cargos.find((c) => c.id === cargoId);
  const cargoNome = cargoAtual ? cargoAtual.nome : 'Cargo';

  const novaPessoaEleita: PessoaEleita = {
    nome: vencedorNome,
    cargo_id: cargoId,
    cargo_nome: cargoNome,
    candidato_id: candidatoId,
    votos: votosCount,
    eleito_em: new Date().toISOString(),
  };

  const normVencedor = normalizeName(vencedorNome);
  const eleitosAtuais = (config.eleitos || []).filter(
    (e) => normalizeName(e.nome) !== normVencedor
  );
  eleitosAtuais.push(novaPessoaEleita);

  // Invalida a pessoa nos outros cargos
  const candidatosAtualizados = candidatos.map((c) => {
    if (normalizeName(c.nome) === normVencedor) {
      if (c.cargo_id === cargoId) {
        return { ...c, inelegivel: false }; // No cargo que ganhou, está eleito
      }
      return {
        ...c,
        inelegivel: true,
        motivo_inelegivel: `Eleito(a) como ${cargoNome}`,
      };
    }
    return c;
  });

  setLocal(STORAGE_KEYS.CANDIDATOS, candidatosAtualizados);

  // Determina o próximo cargo na ordem sequencial
  const sortedCargos = [...cargos].sort((a, b) => a.ordem - b.ordem);
  const currentIndex = sortedCargos.findIndex((c) => c.id === cargoId);
  const proximoCargo = sortedCargos[currentIndex + 1];

  let novoStatus: 'aguardando' | 'aberta' | 'encerrada' = 'aguardando';
  let novoCargoAtivoId = config.cargo_ativo_id;

  if (proximoCargo) {
    novoCargoAtivoId = proximoCargo.id;
    // Fica em 'aguardando' durante os 20 segundos de celebração antes de abrir a votação
    novoStatus = 'aguardando';
    // Reseta status de votou para que todos os jovens votem para o próximo cargo!
    await resetarStatusEleitores();
  } else {
    // Todos os cargos foram preenchidos
    novoStatus = 'encerrada';
  }

  // Garante inicialização dos tokens de rodada para o próximo cargo
  const tokensAtuais = { ...(config.rodadas_tokens || {}) };
  if (proximoCargo && !tokensAtuais[proximoCargo.id]) {
    tokensAtuais[proximoCargo.id] = 'rodada-1';
  }

  invalidateElectionCache();

  await updateConfiguracao({
    eleitos: eleitosAtuais,
    cargo_ativo_id: novoCargoAtivoId,
    status: novoStatus,
    rodadas_tokens: tokensAtuais,
  });

  notifyRealtimeChange('PROCLAMADO');

  // Agenda para abrir a próxima eleição automaticamente após exatamente 20 segundos de exibição do eleito
  if (proximoCargo && typeof window !== 'undefined') {
    setTimeout(async () => {
      try {
        const cfgAtual = await getConfiguracao();
        if (cfgAtual.cargo_ativo_id === proximoCargo.id && cfgAtual.status === 'aguardando') {
          await updateConfiguracao({ status: 'aberta' });
          notifyRealtimeChange('INICIOU_PROXIMO');
        }
      } catch (err) {
        console.error('Erro ao abrir próxima eleição após 20s:', err);
      }
    }, 20000);
  }

  return {
    proximoCargo,
    finalizada: !proximoCargo,
  };
}

/**
 * Remove a proclamação de uma pessoa eleita (caso queira retificar)
 */
export async function revogarEleito(nome: string): Promise<void> {
  const config = await getConfiguracao();
  const norm = normalizeName(nome);
  const novosEleitos = (config.eleitos || []).filter(
    (e) => normalizeName(e.nome) !== norm
  );

  await updateConfiguracao({
    eleitos: novosEleitos,
  });

  // Reabilita o candidato
  const candidatos = await getCandidatos();
  const atualizados = candidatos.map((c) => {
    if (normalizeName(c.nome) === norm) {
      return { ...c, inelegivel: false, motivo_inelegivel: undefined };
    }
    return c;
  });

  setLocal(STORAGE_KEYS.CANDIDATOS, atualizados);
}

/**
 * Permite ao mesário avançar ou selecionar manualmente qual cargo está em votação agora
 */
export async function selecionarCargoAtivo(cargoId: string): Promise<void> {
  await updateConfiguracao({
    cargo_ativo_id: cargoId,
    status: 'aberta',
  });
}

/**
 * Libera formalmente a votação para um cargo específico na urna
 * e prepara os eleitores aptos
 */
export async function liberarVotacaoCargo(cargoId: string): Promise<void> {
  await resetarStatusEleitores();
  await updateConfiguracao({
    cargo_ativo_id: cargoId,
    status: 'aberta',
  });
}

/**
 * Pausa / Bloqueia a votação na urna temporariamente
 */
export async function pausarVotacao(): Promise<void> {
  await updateConfiguracao({
    status: 'aguardando',
  });
}

// ======================== ZERÉSIMA / REINICIAR ======================== //

export async function zerarVotacao(): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('votos').delete().neq('id', '0');
      await supabase.from('registro_dispositivos').delete().neq('id', '0');
    } catch (err) {
      console.warn('Erro ao zerar votos no Supabase:', err);
    }
  }

  setLocal(STORAGE_KEYS.VOTOS, []);
  setLocal(STORAGE_KEYS.DISPOSITIVOS, []);
  await resetarStatusEleitores();

  // Gera novos tokens de rodada para todos os cargos para desbloquear todos os aparelhos
  const novosTokens: Record<string, string> = {
    'cargo-presidente': `rodada-${Date.now()}-1`,
    'cargo-vice': `rodada-${Date.now()}-2`,
    'cargo-sec-1': `rodada-${Date.now()}-3`,
    'cargo-sec-2': `rodada-${Date.now()}-4`,
    'cargo-tesoureiro': `rodada-${Date.now()}-5`,
  };

  // Reseta eleitos e volta ao cargo 1 (Presidente) com status aguardando liberação do admin
  await updateConfiguracao({
    eleitos: [],
    cargo_ativo_id: 'cargo-presidente',
    status: 'aguardando',
    rodadas_tokens: novosTokens,
  });

  invalidateElectionCache();

  // Reabilita todos os candidatos
  const candidatos = await getCandidatos();
  const reabilitados = candidatos.map((c) => ({
    ...c,
    inelegivel: false,
    motivo_inelegivel: undefined,
  }));
  setLocal(STORAGE_KEYS.CANDIDATOS, reabilitados);
}
