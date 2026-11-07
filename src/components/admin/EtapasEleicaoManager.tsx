'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Cargo, ApuracaoCargo, ConfiguracaoEleicao } from '@/types/election';
import {
  proclamarEleitoEAvancar,
  revogarEleito,
  liberarVotacaoCargo,
  pausarVotacao,
  liberarDispositivosCargo,
  zerarVotacaoCargo,
} from '@/services/electionService';
import {
  Trophy,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Play,
  Pause,
  ExternalLink,
  Smartphone,
  Trash2,
  ShieldAlert,
} from 'lucide-react';

interface EtapasEleicaoManagerProps {
  cargos: Cargo[];
  apuracao: ApuracaoCargo[];
  config: ConfiguracaoEleicao | null;
  onAtualizar: () => void;
}

export const EtapasEleicaoManager: React.FC<EtapasEleicaoManagerProps> = ({
  cargos,
  apuracao,
  config,
  onAtualizar,
}) => {
  const [modalProclamar, setModalProclamar] = useState(false);
  const [cargoParaProclamar, setCargoParaProclamar] = useState<Cargo | null>(null);
  const [salvando, setSalvando] = useState(false);

  const eleitos = config?.eleitos || [];
  const cargoAtivoId = config?.cargo_ativo_id || cargos[0]?.id;

  const sortedCargos = [...cargos].sort((a, b) => a.ordem - b.ordem);

  const abrirModal = (cargo: Cargo) => {
    setCargoParaProclamar(cargo);
    setModalProclamar(true);
  };

  const handleProclamar = async (nomeVencedor: string, votos: number, candId?: string) => {
    if (!cargoParaProclamar) return;

    setSalvando(true);
    try {
      const resultado = await proclamarEleitoEAvancar(
        cargoParaProclamar.id,
        nomeVencedor,
        votos,
        candId
      );
      setModalProclamar(false);
      onAtualizar();

      if (resultado.proximoCargo) {
        alert(
          `🎉 ${nomeVencedor} PROCLAMADO(A) ELEITO(A)!\n\n` +
          `A eleição para "${resultado.proximoCargo.nome}" foi INICIADA AUTOMATICAMENTE na urna, nos celulares e no telão!`
        );
      } else {
        alert(
          `🎉 ${nomeVencedor} ELEITO(A)!\n\n` +
          `Todas as 5 etapas da diretoria foram concluídas com sucesso!`
        );
      }
    } catch (err) {
      console.error('Erro ao proclamar vencedor:', err);
      alert('Erro ao proclamar eleito. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const handleLiberarCargo = async (cargoId: string) => {
    setSalvando(true);
    try {
      await liberarVotacaoCargo(cargoId);
      onAtualizar();
    } catch (e) {
      console.error('Erro ao liberar votação:', e);
    } finally {
      setSalvando(false);
    }
  };

  const handlePausarUrna = async () => {
    setSalvando(true);
    try {
      await pausarVotacao();
      onAtualizar();
    } catch (e) {
      console.error('Erro ao pausar urna:', e);
    } finally {
      setSalvando(false);
    }
  };

  const handleRevogar = async (nome: string, cargoNome: string) => {
    if (confirm(`Revogar a eleição de ${nome} para ${cargoNome}? A pessoa voltará a ser elegível para os outros cargos.`)) {
      await revogarEleito(nome);
      onAtualizar();
    }
  };

  const handleDesbloquearAparelhos = async (cargoId: string, nomeCargo: string) => {
    if (
      confirm(
        `Deseja DESBLOQUEAR todos os aparelhos/celulares para votar novamente em "${nomeCargo}"?\n\n` +
        `Isso atualiza a rodada e permite que qualquer aparelho possa votar de novo, sem apagar os votos já computados.`
      )
    ) {
      setSalvando(true);
      await liberarDispositivosCargo(cargoId);
      setSalvando(false);
      alert(`Aparelhos liberados com sucesso para a votação de ${nomeCargo}!`);
      onAtualizar();
    }
  };

  const handleZerarVotosCargo = async (cargoId: string, nomeCargo: string) => {
    if (
      confirm(
        `⚠️ ATENÇÃO: Deseja ZERAR OS VOTOS de "${nomeCargo}" e liberar todos os celulares para começar do zero?\n\n` +
        `Esta ação apaga os votos recebidos apenas para ${nomeCargo}, mantendo intactos os cargos anteriores já eleitos.`
      )
    ) {
      setSalvando(true);
      await zerarVotacaoCargo(cargoId);
      setSalvando(false);
      alert(`Votação de ${nomeCargo} zerada e celulares liberados para reiniciar!`);
      onAtualizar();
    }
  };

  const apuracaoCargoModal = apuracao.find((a) => a.cargo.id === cargoParaProclamar?.id);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-6">
      {/* Topo: Explicação da Regra */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-neutral-800 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-700/60 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Regra de Eleição Sequencial Ativa</span>
          </div>
          <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wider">
            Fluxo da Eleição: 1 Cargo por Vez
          </h2>
          <p className="text-xs text-neutral-400 max-w-2xl mt-1">
            A eleição ocorre cargo por cargo. Quando um candidato é <strong>eleito</strong>, ele é automaticamente 
            <strong> desqualificado de concorrer nos cargos seguintes</strong>. A urna é liberada para a próxima etapa.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <Link
              href="/resultados"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir Tela de Resultados em Tempo Real</span>
            </Link>
          </div>
        </div>

        {/* Quadro Resumo dos Eleitos */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 min-w-[260px] text-xs">
          <div className="font-bold text-neutral-400 uppercase text-[10px] tracking-wider mb-2 flex items-center justify-between">
            <span>Diretoria Eleita ({eleitos.length}/5)</span>
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
          </div>
          {eleitos.length === 0 ? (
            <div className="text-neutral-600 text-[11px] italic">
              Nenhum cargo finalizado ainda.
            </div>
          ) : (
            <div className="space-y-1.5">
              {eleitos.map((e) => (
                <div key={e.cargo_id} className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400 font-mono">{e.cargo_nome}:</span>
                  <span className="font-black text-emerald-400 uppercase">{e.nome}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* STEPPER DOS 5 CARGOS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {sortedCargos.map((cargo, idx) => {
          const eleito = eleitos.find((e) => e.cargo_id === cargo.id);
          const isAtivo = cargoAtivoId === cargo.id && !eleito;
          const isPendente = !eleito && !isAtivo;

          return (
            <div
              key={cargo.id}
              className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                eleito
                  ? 'bg-neutral-950 border-emerald-600/40'
                  : isAtivo
                  ? 'bg-gradient-to-b from-emerald-950/60 to-neutral-900 border-emerald-500 shadow-lg shadow-emerald-950/40 ring-2 ring-emerald-500/20'
                  : 'bg-neutral-950/60 border-neutral-800 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-neutral-500">
                    Etapa {idx + 1}
                  </span>
                  {eleito ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Concluído</span>
                    </span>
                  ) : isAtivo ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-900 px-2 py-0.5 rounded-full animate-pulse border border-emerald-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Votando</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" />
                      <span>Aguardando</span>
                    </span>
                  )}
                </div>

                <h4 className="text-xs font-black text-white uppercase tracking-tight mb-2">
                  {cargo.nome}
                </h4>

                {eleito ? (
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-700/50 text-xs">
                    <div className="text-[10px] text-amber-300 font-bold uppercase flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      <span>Eleito(a):</span>
                    </div>
                    <div className="font-black text-white text-xs mt-0.5 uppercase truncate">
                      {eleito.nome}
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                      {eleito.votos} votos válidos
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-neutral-400">
                    {isAtivo
                      ? 'Urna liberada recebendo votos deste cargo.'
                      : 'Aguardando encerramento da etapa anterior.'}
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="mt-4 pt-3 border-t border-neutral-800/80">
                {isAtivo && (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => abrirModal(cargo)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-2 rounded-xl text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-md transition-all cursor-pointer"
                    >
                      <span>Encerrar & Eleger</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    {config?.status === 'aberta' ? (
                      <button
                        type="button"
                        onClick={handlePausarUrna}
                        className="w-full bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-bold py-1.5 px-2 rounded-xl text-[10px] uppercase flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <Pause className="w-3 h-3" />
                        <span>Pausar Urna</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleLiberarCargo(cargo.id)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 px-2 rounded-xl text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Iniciar / Retomar Votação</span>
                      </button>
                    )}

                    {/* Controles de Dispositivos e Reinício */}
                    <div className="pt-2 border-t border-neutral-800 space-y-1">
                      <button
                        type="button"
                        onClick={() => handleDesbloquearAparelhos(cargo.id, cargo.nome)}
                        className="w-full bg-neutral-950 hover:bg-neutral-800 text-emerald-400 border border-emerald-900/60 font-bold py-1 px-2 rounded-lg text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                        title="Permite que todos os celulares votem novamente neste cargo"
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>Desbloquear Aparelhos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleZerarVotosCargo(cargo.id, cargo.nome)}
                        className="w-full bg-neutral-950 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 border border-neutral-800 font-bold py-1 px-2 rounded-lg text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                        title="Zera apenas os votos deste cargo e libera os celulares para recomeçar do zero"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Zerar Votos Deste Cargo</span>
                      </button>
                    </div>
                  </div>
                )}

                {eleito && (
                  <button
                    type="button"
                    onClick={() => handleRevogar(eleito.nome, cargo.nome)}
                    className="w-full text-[10px] text-neutral-500 hover:text-red-400 py-1 font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                    title="Desfazer e reabrir votação deste cargo"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Desfazer</span>
                  </button>
                )}

                {isPendente && (
                  <button
                    type="button"
                    onClick={() => handleLiberarCargo(cargo.id)}
                    className="w-full bg-neutral-800 hover:bg-emerald-600 hover:text-white text-emerald-400 border border-neutral-700 hover:border-emerald-500 py-1.5 px-2 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    <span>Liberar Votação</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL PARA PROCLAMAR O VENCEDOR */}
      {modalProclamar && cargoParaProclamar && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-scale-up text-xs">
            <div className="border-b border-neutral-800 pb-3 mb-4">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest block">
                Proclamação do Vencedor
              </span>
              <h3 className="text-base font-black text-white uppercase tracking-wider mt-0.5">
                Eleição para {cargoParaProclamar.nome}
              </h3>
              <p className="text-neutral-400 text-xs mt-1">
                Selecione o candidato que venceu a votação. Ao confirmar, ele será proclamado eleito e <strong>automaticamente impedido de disputar os cargos seguintes</strong>.
              </p>
            </div>

            {/* Lista dos mais votados */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 mb-5">
              {!apuracaoCargoModal || apuracaoCargoModal.candidatos.length === 0 ? (
                <div className="py-6 text-center text-neutral-500">
                  Nenhum candidato registrado para este cargo.
                </div>
              ) : (
                apuracaoCargoModal.candidatos.map(({ candidato, votos, porcentagem }, index) => {
                  const isMaisVotado = index === 0 && votos > 0;

                  return (
                    <div
                      key={candidato.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                        isMaisVotado
                          ? 'bg-emerald-950/40 border-emerald-500 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-300 font-bold flex items-center justify-center text-[10px]">
                          {index + 1}º
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-emerald-400 text-xs">
                              Nº {candidato.numero}
                            </span>
                            <span className="font-black text-white uppercase text-xs">
                              {candidato.nome}
                            </span>
                            {isMaisVotado && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold uppercase">
                                Mais Votado
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            {candidato.chapa}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-black text-white text-sm">
                            {votos} votos
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {porcentagem.toFixed(1)}%
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={salvando}
                          onClick={() =>
                            handleProclamar(candidato.nome, votos, candidato.id)
                          }
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs uppercase tracking-wider cursor-pointer shadow transition-all disabled:opacity-50"
                        >
                          Proclamar Eleito
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl mb-4 text-[11px] text-neutral-400 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Ao proclamar o eleito, o status de voto de todos os jovens é resetado para que possam votar no próximo cargo da diretoria.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setModalProclamar(false)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

