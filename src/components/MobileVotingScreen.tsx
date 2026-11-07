'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import {
  Church,
  CheckCircle2,
  ArrowRight,
  Volume2,
  VolumeX,
  Smartphone,
  Sparkles,
  Clock,
  Crown,
} from 'lucide-react';

import { Cargo, Candidato, ConfiguracaoEleicao } from '@/types/election';
import {
  getCargos,
  getCandidatos,
  getConfiguracao,
  registrarVotosCompletos,
  verificarDispositivoJaVotou,
  getOrCreateDeviceId,
  updateConfiguracao,
  initializeLocalStorage,
} from '@/services/electionService';
import { playKeyBeep, playUrnaFimSound } from '@/utils/sound';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const MobileVotingScreen: React.FC = () => {
  const [config, setConfig] = useState<ConfiguracaoEleicao | null>(null);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);

  // Estado do voto selecionado
  const [candidatoSelecionado, setCandidatoSelecionado] = useState<Candidato | null>(null);
  const [isVotoBranco, setIsVotoBranco] = useState(false);
  const [modalConfirmacao, setModalConfirmacao] = useState(false);
  const [gravandoVoto, setGravandoVoto] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Status de voto deste aparelho para o cargo ativo
  const [jaVotouNesteAparelho, setJaVotouNesteAparelho] = useState(false);
  const [verificandoAparelho, setVerificandoAparelho] = useState(true);
  const [tempoMobileAgora, setTempoMobileAgora] = useState<number>(0);

  // Monitora contagem regressiva e auto-abertura no celular
  useEffect(() => {
    if (config?.status !== 'aguardando') return;
    const interval = setInterval(() => {
      const now = Date.now();
      setTempoMobileAgora(now);
      if (config.eleitos && config.eleitos.length > 0) {
        const maisRecente = config.eleitos[config.eleitos.length - 1];
        const decorrido = now - new Date(maisRecente.eleito_em).getTime();
        if (decorrido >= 20000 && config.cargo_ativo_id) {
          updateConfiguracao({ status: 'aberta' }).catch(() => {});
          setConfig((prev) => (prev ? { ...prev, status: 'aberta' } : null));
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [config?.status, config?.eleitos, config?.cargo_ativo_id]);

  const cargoAtivoId = config?.cargo_ativo_id || cargos[0]?.id;
  const cargoAtivo = useMemo(
    () => cargos.find((c) => c.id === cargoAtivoId) || cargos[0] || null,
    [cargos, cargoAtivoId]
  );

  const candidatosDoCargo = useMemo(() => {
    if (!cargoAtivo) return [];
    return candidatos.filter((c) => c.cargo_id === cargoAtivo.id);
  }, [candidatos, cargoAtivo]);

  // Carrega dados da eleição e checa se o aparelho já votou nesta rodada
  const sincronizar = async () => {
    try {
      const [cfg, cgs, cands] = await Promise.all([
        getConfiguracao(),
        getCargos(),
        getCandidatos(),
      ]);
      setConfig(cfg);
      setCargos(cgs);
      setCandidatos(cands);

      const targetCargoId = cfg.cargo_ativo_id || cgs[0]?.id;
      if (targetCargoId) {
        const deviceId = getOrCreateDeviceId();
        const votou = await verificarDispositivoJaVotou(targetCargoId, deviceId);
        setJaVotouNesteAparelho(votou);
      }

      // Auto-avanço no celular: Se está aguardando e já passaram os 20s de celebração, abre automaticamente
      if (cfg.status === 'aguardando' && cfg.eleitos && cfg.eleitos.length > 0) {
        const maisRecente = cfg.eleitos[cfg.eleitos.length - 1];
        const tempoDecorrido = Date.now() - new Date(maisRecente.eleito_em).getTime();
        if (tempoDecorrido >= 20000 && cfg.cargo_ativo_id) {
          updateConfiguracao({ status: 'aberta' }).catch(() => {});
          cfg.status = 'aberta';
          setConfig({ ...cfg });
        }
      }
    } catch (err) {
      console.error('Erro ao sincronizar votação:', err);
    } finally {
      setVerificandoAparelho(false);
    }
  };

  useEffect(() => {
    let ativo = true;

    const init = async () => {
      initializeLocalStorage();
      try {
        const [cfg, cgs, cands] = await Promise.all([
          getConfiguracao(),
          getCargos(),
          getCandidatos(),
        ]);
        if (ativo) {
          setConfig(cfg);
          setCargos(cgs);
          setCandidatos(cands);

          const targetCargoId = cfg.cargo_ativo_id || cgs[0]?.id;
          if (targetCargoId) {
            const deviceId = getOrCreateDeviceId();
            const votou = await verificarDispositivoJaVotou(targetCargoId, deviceId);
            setJaVotouNesteAparelho(votou);
          }
        }
      } catch (err) {
        console.error('Erro ao inicializar celular:', err);
      } finally {
        if (ativo) setVerificandoAparelho(false);
      }
    };

    init();

    // 1. Supabase Realtime para desbloqueio ou troca de cargo instantânea
    const client = supabase;
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
    if (isSupabaseConfigured() && client) {
      channel = client
        .channel('mobile-live-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'configuracao_eleicao' },
          () => {
            sincronizar();
          }
        )
        .subscribe();
    }

    // 2. BroadcastChannel para comunicação instantânea entre abas no mesmo aparelho
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('eleicoes_jump_realtime_bus');
      bc.onmessage = () => {
        sincronizar();
      };
    }
    const handleUpdate = () => sincronizar();
    window.addEventListener('eleicoes_jump_update', handleUpdate);

    // 3. Polling rápido a cada 1.2 segundos para garantir sincronização
    const interval = setInterval(() => {
      sincronizar();
    }, 1200);

    return () => {
      ativo = false;
      clearInterval(interval);
      if (channel && client) {
        client.removeChannel(channel);
      }
      if (bc) {
        bc.close();
      }
      window.removeEventListener('eleicoes_jump_update', handleUpdate);
    };
  }, []);

  // Monitora mudança de cargo ativo para limpar seleções anteriores
  const [prevCargoAtivoId, setPrevCargoAtivoId] = useState(cargoAtivoId);
  if (cargoAtivoId !== prevCargoAtivoId) {
    setPrevCargoAtivoId(cargoAtivoId);
    setCandidatoSelecionado(null);
    setIsVotoBranco(false);
    setModalConfirmacao(false);
  }

  const handleSelecionarCandidato = (cand: Candidato) => {
    if (cand.inelegivel || jaVotouNesteAparelho) return;
    playKeyBeep(soundEnabled);
    setCandidatoSelecionado(cand);
    setIsVotoBranco(false);
    setModalConfirmacao(true);
  };

  const handleSelecionarBranco = () => {
    if (jaVotouNesteAparelho) return;
    playKeyBeep(soundEnabled);
    setCandidatoSelecionado(null);
    setIsVotoBranco(true);
    setModalConfirmacao(true);
  };

  const handleConfirmarVoto = async () => {
    if (!cargoAtivo || gravandoVoto || jaVotouNesteAparelho) return;
    setGravandoVoto(true);

    try {
      const deviceId = getOrCreateDeviceId();
      let tipo: 'valido' | 'branco' | 'nulo';
      let candidatoId: string | null = null;
      let numDigitado = '';

      if (isVotoBranco) {
        tipo = 'branco';
        numDigitado = 'BRANCO';
      } else if (candidatoSelecionado) {
        tipo = 'valido';
        candidatoId = candidatoSelecionado.id;
        numDigitado = candidatoSelecionado.numero;
      } else {
        tipo = 'nulo';
        numDigitado = 'NULO';
      }

      await registrarVotosCompletos(
        [
          {
            cargoId: cargoAtivo.id,
            candidatoId,
            tipo,
            numeroDigitado: numDigitado,
          },
        ],
        deviceId
      );

      setJaVotouNesteAparelho(true);
      setModalConfirmacao(false);

      // Efeitos de sucesso (Som oficial de FIM da urna e chuva de confetes)
      await playUrnaFimSound(soundEnabled);

      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar voto.';
      alert(msg);
      await sincronizar();
    } finally {
      setGravandoVoto(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between font-sans selection:bg-emerald-500">
      {/* Topo do Celular */}
      <header className="bg-neutral-900/90 border-b border-neutral-800 p-4 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
              <Church className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-white">
                {config?.igreja || 'JUMP'}
              </div>
              <div className="text-[10px] text-neutral-400">
                {config?.titulo || 'Eleições JUMP'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
              title={soundEnabled ? 'Silenciar som' : 'Ativar som da urna'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-neutral-500" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL NO CELULAR */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4 flex flex-col justify-center">
        {/* CARD DO CARGO ABERTO NO MOMENTO */}
        <div className="bg-gradient-to-r from-emerald-950/80 to-neutral-900 border border-emerald-600/60 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-1.5">
            {config?.status === 'aguardando' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-900/80 border border-amber-500 text-amber-300 text-[10px] font-bold uppercase tracking-widest">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Aguardando Início</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-900/80 border border-emerald-500 text-emerald-300 text-[10px] font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Votação Aberta</span>
              </span>
            )}
            <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-emerald-400" />
              <span>1 voto por aparelho</span>
            </span>
          </div>

          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            {cargoAtivo?.nome || 'DIRETORIA'}
          </h2>
          <p className="text-xs text-neutral-300 mt-0.5">
            {config?.status === 'aguardando'
              ? 'Aguardando a liderança liberar a votação deste cargo...'
              : jaVotouNesteAparelho
              ? 'Seu voto para este cargo já foi computado neste aparelho!'
              : 'Toque no candidato para votar:'}
          </p>
        </div>

        {/* SE A VOTAÇÃO ESTÁ EM ESPERA (AGUARDANDO O ADMIN INICIAR) */}
        {config?.status === 'aguardando' ? (() => {
          const ultimoEleito =
            config?.eleitos && config.eleitos.length > 0
              ? config.eleitos[config.eleitos.length - 1]
              : null;
          const eleitoEm = ultimoEleito ? new Date(ultimoEleito.eleito_em).getTime() : 0;
          const tempoDecorrido = tempoMobileAgora ? tempoMobileAgora - eleitoEm : 0;
          const emCelebracao = ultimoEleito && tempoDecorrido < 20000;
          const segRestantes = emCelebracao
            ? Math.min(20, Math.max(1, Math.ceil((20000 - tempoDecorrido) / 1000)))
            : 0;

          if (emCelebracao && ultimoEleito) {
            return (
              <div className="bg-neutral-900 border border-emerald-500/80 rounded-3xl p-6 text-center space-y-4 shadow-xl animate-scale-up my-auto">
                <div className="w-14 h-14 rounded-full bg-amber-950/80 border-2 border-amber-500 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-950/50">
                  <Crown className="w-7 h-7 fill-current" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-700/60 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Eleito(a) Proclamado(a)</span>
                  </span>
                  <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest mt-1">
                    {ultimoEleito.cargo_nome}:
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mt-0.5">
                    {ultimoEleito.nome}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    {ultimoEleito.votos} votos recebidos
                  </p>
                </div>

                <div className="p-4 bg-emerald-950/80 rounded-2xl border border-emerald-500/60 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-300">
                    <Clock className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span>Votação para {cargoAtivo?.nome} abrirá em:</span>
                  </div>
                  <div className="text-3xl font-mono font-black text-white">
                    {segRestantes}s
                  </div>
                  <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-emerald-900">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300 ease-linear rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, (segRestantes / 20) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-center space-y-4 shadow-xl animate-scale-up my-auto">
              <div className="w-16 h-16 rounded-full bg-amber-950/70 border-2 border-amber-500 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-950/50">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-700/60 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Votação em Espera</span>
                </span>
                <h3 className="text-xl font-black text-white uppercase tracking-wider mt-1">
                  Aguardando a Mesa
                </h3>
                <p className="text-xs text-neutral-300 mt-1 max-w-xs mx-auto">
                  A votação para <strong>{cargoAtivo?.nome || 'PRESIDENTE'}</strong> ainda não foi liberada pela liderança.
                </p>
              </div>

              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs text-neutral-300 space-y-1">
                <span className="text-xs font-bold text-emerald-400 block">
                  📺 Olhe para o Telão
                </span>
                <p className="text-[11px] text-neutral-400">
                  Assim que a mesa liberar a votação no telão, a cédula aparecerá na tela do seu celular automaticamente!
                </p>
              </div>
            </div>
          );
        })() : jaVotouNesteAparelho ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-center space-y-4 shadow-xl animate-scale-up my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest mb-1 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800">
                <Sparkles className="w-3 h-3" />
                <span>Voto Confirmado</span>
              </span>
              <h3 className="text-xl font-black text-white uppercase tracking-wider mt-1">
                Voto Registrado!
              </h3>
              <p className="text-xs text-neutral-300 mt-1 max-w-xs mx-auto">
                Seu aparelho já registrou o voto para <strong>{cargoAtivo?.nome}</strong>.
              </p>
            </div>

            <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs text-neutral-300 space-y-1">
              <span className="text-xs font-bold text-amber-300 block">
                📺 Olhe para o Telão da Igreja
              </span>
              <p className="text-[11px] text-neutral-400">
                Acompanhe o anúncio do vencedor. Assim que a liderança liberar o próximo cargo, esta tela atualizará automaticamente!
              </p>
            </div>
          </div>
        ) : (
          /* LISTA DE CANDIDATOS DO CARGO PARA ESCOLHER */
          <div className="space-y-3 pb-6">
            {verificandoAparelho ? (
              <div className="p-8 text-center text-neutral-400 text-xs bg-neutral-900 rounded-2xl border border-neutral-800">
                Carregando candidatos...
              </div>
            ) : candidatosDoCargo.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs bg-neutral-900 rounded-2xl border border-neutral-800">
                Nenhum candidato concorrendo para este cargo.
              </div>
            ) : (
              candidatosDoCargo.map((cand) => (
                <button
                  key={cand.id}
                  type="button"
                  disabled={cand.inelegivel}
                  onClick={() => handleSelecionarCandidato(cand)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-3.5 group cursor-pointer ${
                    cand.inelegivel
                      ? 'bg-neutral-950/60 border-neutral-800 opacity-50 cursor-not-allowed'
                      : 'bg-neutral-900 border-neutral-800 hover:border-emerald-500 hover:bg-neutral-850 active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Foto do Candidato */}
                    <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-neutral-950 border border-neutral-700 shrink-0 shadow-md">
                      {cand.foto_url ? (
                        <Image
                          src={cand.foto_url}
                          alt={cand.nome}
                          fill
                          sizes="80px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center font-bold text-neutral-500 text-sm">
                          👤
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-400 font-mono font-black text-xs mb-1">
                        Nº {cand.numero}
                      </span>
                      <h4 className="text-base font-black text-white uppercase leading-snug truncate group-hover:text-emerald-300 transition-colors">
                        {cand.nome}
                      </h4>

                      {cand.inelegivel && (
                        <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950 border border-red-800 text-red-300">
                          ⚠️ {cand.motivo_inelegivel || 'Já Eleito'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className="w-8 h-8 rounded-full bg-neutral-800 group-hover:bg-emerald-600 text-white flex items-center justify-center transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </button>
              ))
            )}

            {/* BOTÃO VOTO EM BRANCO */}
            <button
              type="button"
              onClick={handleSelecionarBranco}
              className="w-full p-4 rounded-2xl bg-neutral-900 border-2 border-dashed border-neutral-700 hover:border-neutral-500 text-center font-bold text-xs uppercase tracking-wider text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-[0.98]"
            >
              Votar em Branco
            </button>
          </div>
        )}
      </main>

      {/* MODAL DE CONFIRMAÇÃO DO VOTO NO CELULAR */}
      {modalConfirmacao && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-5 animate-scale-up">
            <div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest block">
                Confirmação de Voto
              </span>
              <h3 className="text-lg font-black text-white uppercase tracking-wider mt-0.5">
                {cargoAtivo?.nome}
              </h3>
            </div>

            {isVotoBranco ? (
              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                <span className="text-xl font-black text-white uppercase tracking-wider">
                  VOTO EM BRANCO
                </span>
                <p className="text-xs text-neutral-400 mt-1">
                  Você escolheu não votar em nenhum candidato para este cargo.
                </p>
              </div>
            ) : candidatoSelecionado ? (
              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 flex items-center gap-3.5 text-left">
                <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700 shrink-0">
                  {candidatoSelecionado.foto_url ? (
                    <Image
                      src={candidatoSelecionado.foto_url}
                      alt={candidatoSelecionado.nome}
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-neutral-600 text-lg">
                      👤
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-mono font-bold text-xs text-emerald-400">
                    Nº {candidatoSelecionado.numero}
                  </span>
                  <div className="font-black text-white uppercase text-base leading-tight">
                    {candidatoSelecionado.nome}
                  </div>
                </div>
              </div>
            ) : null}

            <p className="text-xs text-neutral-400 font-medium">
              Deseja confirmar este voto? Seu aparelho não poderá votar novamente para este cargo.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalConfirmacao(false)}
                className="py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Corrigir
              </button>

              <button
                type="button"
                disabled={gravandoVoto}
                onClick={handleConfirmarVoto}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>{gravandoVoto ? 'Gravando...' : 'CONFIRMAR'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé Mobile */}
      <footer className="text-center text-[10px] text-neutral-500 py-3 border-t border-neutral-900">
        Eleições JUMP • Votação Segura pelo Celular
      </footer>
    </div>
  );
};
