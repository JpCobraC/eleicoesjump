'use client';

import React from 'react';
import Image from 'next/image';
import { Cargo, Candidato } from '@/types/election';

interface UrnaScreenProps {
  cargo: Cargo | null;
  candidato: Candidato | null;
  digitosDigitados: string;
  isBranco: boolean;
  isNulo: boolean;
  isFim: boolean;
  cargoIndex: number;
  totalCargos: number;
  tituloEleicao: string;
  igreja: string;
  modoVotacao?: 'sequencial_um_por_vez' | 'todos_juntos';
}

export const UrnaScreen: React.FC<UrnaScreenProps> = ({
  cargo,
  candidato,
  digitosDigitados,
  isBranco,
  isNulo,
  isFim,
  cargoIndex,
  totalCargos,
  tituloEleicao,
  igreja,
  modoVotacao = 'sequencial_um_por_vez',
}) => {
  // Tela de FIM clássica da Urna Eletrônica
  if (isFim) {
    return (
      <div className="relative w-full h-[460px] md:h-[500px] bg-[#eef1ed] border-4 border-[#333] shadow-inner rounded-md p-6 flex flex-col items-center justify-center font-sans overflow-hidden select-none">
        {/* Marca d'água de segurança */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <div className="text-8xl font-black rotate-[-20deg]">JUSTIÇA ELEITORAL</div>
        </div>

        {/* Caixa VOTOU estilo TSE no canto superior direito */}
        <div className="absolute top-4 right-4 border-2 border-neutral-800 bg-neutral-100 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-neutral-800 shadow-sm">
          VOTOU
        </div>

        <div className="text-center z-10 animate-fade-in">
          <div className="text-7xl md:text-9xl font-black text-neutral-900 tracking-tighter mb-2 font-mono">
            F I M
          </div>
          <div className="text-lg md:text-xl font-bold text-emerald-800 mb-1">
            Voto computado com sucesso!
          </div>
          <p className="text-xs md:text-sm text-neutral-600 max-w-sm mx-auto font-medium">
            Seu voto para {cargo?.nome || 'este cargo'} foi registrado com total sigilo.
          </p>
        </div>

        <div className="absolute bottom-4 text-center text-[11px] text-neutral-500 font-mono">
          {tituloEleicao} • {igreja}
        </div>
      </div>
    );
  }

  const numDigitosEsperados = cargo?.digitos || 2;
  const digitsArray = digitosDigitados.split('');
  const isCandidatoInelegivel = Boolean(candidato?.inelegivel);

  return (
    <div className="relative w-full h-[460px] md:h-[500px] bg-[#fbfdfa] border-4 border-[#333] shadow-inner rounded-md p-4 md:p-6 flex flex-col justify-between font-sans select-none overflow-hidden">
      {/* Topo da Tela com Identificação do Cargo e Progresso */}
      <div>
        <div className="flex justify-between items-start border-b border-neutral-300 pb-2 mb-2">
          <div>
            <div className="text-[11px] md:text-xs font-bold text-neutral-600 uppercase tracking-wider">
              SEU VOTO PARA
            </div>
            <h1 className="text-base md:text-xl font-black text-neutral-900 uppercase tracking-tight">
              {cargo?.nome || 'CARGO EM VOTAÇÃO'}
            </h1>
          </div>
          <div className="text-right">
            <span className="text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded bg-neutral-200 text-neutral-700">
              {modoVotacao === 'sequencial_um_por_vez'
                ? `Votação Oficial: ${cargo?.nome}`
                : `Cargo ${cargoIndex + 1} de ${totalCargos}`}
            </span>
          </div>
        </div>

        {/* Linha dos Dígitos */}
        {!isBranco && (
          <div className="flex items-center gap-2 my-2">
            <span className="text-xs md:text-sm font-bold text-neutral-700 uppercase">
              Número:
            </span>
            <div className="flex gap-1.5">
              {Array.from({ length: numDigitosEsperados }).map((_, idx) => {
                const digit = digitsArray[idx];
                const isActive = idx === digitsArray.length;

                return (
                  <div
                    key={idx}
                    className={`w-9 h-12 md:w-11 md:h-14 border-2 flex items-center justify-center text-2xl md:text-3xl font-black font-mono shadow-inner ${
                      digit
                        ? 'border-neutral-900 bg-white text-neutral-900'
                        : isActive
                        ? 'border-neutral-900 bg-white animate-pulse'
                        : 'border-neutral-400 bg-neutral-100 text-neutral-300'
                    }`}
                  >
                    {digit || (isActive ? '|' : '')}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Exibição quando VOTO EM BRANCO */}
        {isBranco && (
          <div className="my-10 text-center animate-fade-in">
            <div className="text-3xl md:text-4xl font-black text-neutral-900 tracking-wider">
              VOTO EM BRANCO
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Você escolheu não votar em nenhum candidato para este cargo.
            </p>
          </div>
        )}

        {/* Exibição quando NÚMERO NÃO ENCONTRADO (VOTO NULO) */}
        {isNulo && !isBranco && (
          <div className="my-6 animate-fade-in">
            <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1 animate-pulse">
              NÚMERO ERRADO
            </div>
            <div className="text-2xl md:text-3xl font-black text-neutral-900 tracking-wider">
              VOTO NULO
            </div>
          </div>
        )}

        {/* Alerta de Candidato Inelegível (Já eleito em outro cargo) */}
        {candidato && isCandidatoInelegivel && !isBranco && (
          <div className="my-2 p-2.5 bg-red-100 border-2 border-red-500 rounded text-red-900 text-xs animate-fade-in">
            <div className="font-black text-red-700 uppercase flex items-center gap-1">
              ⚠️ CANDIDATO JÁ ELEITO (INELEGÍVEL)
            </div>
            <div className="text-[11px] font-bold mt-0.5">
              {candidato.motivo_inelegivel || 'Já eleito em cargo anterior'}.
            </div>
            <div className="text-[10px] text-red-800 mt-1">
              Se confirmar, este voto será computado como <strong>NULO</strong>. Aperte <strong>CORRIGE</strong> para escolher outro candidato.
            </div>
          </div>
        )}

        {/* Dados do Candidato Encontrado */}
        {candidato && !isBranco && (
          <div className="flex justify-between items-start gap-4 mt-2">
            <div className="space-y-1.5 flex-1">
              <div>
                <span className="text-[10px] md:text-xs font-semibold text-neutral-500 block uppercase">
                  Nome:
                </span>
                <span className="text-sm md:text-base font-black text-neutral-900 uppercase">
                  {candidato.nome}
                </span>
              </div>

              {candidato.nome_vice && (
                <div>
                  <span className="text-[10px] md:text-xs font-semibold text-neutral-500 block uppercase">
                    Vice / Co-Líder:
                  </span>
                  <span className="text-xs md:text-sm font-bold text-neutral-800 uppercase">
                    {candidato.nome_vice}
                  </span>
                </div>
              )}

              <div>
                <span className="text-[10px] md:text-xs font-semibold text-neutral-500 block uppercase">
                  Chapa / Ministério:
                </span>
                <span className="text-xs md:text-sm font-bold text-neutral-800 uppercase">
                  {candidato.chapa}
                </span>
              </div>
            </div>

            {/* Foto do Candidato na Urna */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-28 md:w-28 md:h-34 border-2 border-neutral-800 bg-neutral-200 overflow-hidden relative shadow-sm flex items-center justify-center">
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
                  <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-300 text-neutral-600 font-bold text-xs p-1 text-center">
                    <span className="text-xl mb-1">👤</span>
                    <span>{candidato.nome.split(' ')[0]}</span>
                  </div>
                )}
              </div>
              <span className="text-[9px] font-mono text-neutral-600 mt-1 uppercase">
                Candidato
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Rodapé da Tela da Urna - Instruções e Linha Divisória */}
      <div className="border-t-2 border-neutral-900 pt-2 text-[11px] md:text-xs font-sans text-neutral-800 leading-tight">
        <div className="font-bold mb-1 text-[10px] md:text-[11px] text-neutral-600 uppercase">
          Aperte a tecla:
        </div>
        <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
          <span>VERDE para CONFIRMAR este voto</span>
        </div>
        <div className="flex items-center gap-1.5 text-orange-950 font-bold">
          <span className="w-2 h-2 rounded-full bg-orange-600 inline-block" />
          <span>LARANJA para REINICIAR este voto</span>
        </div>
      </div>
    </div>
  );
};
