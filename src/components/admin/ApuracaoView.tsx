'use client';

import React from 'react';
import Image from 'next/image';
import { ApuracaoCargo, ConfiguracaoEleicao } from '@/types/election';
import { Trophy, Users, Vote, RefreshCw, CheckCircle2 } from 'lucide-react';

interface ApuracaoViewProps {
  apuracao: ApuracaoCargo[];
  config: ConfiguracaoEleicao | null;
  onRefresh: () => void;
  carregando: boolean;
}

export const ApuracaoView: React.FC<ApuracaoViewProps> = ({
  apuracao,
  config,
  onRefresh,
  carregando,
}) => {
  const totalVotosGeral = apuracao.reduce((acc, curr) => acc + curr.totalVotos, 0);
  const totalVotosValidos = apuracao.reduce((acc, curr) => acc + curr.votosValidos, 0);
  const totalVotosBrancos = apuracao.reduce((acc, curr) => acc + curr.votosBrancos, 0);

  return (
    <div className="space-y-6">
      {/* Cards de Resumo no Topo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Votos */}
        <div className="bg-neutral-800/80 border border-neutral-700/80 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Votos Registrados
            </div>
            <div className="text-3xl font-black text-white mt-1">
              {totalVotosGeral}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Em todos os cargos
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-700/50 flex items-center justify-center text-emerald-400">
            <Vote className="w-6 h-6" />
          </div>
        </div>

        {/* Votos Válidos */}
        <div className="bg-neutral-800/80 border border-neutral-700/80 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Votos Válidos
            </div>
            <div className="text-3xl font-black text-emerald-400 mt-1">
              {totalVotosValidos}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              {totalVotosBrancos} em branco
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-950/60 border border-blue-700/50 flex items-center justify-center text-blue-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Status da Eleição */}
        <div className="bg-neutral-800/80 border border-neutral-700/80 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Status da Eleição
            </div>
            <div className="text-xl font-bold uppercase mt-1 flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  config?.status === 'aberta'
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-neutral-500'
                }`}
              />
              <span
                className={
                  config?.status === 'aberta'
                    ? 'text-emerald-400'
                    : 'text-neutral-400'
                }
              >
                {config?.status === 'aberta' ? 'Votação Aberta' : 'Encerrada'}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              {config?.igreja}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-700/50 flex items-center justify-center text-amber-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Atualização Rápida */}
        <div className="bg-neutral-800/80 border border-neutral-700/80 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Apuração ao Vivo
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={carregando}
              className="p-1.5 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-200 transition-colors cursor-pointer"
              title="Atualizar Dados"
            >
              <RefreshCw
                className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
          <div className="text-xs text-neutral-300">
            Os resultados são atualizados instantaneamente a cada voto confirmado na urna.
          </div>
        </div>
      </div>

      {/* Resultados por Cargo */}
      <div className="space-y-6">
        {apuracao.map((item, cargoIdx) => {
          const { cargo, totalVotos, votosValidos, votosBrancos, votosNulos, candidatos } = item;
          const temVotos = totalVotos > 0;

          return (
            <div
              key={cargo.id}
              className="bg-neutral-800/90 border border-neutral-700/90 rounded-2xl p-6 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-700/80 gap-2 mb-6">
                <div>
                  <span className="text-[11px] font-mono font-semibold text-emerald-400 uppercase tracking-widest block">
                    Cargo {cargoIdx + 1}
                  </span>
                  <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight">
                    {cargo.nome}
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="px-3 py-1 rounded-full bg-neutral-700 text-neutral-300 font-semibold">
                    Total: {totalVotos} votos
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 font-semibold">
                    Válidos: {votosValidos}
                  </span>
                </div>
              </div>

              {/* Lista de Candidatos Disputando o Cargo */}
              <div className="space-y-4">
                {candidatos.map(({ candidato, votos, porcentagem }, index) => {
                  const isLider = index === 0 && temVotos && votos > 0;

                  return (
                    <div
                      key={candidato.id}
                      className={`relative p-4 rounded-xl border transition-all ${
                        isLider
                          ? 'bg-gradient-to-r from-emerald-950/40 to-neutral-800 border-emerald-500/50 shadow-md shadow-emerald-950/30'
                          : 'bg-neutral-900/60 border-neutral-700/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Foto e Informações */}
                        <div className="flex items-center gap-3.5">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-800 border border-neutral-700 shrink-0">
                            {candidato.foto_url ? (
                              <Image
                                src={candidato.foto_url}
                                alt={candidato.nome}
                                fill
                                sizes="60px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-lg text-neutral-400">
                                {candidato.nome[0]}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-neutral-700 text-neutral-200 font-mono font-bold text-xs">
                                Nº {candidato.numero}
                              </span>
                              <h4 className="font-black text-white text-base">
                                {candidato.nome}
                              </h4>
                              {isLider && !candidato.inelegivel && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  <Trophy className="w-3 h-3" />
                                  <span>Mais Votado</span>
                                </span>
                              )}
                              {candidato.inelegivel && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-700/60">
                                  <span>⚠️ {candidato.motivo_inelegivel || 'Inelegível'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Contagem de Votos e Porcentagem */}
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-black text-white">
                            {porcentagem.toFixed(1)}%
                          </div>
                          <div className="text-xs text-neutral-400 font-mono">
                            {votos} {votos === 1 ? 'voto' : 'votos'}
                          </div>
                        </div>
                      </div>

                      {/* Barra de Progresso Visual */}
                      <div className="w-full h-3 bg-neutral-800 rounded-full mt-3 overflow-hidden border border-neutral-700">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isLider ? 'bg-emerald-500' : 'bg-neutral-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, porcentagem))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Estatísticas de Brancos e Nulos no Rodapé do Cargo */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-neutral-700/60 text-xs text-neutral-400">
                <div className="p-2.5 rounded-lg bg-neutral-900/50 flex justify-between items-center">
                  <span>Votos em Branco:</span>
                  <span className="font-bold text-white font-mono">
                    {votosBrancos} (
                    {totalVotos > 0
                      ? ((votosBrancos / totalVotos) * 100).toFixed(1)
                      : '0.0'}
                    %)
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-900/50 flex justify-between items-center">
                  <span>Votos Nulos:</span>
                  <span className="font-bold text-white font-mono">
                    {votosNulos} (
                    {totalVotos > 0
                      ? ((votosNulos / totalVotos) * 100).toFixed(1)
                      : '0.0'}
                    %)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

