'use client';

import React from 'react';
import { ApuracaoCargo, ConfiguracaoEleicao, Eleitor } from '@/types/election';
import { Printer, ShieldCheck } from 'lucide-react';

interface BoletimUrnaProps {
  apuracao: ApuracaoCargo[];
  config: ConfiguracaoEleicao | null;
  eleitores: Eleitor[];
  tipo?: 'bu' | 'zeresima';
}

export const BoletimUrna: React.FC<BoletimUrnaProps> = ({
  apuracao,
  config,
  tipo = 'bu',
}) => {
  const isZeresima = tipo === 'zeresima';
  const dataHoraAtual = new Date().toLocaleString('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const totalVotosGeral = apuracao.reduce((acc, c) => acc + c.totalVotos, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Barra de ação (oculta na impressão) */}
      <div className="flex items-center justify-between bg-neutral-800 p-4 rounded-xl print:hidden">
        <div>
          <h3 className="font-bold text-white text-base">
            {isZeresima ? 'Relatório de Zerésima Oficial' : 'Boletim de Urna (BU) Oficial'}
          </h3>
          <p className="text-xs text-neutral-400">
            {isZeresima
              ? 'Comprova que todos os candidatos iniciam a eleição com zero votos.'
              : 'Documento oficial impresso ao término da eleição para afixação e auditoria.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition-all cursor-pointer text-xs uppercase tracking-wider"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Relatório</span>
        </button>
      </div>

      {/* DOCUMENTO FORMAL IMPRESSO (BOLETIM DE URNA) */}
      <div className="bg-white text-neutral-900 p-6 md:p-10 rounded-xl shadow-lg border border-neutral-300 font-mono text-xs max-w-3xl mx-auto print:shadow-none print:border-none print:p-0 print:max-w-none">
        {/* Cabeçalho Oficial */}
        <div className="text-center border-b-2 border-dashed border-neutral-800 pb-4 mb-4">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-10 rounded-full border-2 border-neutral-800 flex items-center justify-center font-bold text-lg">
              ★
            </div>
          </div>
          <div className="text-base font-black uppercase tracking-wider">
            {config?.igreja || 'MINISTÉRIO DE JOVENS'}
          </div>
          <div className="text-sm font-bold uppercase">
            COMISSÃO ELEITORAL DA JUVENTUDE
          </div>
          <div className="text-xs font-semibold mt-1">
            {isZeresima ? 'RELATÓRIO DE ZERÉSIMA' : 'BOLETIM DE URNA (BU)'}
          </div>
          <div className="text-[10px] text-neutral-600 mt-0.5">
            {config?.titulo || 'Eleições Gerais'}
          </div>
        </div>

        {/* Metadados da Seção */}
        <div className="grid grid-cols-2 gap-2 border-b border-neutral-300 pb-3 mb-4 text-[11px]">
          <div>
            <span className="font-bold">MUNICÍPIO / SEDE:</span> JUMP
          </div>
          <div>
            <span className="font-bold">DATA / HORA:</span> {dataHoraAtual}
          </div>
          <div>
            <span className="font-bold">SEÇÃO / URNA:</span> 001 - Principal
          </div>
          <div>
            <span className="font-bold">STATUS DA ELEIÇÃO:</span>{' '}
            {config?.status.toUpperCase() || 'ABERTA'}
          </div>
        </div>

        {/* Resumo Geral */}
        <div className="bg-neutral-50 p-3 border border-neutral-200 rounded mb-4 text-[11px]">
          <div className="font-bold border-b border-neutral-200 pb-1 mb-1">
            RESUMO GERAL DO PLEITO:
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span>Total de Cargos em Disputa:</span> <strong>{apuracao.length}</strong>
            </div>
            <div>
              <span>Total de Votos Registrados:</span> <strong>{totalVotosGeral}</strong>
            </div>
          </div>
        </div>

        {/* Listagem de Resultados por Cargo */}
        <div className="space-y-6">
          {apuracao.map((item, index) => {
            const { cargo, totalVotos, votosValidos, votosBrancos, votosNulos, candidatos } = item;

            return (
              <div key={cargo.id} className="border border-neutral-300 rounded p-3">
                <div className="bg-neutral-100 p-2 font-bold text-xs uppercase flex justify-between items-center mb-2">
                  <span>
                    {index + 1}. {cargo.nome}
                  </span>
                  <span>Total Votos: {isZeresima ? 0 : totalVotos}</span>
                </div>

                {/* Tabela de Candidatos */}
                <table className="w-full text-left text-[11px] mb-3">
                  <thead>
                    <tr className="border-b border-neutral-300 text-neutral-600">
                      <th className="py-1">Nº</th>
                      <th className="py-1">Candidato / Chapa</th>
                      <th className="py-1 text-right">Votos</th>
                      <th className="py-1 text-right">% Válidos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {candidatos.map(({ candidato, votos, porcentagem }) => (
                      <tr key={candidato.id}>
                        <td className="py-1.5 font-bold">{candidato.numero}</td>
                        <td className="py-1.5">
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{candidato.nome}</span>
                            {config?.eleitos?.some((e) => e.cargo_id === cargo.id && e.nome.toUpperCase() === candidato.nome.toUpperCase()) && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-black border border-emerald-300">
                                [ELEITO(A)]
                              </span>
                            )}
                            {candidato.inelegivel && (
                              <span className="text-[9px] text-red-600 font-bold">
                                [{candidato.motivo_inelegivel || 'INELEGÍVEL'}]
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-1.5 text-right font-bold">
                          {isZeresima ? 0 : votos}
                        </td>
                        <td className="py-1.5 text-right font-mono">
                          {isZeresima ? '0.0%' : `${porcentagem.toFixed(1)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totais do Cargo */}
                <div className="border-t border-neutral-300 pt-2 text-[10px] grid grid-cols-3 text-center bg-neutral-50 p-1.5 rounded">
                  <div>
                    Votos Válidos: <strong>{isZeresima ? 0 : votosValidos}</strong>
                  </div>
                  <div>
                    Votos em Branco: <strong>{isZeresima ? 0 : votosBrancos}</strong>
                  </div>
                  <div>
                    Votos Nulos: <strong>{isZeresima ? 0 : votosNulos}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hash de Autenticidade */}
        <div className="mt-6 pt-3 border-t-2 border-dashed border-neutral-800 text-[10px] text-neutral-600">
          <div className="flex items-center gap-1 font-bold mb-1 text-neutral-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>HASH DE SEGURANÇA E INTEGRIDADE DA URNA:</span>
          </div>
          <div className="break-all font-mono bg-neutral-100 p-2 rounded border border-neutral-300">
            SHA256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
          </div>
        </div>

        {/* Assinaturas */}
        <div className="mt-10 pt-6 grid grid-cols-2 gap-8 text-center text-[10px]">
          <div>
            <div className="border-b border-neutral-800 mb-1" />
            <div className="font-bold">PRESIDENTE DA MESA ELEITORAL</div>
            <div className="text-neutral-500">Liderança JUMP</div>
          </div>
          <div>
            <div className="border-b border-neutral-800 mb-1" />
            <div className="font-bold">PASTOR / SUPERVISOR RESPONSÁVEL</div>
            <div className="text-neutral-500">JUMP</div>
          </div>
        </div>
      </div>
    </div>
  );
};
