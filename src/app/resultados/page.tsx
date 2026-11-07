'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import {
  Trophy,
  Church,
  Maximize2,
  Minimize2,
  RefreshCw,
  Vote,
  CheckCircle2,
  Clock,
  ChevronLeft,
  Tv,
  Sparkles,
  Crown,
} from 'lucide-react';
import { ApuracaoCargo, Cargo, ConfiguracaoEleicao, Candidato, PessoaEleita } from '@/types/election';
import {
  getApuracao,
  getCargos,
  getConfiguracao,
  getCandidatos,
  updateConfiguracao,
  initializeLocalStorage,
} from '@/services/electionService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function ResultadosPage() {
  const [config, setConfig] = useState<ConfiguracaoEleicao | null>(null);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [, setCandidatos] = useState<Candidato[]>([]);
  const [apuracao, setApuracao] = useState<ApuracaoCargo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>('');
  const votingUrl = 'https://eleicoesjump.vercel.app/';
  const [ultimoVencedorProclamado, setUltimoVencedorProclamado] = useState<string | null>(null);
  const [eleitoCelebrando, setEleitoCelebrando] = useState<{
    eleito: PessoaEleita;
    candidato?: Candidato;
    proximoCargo?: Cargo;
    expiraEm: number;
  } | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState<number>(20);
  const isFetchingRef = useRef(false);

  // Efeito de fogos de artifício
  const dispararFogos = useCallback(() => {
    try {
      const end = Date.now() + 6 * 1000;
      const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#ffffff', '#ffd700'];

      const interval: ReturnType<typeof setInterval> = setInterval(() => {
        if (Date.now() > end) {
          clearInterval(interval);
          return;
        }

        confetti({
          startVelocity: 50,
          spread: 85,
          ticks: 90,
          origin: { x: 0.15, y: 0.65 },
          colors,
          zIndex: 99999,
          particleCount: 45,
        });

        confetti({
          startVelocity: 50,
          spread: 85,
          ticks: 90,
          origin: { x: 0.85, y: 0.65 },
          colors,
          zIndex: 99999,
          particleCount: 45,
        });

        confetti({
          startVelocity: 35,
          spread: 360,
          ticks: 75,
          origin: { x: 0.5, y: 0.3 },
          colors,
          zIndex: 99999,
          particleCount: 35,
        });
      }, 350);
    } catch (e) {
      console.error('Erro ao disparar fogos:', e);
    }
  }, []);

  const carregarDados = useCallback(async (showLoading = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (showLoading) setCarregando(true);
    initializeLocalStorage();
    try {
      const [cfg, cgs, apur, cands] = await Promise.all([
        getConfiguracao(),
        getCargos(),
        getApuracao(),
        getCandidatos(),
      ]);

      setConfig(cfg);
      setCargos(cgs);
      setApuracao(apur);
      setCandidatos(cands);
      setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'));

      // Verifica se houve eleito recentemente para exibir celebração de 20s
      const totalEleitos = cfg.eleitos?.length || 0;
      if (totalEleitos > 0) {
        const maisRecente = cfg.eleitos[totalEleitos - 1];
        const eleitoEmMs = new Date(maisRecente.eleito_em).getTime();
        const tempoDecorridoMs = Date.now() - eleitoEmMs;
        const TEMPO_ESPERA_MS = 20 * 1000;

        if (tempoDecorridoMs < TEMPO_ESPERA_MS) {
          const candObj = cands.find(
            (c) =>
              c.id === maisRecente.candidato_id ||
              c.nome.trim().toUpperCase() === maisRecente.nome.trim().toUpperCase()
          );
          const proxCargo = cgs.find((c) => c.id === cfg.cargo_ativo_id);

          setEleitoCelebrando((prev) => {
            if (
              prev &&
              prev.eleito.nome === maisRecente.nome &&
              prev.eleito.cargo_id === maisRecente.cargo_id
            ) {
              return prev;
            }
            return {
              eleito: maisRecente,
              candidato: candObj,
              proximoCargo: proxCargo,
              expiraEm: eleitoEmMs + TEMPO_ESPERA_MS,
            };
          });

          setSegundosRestantes(Math.max(1, Math.ceil((eleitoEmMs + TEMPO_ESPERA_MS - Date.now()) / 1000)));

          if (maisRecente.nome !== ultimoVencedorProclamado) {
            setUltimoVencedorProclamado(maisRecente.nome);
            dispararFogos();
          }
        } else {
          // Já se passaram mais de 40 segundos
          if (cfg.status === 'aguardando' && cfg.cargo_ativo_id) {
            updateConfiguracao({ status: 'aberta' }).catch(() => {});
          }
          setEleitoCelebrando(null);
        }
      } else {
        setEleitoCelebrando(null);
      }
    } catch (err) {
      console.error('Erro ao atualizar resultados:', err);
    } finally {
      if (showLoading) setCarregando(false);
      isFetchingRef.current = false;
    }
  }, [ultimoVencedorProclamado, dispararFogos]);

  // Contagem regressiva dos 40 segundos na tela
  useEffect(() => {
    if (!eleitoCelebrando) return;

    const interval = setInterval(() => {
      const msRestantes = eleitoCelebrando.expiraEm - Date.now();
      const seg = Math.max(0, Math.ceil(msRestantes / 1000));
      setSegundosRestantes(seg);

      if (msRestantes <= 0) {
        if (eleitoCelebrando.proximoCargo) {
          updateConfiguracao({ status: 'aberta' }).catch(() => {});
        }
        setEleitoCelebrando(null);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [eleitoCelebrando]);

  useEffect(() => {
    const timerInicial = setTimeout(() => {
      carregarDados();
    }, 0);

    // 1. Supabase Realtime via WebSockets
    const client = supabase;
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
    if (isSupabaseConfigured() && client) {
      channel = client
        .channel('resultados-live-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'votos' },
          () => {
            carregarDados();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'configuracao_eleicao' },
          () => {
            carregarDados();
          }
        )
        .subscribe();
    }

    // 2. BroadcastChannel
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('eleicoes_jump_realtime_bus');
      bc.onmessage = () => {
        carregarDados();
      };
    }

    // 3. CustomEvent local
    const handleLocalUpdate = () => carregarDados();
    window.addEventListener('eleicoes_jump_update', handleLocalUpdate);

    // 4. Polling fallback rápido a cada 800ms
    const interval = setInterval(() => {
      carregarDados();
    }, 800);

    return () => {
      clearTimeout(timerInicial);
      clearInterval(interval);
      if (channel && client) {
        client.removeChannel(channel);
      }
      if (bc) {
        bc.close();
      }
      window.removeEventListener('eleicoes_jump_update', handleLocalUpdate);
    };
  }, [carregarDados]);

  const handlePularEspera = async () => {
    if (eleitoCelebrando?.proximoCargo) {
      await updateConfiguracao({ status: 'aberta' });
    }
    setEleitoCelebrando(null);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const cargoAtivoId = config?.cargo_ativo_id || cargos[0]?.id;
  const cargoAtivoObj = cargos.find((c) => c.id === cargoAtivoId) || cargos[0];
  const apuracaoAtiva = apuracao.find((a) => a.cargo.id === cargoAtivoObj?.id);

  const eleitos = config?.eleitos || [];
  const totalGeralVotos = apuracao.reduce((acc, curr) => acc + curr.totalVotos, 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans select-none">
      {/* Topo / Barra de Navegação */}
      <header className="bg-neutral-900/90 border-b border-neutral-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Voltar ao Painel Admin"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Painel Admin</span>
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
                <Church className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm md:text-base font-black uppercase text-white tracking-wider leading-none">
                  Resultados em Tempo Real
                </h1>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {config?.igreja || 'JUMP'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-neutral-400 bg-neutral-800/80 px-3 py-1.5 rounded-lg border border-neutral-700/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Ao Vivo ({ultimaAtualizacao})</span>
            </div>

            <button
              type="button"
              onClick={() => carregarDados(true)}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
              title="Atualizar Agora"
            >
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
              title="Tela Cheia"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
            >
              <Vote className="w-3.5 h-3.5" />
              <span>Urna</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-8">
        {/* BANNER 1: QUAL VOTAÇÃO ESTÁ LIBERADA AGORA NA URNA */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-neutral-900 to-emerald-950/80 border-2 border-emerald-500/80 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
                  {config?.status === 'aberta' ? 'Votação Liberada na Urna' : 'Urna Pausada'}
                </span>
              </div>

              <h2 className="text-2xl md:text-5xl font-black text-white uppercase tracking-tight">
                {cargoAtivoObj?.nome || 'DIRETORIA'}
              </h2>
              <p className="text-xs md:text-sm text-neutral-300 mt-1 max-w-xl">
                A cabine de votação está liberada e recebendo votos exclusivamente para{' '}
                <strong>{cargoAtivoObj?.nome}</strong>.
              </p>
            </div>

            {/* Estatísticas Rápidas do Cargo Liberado */}
            <div className="flex flex-wrap items-center gap-3">
              {/* QR Code para votar pelo celular */}
              <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-2xl flex items-center gap-3 shadow-inner">
                <div className="p-1.5 bg-white rounded-xl shrink-0">
                  {votingUrl && (
                    <QRCodeSVG
                      value={votingUrl}
                      size={64}
                      level="M"
                      includeMargin={false}
                    />
                  )}
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                    Votar pelo Celular
                  </span>
                  <span className="text-xs font-black text-white uppercase block">
                    Aponte a Câmera
                  </span>
                  <Link
                    href="/telao"
                    target="_blank"
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 underline font-bold inline-flex items-center gap-1 mt-0.5"
                  >
                    <Tv className="w-3 h-3" />
                    <span>Modo Telão / Datashow</span>
                  </Link>
                </div>
              </div>

              <div className="bg-neutral-950/80 border border-neutral-800 p-4 rounded-2xl min-w-[130px] text-center">
                <div className="text-[10px] font-mono text-neutral-400 uppercase font-bold">
                  Votos Registrados
                </div>
                <div className="text-3xl font-black text-white mt-0.5">
                  {apuracaoAtiva?.totalVotos || 0}
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5">
                  Neste Cargo
                </div>
              </div>

              <div className="bg-neutral-950/80 border border-neutral-800 p-4 rounded-2xl min-w-[130px] text-center">
                <div className="text-[10px] font-mono text-neutral-400 uppercase font-bold">
                  Votos Válidos
                </div>
                <div className="text-3xl font-black text-emerald-400 mt-0.5">
                  {apuracaoAtiva?.votosValidos || 0}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  {apuracaoAtiva?.votosBrancos || 0} em branco
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CANDIDATOS DO CARGO QUE ESTÁ LIBERADO AGORA */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>Resultado em Tempo Real: {cargoAtivoObj?.nome}</span>
            </h3>
            <span className="text-xs text-neutral-400 font-mono">
              Votos Válidos: <strong>{apuracaoAtiva?.votosValidos || 0}</strong> • Brancos: <strong>{apuracaoAtiva?.votosBrancos || 0}</strong> • Nulos: <strong>{apuracaoAtiva?.votosNulos || 0}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {!apuracaoAtiva || apuracaoAtiva.candidatos.length === 0 ? (
              <div className="col-span-3 py-10 text-center text-neutral-500 bg-neutral-900 rounded-2xl border border-neutral-800">
                Nenhum candidato concorrendo para este cargo.
              </div>
            ) : (
              apuracaoAtiva.candidatos.map(({ candidato, votos, porcentagem }, index) => {
                const isLider = index === 0 && votos > 0;
                const isEleito = eleitos.some(
                  (e) =>
                    e.cargo_id === cargoAtivoObj.id &&
                    e.nome.toUpperCase() === candidato.nome.toUpperCase()
                );

                return (
                  <div
                    key={candidato.id}
                    className={`relative p-5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                      isEleito
                        ? 'bg-gradient-to-b from-amber-950/50 to-neutral-900 border-amber-400 shadow-xl shadow-amber-500/10'
                        : isLider
                        ? 'bg-gradient-to-b from-emerald-950/40 to-neutral-900 border-emerald-500/80 shadow-lg'
                        : 'bg-neutral-900 border-neutral-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-start gap-4 mb-4">
                        <div className="relative w-20 h-24 rounded-xl overflow-hidden bg-neutral-950 border border-neutral-700 shrink-0 shadow-md">
                          {candidato.foto_url ? (
                            <Image
                              src={candidato.foto_url}
                              alt={candidato.nome}
                              fill
                              sizes="90px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center font-bold text-neutral-600 text-xl">
                              👤
                            </div>
                          )}
                          {isEleito && (
                            <div className="absolute inset-0 bg-amber-500/20 backdrop-blur-[1px] flex items-center justify-center">
                              <Trophy className="w-8 h-8 text-amber-300 drop-shadow" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="inline-block px-2.5 py-0.5 rounded bg-neutral-950 border border-neutral-700 text-emerald-400 font-mono font-black text-sm mb-1">
                            Nº {candidato.numero}
                          </span>
                          <h4 className="text-base font-black text-white uppercase leading-snug truncate">
                            {candidato.nome}
                          </h4>

                          {candidato.inelegivel && (
                            <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-950 border border-red-700 text-red-300">
                              ⚠️ Inelegível: {candidato.motivo_inelegivel}
                            </span>
                          )}

                          {isEleito && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <Trophy className="w-3 h-3" />
                              <span>PROCLAMADO ELEITO</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Placar de Votos */}
                    <div className="pt-3 border-t border-neutral-800">
                      <div className="flex items-end justify-between mb-1.5">
                        <span className="text-2xl font-black text-white font-mono">
                          {porcentagem.toFixed(1)}%
                        </span>
                        <span className="text-xs font-mono text-neutral-400 font-bold">
                          {votos} {votos === 1 ? 'voto' : 'votos'}
                        </span>
                      </div>

                      <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isEleito
                              ? 'bg-amber-400'
                              : isLider
                              ? 'bg-emerald-500'
                              : 'bg-neutral-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, porcentagem))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* STATUS DE TODAS AS VOTAÇÕES: OS 5 CARGOS DA DIRETORIA */}
        <div className="space-y-4 pt-4 border-t border-neutral-800">
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center justify-between">
              <span>Status e Resultados de Todas as Votações</span>
              <span className="text-xs font-normal text-neutral-400">
                Total acumulado na urna: <strong>{totalGeralVotos}</strong> votos
              </span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Acompanhe quais votações já foram encerradas e quais ainda serão liberadas pelo mesário.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {cargos.map((cargo, idx) => {
              const eleito = eleitos.find((e) => e.cargo_id === cargo.id);
              const isAtivo = cargoAtivoId === cargo.id;
              const isPendente = !eleito && !isAtivo;
              const apurCargo = apuracao.find((a) => a.cargo.id === cargo.id);

              return (
                <div
                  key={cargo.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    eleito
                      ? 'bg-neutral-900 border-emerald-600/60 shadow-lg shadow-emerald-950/30'
                      : isAtivo
                      ? 'bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-neutral-900/60 border-neutral-800 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-neutral-500 font-bold">
                        Etapa {idx + 1}
                      </span>
                      {eleito ? (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Eleito</span>
                        </span>
                      ) : isAtivo ? (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-900 px-2 py-0.5 rounded-full animate-pulse border border-emerald-500">
                          <span>Liberado</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded-full">
                          <Clock className="w-2.5 h-2.5" />
                          <span>Aguardando</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-black text-white uppercase tracking-tight mb-2">
                      {cargo.nome}
                    </h4>

                    {eleito ? (
                      <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
                        <div className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          <span>Eleito(a):</span>
                        </div>
                        <div className="font-black text-white text-xs uppercase truncate mt-0.5">
                          {eleito.nome}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                          {eleito.votos} votos válidos
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-neutral-400 font-mono">
                        Votos até agora: <strong>{apurCargo?.totalVotos || 0}</strong>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-neutral-800/80 text-[10px] text-neutral-500 font-mono flex justify-between">
                    <span>{cargo.digitos} dígitos</span>
                    <span>{isAtivo ? '🟢 Na Urna' : isPendente ? 'Aguardando' : 'Finalizado'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Rodapé */}
      <footer className="text-center text-[11px] text-neutral-500 py-4 border-t border-neutral-900">
        Painel de Resultados ao Vivo • Eleições JUMP • Atualização Contínua
      </footer>

      {/* MODAL / OVERLAY GIGANTE DE CELEBRAÇÃO DO ELEITO POR 20 SEGUNDOS COM FOGOS */}
      {eleitoCelebrando && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-scale-up">
          <div className="text-center space-y-6 max-w-2xl w-full bg-gradient-to-b from-neutral-900/95 via-neutral-950 to-black border-4 border-amber-400 rounded-3xl p-8 sm:p-12 shadow-2xl shadow-amber-500/40 relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-amber-500/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/25 rounded-full blur-3xl pointer-events-none" />

            {/* Selo Topo */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-950/90 border border-amber-400 text-amber-300 font-black text-xs uppercase tracking-widest shadow-xl animate-pulse">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>PROCLAMAÇÃO OFICIAL • JUMP 2026</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>

            {/* Foto do Eleito */}
            <div className="relative mx-auto w-36 h-48 sm:w-44 sm:h-56 rounded-3xl overflow-hidden bg-neutral-900 border-4 border-amber-400 shadow-2xl shadow-amber-500/50">
              {eleitoCelebrando.candidato?.foto_url ? (
                <Image
                  src={eleitoCelebrando.candidato.foto_url}
                  alt={eleitoCelebrando.eleito.nome}
                  fill
                  sizes="240px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">
                  👤
                </div>
              )}
              <div className="absolute top-2.5 right-2.5 p-2 rounded-full bg-amber-400 text-black shadow-lg">
                <Crown className="w-5 h-5 fill-current" />
              </div>
            </div>

            <div>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                ELEITO(A) PELA IGREJA PARA:
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase text-amber-300 tracking-wider">
                {eleitoCelebrando.eleito.cargo_nome}
              </h2>
              <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white mt-1 drop-shadow-md">
                {eleitoCelebrando.eleito.nome}
              </h1>
              <div className="inline-block mt-3 px-4 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 font-mono text-sm font-bold text-emerald-400">
                {eleitoCelebrando.eleito.votos} VOTOS RECEBIDOS
              </div>
            </div>

            {/* Contador Regressivo de 20s para Abrir a Próxima Votação */}
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/70 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-300">
                <Clock className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>
                  {eleitoCelebrando.proximoCargo
                    ? `A PRÓXIMA ELEIÇÃO (${eleitoCelebrando.proximoCargo.nome}) ABRIRÁ EM:`
                    : 'ELEIÇÃO FINALIZADA COM SUCESSO!'}
                </span>
              </div>

              {eleitoCelebrando.proximoCargo && (
                <div className="text-3xl sm:text-4xl font-mono font-black text-white">
                  {segundosRestantes}s
                </div>
              )}

              {/* Barra de progresso dos 20 segundos */}
              {eleitoCelebrando.proximoCargo && (
                <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-emerald-900">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-300 ease-linear rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(0, (segundosRestantes / 20) * 100))}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {eleitoCelebrando.proximoCargo && (
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handlePularEspera}
                  className="px-6 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-neutral-700 flex items-center gap-2"
                >
                  <span>Pular Espera e Abrir Agora</span>
                  <span>⏩</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
