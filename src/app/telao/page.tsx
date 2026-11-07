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
  Eye,
  EyeOff,
  ChevronLeft,
  QrCode,
  Smartphone,
  Sparkles,
  Crown,
} from 'lucide-react';
import { ApuracaoCargo, Cargo, ConfiguracaoEleicao, Candidato, PessoaEleita } from '@/types/election';
import {
  getApuracao,
  getCargos,
  getConfiguracao,
  getCandidatos,
  initializeLocalStorage,
} from '@/services/electionService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function TelaoPage() {
  const [config, setConfig] = useState<ConfiguracaoEleicao | null>(null);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [, setCandidatos] = useState<Candidato[]>([]);
  const [apuracao, setApuracao] = useState<ApuracaoCargo[]>([]);
  const [modoSuspense, setModoSuspense] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qrCodeAmpliado, setQrCodeAmpliado] = useState(false);
  const votingUrl = 'https://eleicoesjump.vercel.app/';
  const [ultimoVencedorProclamado, setUltimoVencedorProclamado] = useState<string | null>(null);
  const [eleitoCelebrando, setEleitoCelebrando] = useState<{
    eleito: PessoaEleita;
    candidato?: Candidato;
    proximoCargo?: Cargo;
  } | null>(null);
  const [modalEleitosGeral, setModalEleitosGeral] = useState(false);
  const celebracaoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  // Efeito espetacular de fogos de artifício com múltiplos canhões laterais e explosões
  const dispararFogosDeArtificio = useCallback(() => {
    try {
      const end = Date.now() + 6 * 1000;
      const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#ffffff', '#ffd700'];

      const interval: ReturnType<typeof setInterval> = setInterval(() => {
        if (Date.now() > end) {
          clearInterval(interval);
          return;
        }

        // Canhão esquerdo
        confetti({
          startVelocity: 50,
          spread: 85,
          ticks: 90,
          origin: { x: 0.15, y: 0.65 },
          colors,
          zIndex: 99999,
          particleCount: 45,
        });

        // Canhão direito
        confetti({
          startVelocity: 50,
          spread: 85,
          ticks: 90,
          origin: { x: 0.85, y: 0.65 },
          colors,
          zIndex: 99999,
          particleCount: 45,
        });

        // Explosão no topo central
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

  const carregarDados = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
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

      // Dispara celebração e fogos de artifício se acabou de proclamar um novo vencedor
      const totalEleitos = cfg.eleitos?.length || 0;
      if (totalEleitos > 0) {
        const maisRecente = cfg.eleitos[totalEleitos - 1];
        if (maisRecente && maisRecente.nome !== ultimoVencedorProclamado) {
          setUltimoVencedorProclamado(maisRecente.nome);

          const candObj = cands.find(
            (c) =>
              c.id === maisRecente.candidato_id ||
              c.nome.trim().toUpperCase() === maisRecente.nome.trim().toUpperCase()
          );
          const proxCargo = cgs.find((c) => c.id === cfg.cargo_ativo_id);

          setEleitoCelebrando({
            eleito: maisRecente,
            candidato: candObj,
            proximoCargo: proxCargo,
          });

          dispararFogosDeArtificio();

          if (celebracaoTimerRef.current) clearTimeout(celebracaoTimerRef.current);
          celebracaoTimerRef.current = setTimeout(() => {
            setEleitoCelebrando(null);
          }, 12000);
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar telão:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [ultimoVencedorProclamado, dispararFogosDeArtificio]);

  useEffect(() => {
    const timerInicial = setTimeout(() => {
      carregarDados();
    }, 0);

    // 1. Supabase Realtime via WebSockets (notificação instantânea no momento exato do voto ou proclamação)
    const client = supabase;
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
    if (isSupabaseConfigured() && client) {
      channel = client
        .channel('telao-live-realtime')
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

    // 2. BroadcastChannel para comunicação instantânea entre abas no mesmo navegador
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('eleicoes_jump_realtime_bus');
      bc.onmessage = () => {
        carregarDados();
      };
    }

    // 3. CustomEvent local para mesma aba
    const handleLocalUpdate = () => carregarDados();
    window.addEventListener('eleicoes_jump_update', handleLocalUpdate);

    // 4. Polling super rápido (fallback a cada 800ms) para manter telão 100% em tempo real
    const timer = setInterval(() => {
      carregarDados();
    }, 800);

    return () => {
      clearTimeout(timerInicial);
      clearInterval(timer);
      if (channel && client) {
        client.removeChannel(channel);
      }
      if (bc) {
        bc.close();
      }
      window.removeEventListener('eleicoes_jump_update', handleLocalUpdate);
      if (celebracaoTimerRef.current) {
        clearTimeout(celebracaoTimerRef.current);
      }
    };
  }, [carregarDados]);

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
  const eleitoNesteCargo = eleitos.find((e) => e.cargo_id === cargoAtivoObj?.id);

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col justify-between p-4 sm:p-8 font-sans select-none overflow-hidden relative">
      {/* Luzes de fundo / ambient glow para o telão */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Topo do Telão */}
      <header className="relative z-10 flex items-center justify-between pb-4 border-b border-neutral-800/80">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Ir para o Painel Admin"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-400 shadow-lg shadow-emerald-950/50">
              <Church className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                {config?.igreja || 'JUMP'}
              </span>
              <h1 className="text-lg md:text-2xl font-black uppercase tracking-wider text-white">
                {config?.titulo || 'Eleições JUMP'}
              </h1>
            </div>
          </div>
        </div>

        {/* Controles para a equipe de mídia no datashow */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-mono font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="hidden sm:inline">AO VIVO • </span>TEMPO REAL
          </div>

          <div className="hidden lg:flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 px-3.5 py-1.5 rounded-xl text-xs font-mono text-neutral-300">
            <span>Votos do Cargo: <strong className="text-emerald-400">{apuracaoAtiva?.totalVotos || 0}</strong></span>
          </div>

          {eleitos.length > 0 && (
            <button
              type="button"
              onClick={() => setModalEleitosGeral(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-600/70 text-xs font-bold text-amber-300 transition-all cursor-pointer shadow-md"
              title="Visualizar a lista de eleitos até o momento"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Eleitos ({eleitos.length}/5)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setQrCodeAmpliado(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-xs font-bold text-emerald-300 transition-all cursor-pointer shadow-md"
            title="Ampliar QR Code na tela inteira"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden md:inline">Ampliar QR</span>
          </button>

          <button
            type="button"
            onClick={() => setModoSuspense(!modoSuspense)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold transition-all cursor-pointer text-neutral-300"
            title={modoSuspense ? 'Exibir Votos' : 'Ocultar Votos (Modo Suspense para o Culto)'}
          >
            {modoSuspense ? (
              <>
                <Eye className="w-4 h-4 text-emerald-400" />
                <span className="hidden md:inline">Revelar</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">Suspense</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={carregarDados}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-all cursor-pointer"
            title="Atualizar Agora"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-all cursor-pointer"
            title="Tela Cheia"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ÁREA PRINCIPAL DO TELÃO */}
      <main className="relative z-10 flex-1 flex flex-col justify-center py-4 max-w-7xl mx-auto w-full">
        {/* BARRA DA DIRETORIA ELEITA ATÉ AGORA */}
        {eleitos.length > 0 && (
          <div className="mb-5 p-4 rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-900 border-2 border-amber-500/50 flex flex-wrap items-center justify-between gap-3 shadow-2xl shadow-amber-500/10 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Crown className="w-5 h-5 text-amber-400 fill-current" />
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-widest block">
                  Diretoria Eleita ({eleitos.length}/5)
                </span>
                <span className="text-xs text-neutral-400">
                  Líderes já proclamados pela igreja
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {eleitos.map((e) => (
                <div
                  key={e.cargo_id}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-neutral-950 border border-amber-500/40 text-xs shadow-inner"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-neutral-400 font-mono text-[11px] font-bold">{e.cargo_nome}:</span>
                  <strong className="text-amber-200 uppercase font-black">{e.nome}</strong>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">({e.votos}v)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BANNER COM QR CODE DE VOTAÇÃO NO TELÃO E O CARGO ATIVO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mb-6">
          {/* LADO ESQUERDO: QR CODE FIXO PARA OS JOVENS APONTAREM A CÂMERA */}
          <div className="lg:col-span-5 xl:col-span-4 bg-gradient-to-b from-neutral-900 to-neutral-950 border-2 border-emerald-500/70 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-300 text-xs font-black uppercase tracking-wider mb-4">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Votação pelo Celular</span>
            </div>

            {/* QR CODE RESPONSIVO AMPLIADO */}
            <div
              className="p-4 bg-white rounded-3xl shadow-2xl cursor-pointer hover:scale-105 transition-transform ring-4 ring-emerald-500/30"
              onClick={() => setQrCodeAmpliado(true)}
              title="Clique para abrir em tela cheia"
            >
              <QRCodeSVG
                value={votingUrl}
                size={250}
                level="H"
                includeMargin={false}
              />
            </div>

            <p className="text-sm font-black uppercase text-white mt-4 tracking-wider">
              Aponte a câmera para votar
            </p>
            <p className="text-xs text-emerald-400 font-mono font-bold mt-1 break-all select-all">
              {votingUrl}
            </p>
          </div>

          {/* LADO DIREITO: CARGO EM DESTAQUE E TOTAL DE VOTOS */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-center text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-3 shadow-lg shadow-emerald-950/50 w-fit mx-auto lg:mx-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>{config?.status === 'aberta' ? 'Votação Liberada Agora' : 'Votação em Espera'}</span>
            </div>

            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white drop-shadow-md">
              {cargoAtivoObj?.nome || 'DIRETORIA DOS JOVENS'}
            </h2>
            <p className="text-base text-neutral-300 mt-2 font-medium">
              Votos computados em tempo real na urna:{' '}
              <strong className="text-emerald-400 text-xl font-mono">
                {apuracaoAtiva?.totalVotos || 0}
              </strong>
            </p>
          </div>
        </div>

        {/* ALERTA DE VENCEDOR PROCLAMADO (SE JÁ FINALIZOU ESSE CARGO) */}
        {eleitoNesteCargo && (
          <div className="mb-6 p-6 rounded-3xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border-2 border-amber-400/80 text-center animate-scale-up shadow-2xl shadow-amber-500/20">
            <div className="inline-flex items-center gap-2 text-amber-300 font-black text-sm uppercase tracking-widest mb-1">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>PROCLAMADO(A) ELEITO(A) PELA IGREJA</span>
            </div>
            <div className="text-3xl md:text-5xl font-black text-white uppercase tracking-wider mt-1 drop-shadow-lg">
              {eleitoNesteCargo.nome}
            </div>
            <p className="text-sm text-emerald-300 font-bold mt-2">
              Novo(a) {cargoAtivoObj.nome} com {eleitoNesteCargo.votos} votos válidos!
            </p>
          </div>
        )}

        {/* CARDS DOS CANDIDATOS NO TELÃO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {!apuracaoAtiva || apuracaoAtiva.candidatos.length === 0 ? (
            <div className="col-span-3 py-12 text-center text-neutral-500 text-sm bg-neutral-900 rounded-3xl border border-neutral-800">
              Nenhum candidato concorrendo para este cargo.
            </div>
          ) : (
            apuracaoAtiva.candidatos.map(({ candidato, votos, porcentagem }, idx) => {
              const isEleito = eleitoNesteCargo?.nome.toUpperCase() === candidato.nome.toUpperCase();
              const isMaisVotado = idx === 0 && votos > 0 && !modoSuspense;

              return (
                <div
                  key={candidato.id}
                  className={`relative rounded-3xl p-5 border-2 transition-all flex flex-col justify-between overflow-hidden shadow-2xl ${
                    isEleito
                      ? 'bg-gradient-to-b from-amber-950/60 to-neutral-900 border-amber-400 shadow-amber-500/20 scale-[1.02]'
                      : isMaisVotado
                      ? 'bg-gradient-to-b from-emerald-950/60 to-neutral-900 border-emerald-500 shadow-emerald-500/20'
                      : 'bg-neutral-900/80 border-neutral-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      {/* Foto Grande 3:4 */}
                      <div className="relative w-20 h-28 md:w-24 md:h-32 rounded-2xl overflow-hidden bg-neutral-950 border-2 border-neutral-700 shrink-0 shadow-lg">
                        {candidato.foto_url ? (
                          <Image
                            src={candidato.foto_url}
                            alt={candidato.nome}
                            fill
                            sizes="120px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center font-bold text-neutral-600 text-2xl">
                            👤
                          </div>
                        )}

                        {isEleito && (
                          <div className="absolute inset-0 bg-amber-500/30 backdrop-blur-[1px] flex items-center justify-center">
                            <Trophy className="w-8 h-8 text-amber-300 drop-shadow-md" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="inline-block px-3 py-1 rounded-xl bg-neutral-950 border border-neutral-700 font-mono font-black text-xl text-emerald-400 mb-1 shadow-inner">
                          Nº {candidato.numero}
                        </div>
                        <h3 className="text-lg md:text-xl font-black text-white uppercase leading-tight truncate">
                          {candidato.nome}
                        </h3>

                        {candidato.inelegivel && (
                          <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded bg-red-950 border border-red-700 text-red-300">
                            ⚠️ Inelegível: {candidato.motivo_inelegivel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Placar de Votos */}
                  <div className="pt-3 border-t border-neutral-800">
                    {modoSuspense ? (
                      <div className="py-2.5 px-3 bg-neutral-950 rounded-xl text-center border border-neutral-800">
                        <span className="text-[11px] font-mono text-amber-400 uppercase tracking-widest font-bold">
                          🔒 Votos Ocultos para Suspense do Culto
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-end justify-between mb-1.5">
                          <span className="text-2xl font-black text-white font-mono">
                            {porcentagem.toFixed(1)}%
                          </span>
                          <span className="text-xs font-mono text-neutral-400 font-bold">
                            {votos} {votos === 1 ? 'voto' : 'votos'}
                          </span>
                        </div>

                        {/* Barra */}
                        <div className="w-full h-3.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              isEleito
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                                : isMaisVotado
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-neutral-600'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, porcentagem))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* RODAPÉ DO TELÃO: OS 5 CARGOS DA DIRETORIA */}
      <footer className="relative z-10 pt-4 border-t border-neutral-800/80">
        <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-2 font-bold flex items-center justify-between">
          <span>Quadro Geral da Diretoria Eleita</span>
          <span>{eleitos.length} de 5 Cargos Concluídos</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {cargos.map((cargo) => {
            const eleito = eleitos.find((e) => e.cargo_id === cargo.id);
            const isCargoAtivo = cargoAtivoId === cargo.id;

            return (
              <div
                key={cargo.id}
                className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                  eleito
                    ? 'bg-emerald-950/40 border-emerald-600/50 text-white'
                    : isCargoAtivo
                    ? 'bg-neutral-900 border-emerald-400 text-white ring-1 ring-emerald-400/30'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-500'
                }`}
              >
                <div className="text-[10px] font-mono uppercase tracking-wider font-bold">
                  {cargo.nome}
                </div>
                <div className="font-black text-sm uppercase mt-1 truncate">
                  {eleito ? (
                    <span className="text-amber-300 flex items-center gap-1">
                      <span>★</span>
                      <span>{eleito.nome}</span>
                    </span>
                  ) : isCargoAtivo ? (
                    <span className="text-emerald-400 animate-pulse">Votando...</span>
                  ) : (
                    <span className="text-neutral-600">Aguardando</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </footer>

      {/* MODAL GIGANTE DE QR CODE PARA PROJEÇÃO EM TELA CHEIA */}
      {qrCodeAmpliado && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 animate-fade-in cursor-pointer"
          onClick={() => setQrCodeAmpliado(false)}
        >
          <div className="text-center space-y-5 max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Smartphone className="w-4 h-4" />
              <span>Aponte a câmera do celular</span>
            </div>

            <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wider">
              {cargoAtivoObj?.nome}
            </h3>

            <div className="p-6 bg-white rounded-3xl shadow-2xl mx-auto w-fit ring-8 ring-emerald-500/20">
              <QRCodeSVG
                value={votingUrl}
                size={360}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="font-mono text-base text-emerald-400 font-black break-all select-all">
              {votingUrl}
            </div>

            <button
              type="button"
              onClick={() => setQrCodeAmpliado(false)}
              className="px-8 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Fechar Tela de QR Code
            </button>
          </div>
        </div>
      )}

      {/* MODAL GIGANTE DE CELEBRAÇÃO DO ELEITO COM FOGOS DE ARTIFÍCIO */}
      {eleitoCelebrando && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-scale-up cursor-pointer"
          onClick={() => setEleitoCelebrando(null)}
        >
          <div
            className="text-center space-y-6 max-w-2xl w-full bg-gradient-to-b from-neutral-900/95 via-neutral-950 to-black border-4 border-amber-400 rounded-3xl p-8 sm:p-12 shadow-2xl shadow-amber-500/40 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient glows dentro do card */}
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-amber-500/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/25 rounded-full blur-3xl pointer-events-none" />

            {/* Selo de Proclamação */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-950/90 border border-amber-400 text-amber-300 font-black text-xs uppercase tracking-widest shadow-xl animate-pulse">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>PROCLAMAÇÃO OFICIAL • JUMP 2026</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>

            {/* Foto do Eleito com Borda Dourada e Brilho */}
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

            {/* Notificação de que a próxima etapa já está aberta */}
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/70 text-left sm:text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  {eleitoCelebrando.proximoCargo
                    ? `A VOTAÇÃO PARA ${eleitoCelebrando.proximoCargo.nome} JÁ ESTÁ ABERTA!`
                    : 'TODAS AS ETAPAS DA ELEIÇÃO FORAM CONCLUÍDAS!'}
                </span>
              </div>
              <p className="text-xs text-neutral-300">
                {eleitoCelebrando.proximoCargo
                  ? 'Aponte seu celular para o QR Code no telão e vote no próximo cargo!'
                  : 'Parabéns à nova diretoria eleita da juventude JUMP!'}
              </p>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setEleitoCelebrando(null)}
                className="px-6 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-neutral-700"
              >
                Acompanhar Votação Atual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GERAL DE ELEITOS */}
      {modalEleitosGeral && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-scale-up cursor-pointer"
          onClick={() => setModalEleitosGeral(false)}
        >
          <div
            className="bg-neutral-900 border border-neutral-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-black uppercase text-white tracking-wider">
                  Diretoria Eleita ({eleitos.length}/5)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalEleitosGeral(false)}
                className="text-neutral-400 hover:text-white text-xs font-bold px-3 py-1 rounded-lg bg-neutral-800"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {eleitos.map((e) => (
                <div
                  key={e.cargo_id}
                  className="p-3.5 rounded-2xl bg-neutral-950 border border-amber-500/40 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                      <Crown className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                        {e.cargo_nome}
                      </span>
                      <h4 className="text-base font-black text-amber-200 uppercase">
                        {e.nome}
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold text-emerald-400">
                      {e.votos} votos
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
