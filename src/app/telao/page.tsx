'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { ApuracaoCargo, Cargo, ConfiguracaoEleicao, Eleitor } from '@/types/election';
import {
  getApuracao,
  getCargos,
  getConfiguracao,
  getEleitores,
  initializeLocalStorage,
} from '@/services/electionService';

export default function TelaoPage() {
  const [config, setConfig] = useState<ConfiguracaoEleicao | null>(null);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [eleitores, setEleitores] = useState<Eleitor[]>([]);
  const [apuracao, setApuracao] = useState<ApuracaoCargo[]>([]);
  const [modoSuspense, setModoSuspense] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qrCodeAmpliado, setQrCodeAmpliado] = useState(false);
  const [votingUrl] = useState(() => {
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  });
  const [ultimoVencedorProclamado, setUltimoVencedorProclamado] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    initializeLocalStorage();
    try {
      const [cfg, cgs, elts, apur] = await Promise.all([
        getConfiguracao(),
        getCargos(),
        getEleitores(),
        getApuracao(),
      ]);

      setConfig(cfg);
      setCargos(cgs);
      setEleitores(elts);
      setApuracao(apur);

      // Dispara confetes se acabou de proclamar um novo vencedor
      const totalEleitos = cfg.eleitos?.length || 0;
      if (totalEleitos > 0) {
        const maisRecente = cfg.eleitos[totalEleitos - 1];
        if (maisRecente && maisRecente.nome !== ultimoVencedorProclamado) {
          setUltimoVencedorProclamado(maisRecente.nome);
          try {
            confetti({
              particleCount: 150,
              spread: 100,
              origin: { y: 0.5 },
              colors: ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#ffffff'],
            });
          } catch {}
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar telão:', err);
    }
  }, [ultimoVencedorProclamado]);

  useEffect(() => {
    let ativo = true;

    const inicial = async () => {
      initializeLocalStorage();
      try {
        const [cfg, cgs, elts, apur] = await Promise.all([
          getConfiguracao(),
          getCargos(),
          getEleitores(),
          getApuracao(),
        ]);
        if (ativo) {
          setConfig(cfg);
          setCargos(cgs);
          setEleitores(elts);
          setApuracao(apur);
        }
      } catch (err) {
        console.error(err);
      }
    };

    inicial();

    // Auto-atualização rápida a cada 2.5 segundos para o datashow
    const timer = setInterval(() => {
      carregarDados();
    }, 2500);

    return () => {
      ativo = false;
      clearInterval(timer);
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

  const totalEleitores = eleitores.length;
  const eleitoresVotaram = eleitores.filter((e) => e.votou).length;
  const percentComparecimento =
    totalEleitores > 0 ? Math.round((eleitoresVotaram / totalEleitores) * 100) : 0;

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
                {config?.igreja || 'Igreja Local'}
              </span>
              <h1 className="text-lg md:text-2xl font-black uppercase tracking-wider text-white">
                {config?.titulo || 'Eleições da Juventude'}
              </h1>
            </div>
          </div>
        </div>

        {/* Controles para a equipe de mídia no datashow */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 px-4 py-2 rounded-xl text-xs font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Participação: {percentComparecimento}% ({eleitoresVotaram}/{totalEleitores})</span>
          </div>

          <button
            type="button"
            onClick={() => setQrCodeAmpliado(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-xs font-bold text-emerald-300 transition-all cursor-pointer shadow-md"
            title="Ampliar QR Code na tela inteira"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden md:inline">Ampliar QR Code</span>
          </button>

          <button
            type="button"
            onClick={() => setModoSuspense(!modoSuspense)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold transition-all cursor-pointer text-neutral-300"
            title={modoSuspense ? 'Exibir Votos' : 'Ocultar Votos (Modo Suspense para o Culto)'}
          >
            {modoSuspense ? (
              <>
                <Eye className="w-4 h-4 text-emerald-400" />
                <span className="hidden md:inline">Revelar Votos</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">Modo Suspense</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={carregarDados}
            className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-all cursor-pointer"
            title="Atualizar Agora"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-all cursor-pointer"
            title="Tela Cheia"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ÁREA PRINCIPAL DO TELÃO */}
      <main className="relative z-10 flex-1 flex flex-col justify-center py-4 max-w-7xl mx-auto w-full">
        {/* BANNER COM QR CODE DE VOTAÇÃO NO TELÃO E O CARGO ATIVO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mb-6">
          {/* LADO ESQUERDO: QR CODE FIXO PARA OS JOVENS APONTAREM A CÂMERA */}
          <div className="lg:col-span-4 bg-gradient-to-b from-neutral-900 to-neutral-950 border-2 border-emerald-500/70 rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-3">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Votação pelo Celular</span>
            </div>

            {/* QR CODE RESPONSIVO GERADO DINAMICAMENTE */}
            <div className="p-3 bg-white rounded-2xl shadow-2xl cursor-pointer hover:scale-105 transition-transform" onClick={() => setQrCodeAmpliado(true)}>
              {votingUrl ? (
                <QRCodeSVG
                  value={votingUrl}
                  size={170}
                  level="H"
                  includeMargin={false}
                />
              ) : (
                <div className="w-[170px] h-[170px] bg-neutral-200 animate-pulse rounded-xl" />
              )}
            </div>

            <p className="text-xs font-black uppercase text-white mt-3 tracking-wider">
              Aponte a câmera para votar
            </p>
            <p className="text-[11px] text-neutral-400 font-mono mt-0.5 break-all max-w-xs">
              {votingUrl || 'eleicoes.local'}
            </p>
          </div>

          {/* LADO DIREITO: CARGO EM DESTAQUE E TOTAL DE VOTOS */}
          <div className="lg:col-span-8 flex flex-col justify-center text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-3 shadow-lg shadow-emerald-950/50 w-fit mx-auto lg:mx-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Votação Liberada Agora</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white drop-shadow-md">
              {cargoAtivoObj?.nome || 'DIRETORIA DOS JOVENS'}
            </h2>
            <p className="text-sm text-neutral-300 mt-2 font-medium">
              Votos computados em tempo real na urna:{' '}
              <strong className="text-emerald-400 text-base font-mono">
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
                        <p className="text-xs text-neutral-400 font-semibold mt-0.5 truncate">
                          {candidato.chapa}
                        </p>

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
          <div className="text-center space-y-4 max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Smartphone className="w-4 h-4" />
              <span>Aponte a câmera do celular</span>
            </div>

            <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">
              Votação para {cargoAtivoObj?.nome}
            </h3>

            <div className="p-6 bg-white rounded-3xl shadow-2xl mx-auto w-fit">
              {votingUrl && (
                <QRCodeSVG
                  value={votingUrl}
                  size={280}
                  level="H"
                  includeMargin={false}
                />
              )}
            </div>

            <div className="font-mono text-sm text-emerald-400 font-bold break-all">
              {votingUrl}
            </div>

            <button
              type="button"
              onClick={() => setQrCodeAmpliado(false)}
              className="px-6 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider transition-all"
            >
              Fechar Tela de QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
