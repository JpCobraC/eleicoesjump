'use client';

import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Volume2, VolumeX, Maximize2, Shield, Church, Users } from 'lucide-react';
import Link from 'next/link';

import { Cargo, Candidato, Eleitor, ConfiguracaoEleicao } from '@/types/election';
import {
  getCargos,
  getCandidatos,
  getConfiguracao,
  getEleitores,
  registrarVotosCompletos,
  initializeLocalStorage,
} from '@/services/electionService';
import {
  playKeyBeep,
  playCorrigeSound,
  playInterConfirmaSound,
  playUrnaFimSound,
} from '@/utils/sound';

import { UrnaScreen } from './UrnaScreen';
import { UrnaKeypad } from './UrnaKeypad';
import { VoterGateModal } from './VoterGateModal';

export const UrnaMachine: React.FC = () => {
  const [config, setConfig] = useState<ConfiguracaoEleicao | null>(null);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [eleitores, setEleitores] = useState<Eleitor[]>([]);

  // Estado da sessão de votação
  const [currentCargoIndex, setCurrentCargoIndex] = useState(0);
  const [digitosDigitados, setDigitosDigitados] = useState('');
  const [isBranco, setIsBranco] = useState(false);
  const [isFim, setIsFim] = useState(false);
  const [processandoVoto, setProcessandoVoto] = useState(false);

  // Eleitor autenticado
  const [eleitorAtivo, setEleitorAtivo] = useState<Eleitor | null>(null);
  const [isGateOpen, setIsGateOpen] = useState(false);

  // Preferências
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Votos acumulados na sessão atual
  const [votosSessao, setVotosSessao] = useState<
    Array<{
      cargoId: string;
      candidatoId: string | null;
      tipo: 'valido' | 'branco' | 'nulo';
      numeroDigitado: string;
    }>
  >([]);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      initializeLocalStorage();
      const [cfg, cgs, cands, elts] = await Promise.all([
        getConfiguracao(),
        getCargos(),
        getCandidatos(),
        getEleitores(),
      ]);

      if (ativo) {
        setConfig(cfg);
        setCargos(cgs);
        setCandidatos(cands);
        setEleitores(elts);
        setSoundEnabled(cfg.som_habilitado);

        if (cfg.exigir_codigo_eleitor && cfg.status === 'aberta') {
          setIsGateOpen(true);
        }
      }
    };

    carregar();

    return () => {
      ativo = false;
    };
  }, []);

  const isModoSequencial = config?.modo_votacao !== 'todos_juntos';

  // No modo sequencial, o cargo em votação é o configurado como ativo pela mesa
  const currentCargo = useMemo(() => {
    if (isModoSequencial && config?.cargo_ativo_id) {
      return (
        cargos.find((c) => c.id === config.cargo_ativo_id) ||
        cargos[0] ||
        null
      );
    }
    return cargos[currentCargoIndex] || null;
  }, [isModoSequencial, config, cargos, currentCargoIndex]);

  // Candidato correspondente ao número digitado
  const candidatoEncontrado = useMemo(() => {
    if (!currentCargo || isBranco) return null;
    if (digitosDigitados.length < currentCargo.digitos) return null;

    return (
      candidatos.find(
        (c) =>
          c.cargo_id === currentCargo.id && c.numero === digitosDigitados
      ) || null
    );
  }, [currentCargo, candidatos, digitosDigitados, isBranco]);

  const isNulo = useMemo(() => {
    if (!currentCargo || isBranco) return false;
    return (
      digitosDigitados.length === currentCargo.digitos && !candidatoEncontrado
    );
  }, [currentCargo, isBranco, digitosDigitados, candidatoEncontrado]);

  // Ações do Teclado da Urna
  const handleDigitPress = (digit: string) => {
    if (isFim || processandoVoto || !currentCargo) return;
    if (isBranco) return;

    if (digitosDigitados.length < currentCargo.digitos) {
      playKeyBeep(soundEnabled);
      setDigitosDigitados((prev) => prev + digit);
    }
  };

  const handleBrancoPress = () => {
    if (isFim || processandoVoto || !currentCargo) return;
    if (!currentCargo.permite_branco) return;

    if (digitosDigitados.length === 0) {
      playKeyBeep(soundEnabled);
      setIsBranco(true);
    }
  };

  const handleCorrigePress = () => {
    if (isFim || processandoVoto) return;
    playCorrigeSound(soundEnabled);
    setDigitosDigitados('');
    setIsBranco(false);
  };

  const handleConfirmaPress = async () => {
    if (isFim || processandoVoto || !currentCargo) return;

    // Se apertou confirma sem preencher e sem branco, ignora
    if (!isBranco && digitosDigitados.length < currentCargo.digitos) {
      return;
    }

    setProcessandoVoto(true);

    let tipo: 'valido' | 'branco' | 'nulo';
    let candidatoId: string | null = null;

    if (isBranco) {
      tipo = 'branco';
    } else if (candidatoEncontrado) {
      // Se o candidato já foi eleito em cargo anterior, voto é computado como nulo
      if (candidatoEncontrado.inelegivel) {
        tipo = 'nulo';
        candidatoId = null;
      } else {
        tipo = 'valido';
        candidatoId = candidatoEncontrado.id;
      }
    } else {
      tipo = 'nulo';
    }

    const novoVoto = {
      cargoId: currentCargo.id,
      candidatoId,
      tipo,
      numeroDigitado: isBranco ? 'BRANCO' : digitosDigitados,
    };

    const novaListaVotos = [...votosSessao, novoVoto];
    setVotosSessao(novaListaVotos);

    // No modo sequencial de 1 por vez, a votação daquele eleitor termina neste cargo!
    const isUltimoCargo = isModoSequencial || currentCargoIndex === cargos.length - 1;

    if (!isUltimoCargo) {
      // Avança para o próximo cargo na mesma sessão
      playInterConfirmaSound(soundEnabled);
      setCurrentCargoIndex((prev) => prev + 1);
      setDigitosDigitados('');
      setIsBranco(false);
      setProcessandoVoto(false);
    } else {
      // FIM DA VOTAÇÃO DO ELEITOR
      setIsFim(true);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#15803d', '#059669', '#3b82f6', '#f59e0b'],
        });
      } catch {
        // Fallback
      }

      // Salva os votos
      await registrarVotosCompletos(
        novaListaVotos,
        eleitorAtivo ? eleitorAtivo.codigo : undefined
      );

      // Toca o PILILILI da urna
      await playUrnaFimSound(soundEnabled);

      setTimeout(async () => {
        setIsFim(false);
        setCurrentCargoIndex(0);
        setDigitosDigitados('');
        setIsBranco(false);
        setVotosSessao([]);
        setEleitorAtivo(null);
        setProcessandoVoto(false);

        // Recarrega eleitores e configurações
        const [eltsAtualizados, cfgAtualizada, candsAtualizados] = await Promise.all([
          getEleitores(),
          getConfiguracao(),
          getCandidatos(),
        ]);
        setEleitores(eltsAtualizados);
        setConfig(cfgAtualizada);
        setCandidatos(candsAtualizados);

        if (cfgAtualizada?.exigir_codigo_eleitor) {
          setIsGateOpen(true);
        }
      }, 3000);
    }
  };

  const handleLiberarVotacao = (eleitor?: Eleitor) => {
    if (eleitor) {
      setEleitorAtivo(eleitor);
    }
    setIsGateOpen(false);
    setCurrentCargoIndex(0);
    setDigitosDigitados('');
    setIsBranco(false);
    setVotosSessao([]);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col justify-between py-4 px-2 sm:px-4">
      {/* Barra Superior */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-3 border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
            <Church className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold uppercase tracking-wider text-neutral-200">
              {config?.igreja || 'Juventude da Igreja'}
            </div>
            <div className="text-[11px] text-neutral-400">
              {config?.titulo || 'Eleições do Ministério Jovem'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {eleitorAtivo && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/40 border border-emerald-600/40 text-emerald-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Eleitor: {eleitorAtivo.nome}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
            title={soundEnabled ? 'Silenciar Áudio' : 'Ativar Sons da Urna'}
            aria-label="Controle de Som"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-neutral-500" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
            title="Tela Cheia"
            aria-label="Tela Cheia"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <Link
            href="/resultados"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-400 font-bold transition-all text-xs uppercase tracking-wider cursor-pointer border border-neutral-700"
          >
            <span>Resultados</span>
          </Link>

          <Link
            href="/admin/candidatos"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold transition-all text-xs uppercase tracking-wider cursor-pointer border border-neutral-700"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Candidatos & Fotos</span>
          </Link>

          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold transition-all shadow-md shadow-emerald-900/30 text-xs uppercase tracking-wider cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Painel / Apuração</span>
          </Link>
        </div>
      </header>

      {/* GABINETE DA URNA ELETRÔNICA */}
      <main className="flex-1 flex items-center justify-center py-4">
        <div className="relative w-full max-w-5xl bg-[#c5c8ca] border-8 border-[#9da2a6] rounded-3xl p-4 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] select-none">
          {/* Parafusos decorativos */}
          <div className="absolute top-3 left-3 w-3 h-3 rounded-full bg-neutral-500 border border-neutral-700 flex items-center justify-center shadow-inner">
            <span className="w-2 h-0.5 bg-neutral-800 block" />
          </div>
          <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-neutral-500 border border-neutral-700 flex items-center justify-center shadow-inner">
            <span className="w-2 h-0.5 bg-neutral-800 block" />
          </div>
          <div className="absolute bottom-3 left-3 w-3 h-3 rounded-full bg-neutral-500 border border-neutral-700 flex items-center justify-center shadow-inner">
            <span className="w-2 h-0.5 bg-neutral-800 block" />
          </div>
          <div className="absolute bottom-3 right-3 w-3 h-3 rounded-full bg-neutral-500 border border-neutral-700 flex items-center justify-center shadow-inner">
            <span className="w-2 h-0.5 bg-neutral-800 block" />
          </div>

          {/* Placa Frontal da Urna */}
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-800 border-2 border-emerald-600 flex items-center justify-center text-white font-black text-sm shadow">
                ★
              </div>
              <div>
                <div className="text-xs sm:text-sm font-black text-neutral-800 tracking-wider uppercase font-mono">
                  ELEIÇÕES JUVENTUDE
                </div>
                <div className="text-[10px] text-neutral-600 font-bold uppercase">
                  {isModoSequencial ? (
                    <span className="text-emerald-800 font-black">
                      VOTAÇÃO ATUAL: {currentCargo?.nome || 'DIRETORIA'}
                    </span>
                  ) : (
                    config?.igreja || 'Igreja Local'
                  )}
                </div>
              </div>
            </div>

            {/* LEDs indicadores */}
            <div className="flex items-center gap-4 text-[10px] font-mono text-neutral-700">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                <span className="font-bold">ENERGIA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                <span className="font-bold">SISTEMA</span>
              </div>
            </div>
          </div>

          {/* Tela (Esquerda) e Teclado Numérico (Direita) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center">
              <UrnaScreen
                cargo={currentCargo}
                candidato={candidatoEncontrado}
                digitosDigitados={digitosDigitados}
                isBranco={isBranco}
                isNulo={isNulo}
                isFim={isFim}
                cargoIndex={currentCargoIndex}
                totalCargos={cargos.length}
                tituloEleicao={config?.titulo || 'Eleições'}
                igreja={config?.igreja || 'Juventude'}
                modoVotacao={config?.modo_votacao}
              />
            </div>

            <div className="lg:col-span-5 flex flex-col justify-center">
              <UrnaKeypad
                onDigitPress={handleDigitPress}
                onBrancoPress={handleBrancoPress}
                onCorrigePress={handleCorrigePress}
                onConfirmaPress={handleConfirmaPress}
                disabled={isFim || processandoVoto}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Autenticação */}
      <VoterGateModal
        isOpen={isGateOpen}
        onLiberarVotacao={handleLiberarVotacao}
        codigoMesario={config?.codigo_mesario || '1234'}
        eleitoresDisponiveis={eleitores}
      />

      {/* Rodapé */}
      <footer className="text-center text-[11px] text-neutral-500 py-2">
        {isModoSequencial ? (
          <span>
            Votação em Etapas • Cargo Atual:{' '}
            <strong className="text-emerald-400">{currentCargo?.nome}</strong> • Os candidatos eleitos são automaticamente desqualificados dos próximos cargos.
          </span>
        ) : (
          <span>Urna Eletrônica Digital • Desenvolvida para Eleições da Juventude</span>
        )}
      </footer>
    </div>
  );
};
