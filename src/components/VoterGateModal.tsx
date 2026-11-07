'use client';

import React, { useState } from 'react';
import { Eleitor } from '@/types/election';
import { validarEleitor } from '@/services/electionService';
import { UserCheck, ShieldCheck, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';

interface VoterGateModalProps {
  isOpen: boolean;
  onLiberarVotacao: (eleitor?: Eleitor) => void;
  codigoMesario: string;
  eleitoresDisponiveis: Eleitor[];
}

export const VoterGateModal: React.FC<VoterGateModalProps> = ({
  isOpen,
  onLiberarVotacao,
  codigoMesario,
  eleitoresDisponiveis,
}) => {
  const [codigoInput, setCodigoInput] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [aba, setAba] = useState<'codigo' | 'lista'>('codigo');

  if (!isOpen) return null;

  const handleValidarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const clean = codigoInput.trim().toUpperCase();
    if (!clean) {
      setErro('Digite o código do eleitor ou a senha do mesário.');
      return;
    }

    // Se digitou a senha do mesário, libera voto como avulso
    if (clean === codigoMesario.trim().toUpperCase()) {
      onLiberarVotacao();
      return;
    }

    setCarregando(true);
    try {
      const res = await validarEleitor(clean);
      if (res.valido && res.eleitor) {
        onLiberarVotacao(res.eleitor);
      } else {
        setErro(res.mensagem);
      }
    } catch {
      setErro('Erro ao verificar código. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const handleSelecionarDaLista = (eleitor: Eleitor) => {
    if (eleitor.votou) {
      setErro(`${eleitor.nome} já votou.`);
      return;
    }
    onLiberarVotacao(eleitor);
  };

  const aptos = eleitoresDisponiveis.filter((e) => !e.votou);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-neutral-200 overflow-hidden animate-scale-up">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 p-6 text-white text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/10 mb-3 backdrop-blur-sm">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-wide">
            Liberação da Cabine de Voto
          </h2>
          <p className="text-xs text-emerald-100 mt-1">
            Mesa Receptora / Mesário da Juventude
          </p>
        </div>

        {/* Abas */}
        <div className="flex border-b border-neutral-200 text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setAba('codigo');
              setErro(null);
            }}
            className={`flex-1 py-3 text-center transition-colors ${
              aba === 'codigo'
                ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Digitar Código / PIN
          </button>
          <button
            type="button"
            onClick={() => {
              setAba('lista');
              setErro(null);
            }}
            className={`flex-1 py-3 text-center transition-colors ${
              aba === 'lista'
                ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Lista de Jovens Aptos ({aptos.length})
          </button>
        </div>

        <div className="p-6">
          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {aba === 'codigo' ? (
            <form onSubmit={handleValidarCodigo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Código do Jovem ou PIN do Mesário:
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={codigoInput}
                    onChange={(e) => setCodigoInput(e.target.value)}
                    placeholder="Ex: JUMP-01 ou 1234"
                    autoFocus
                    className="w-full pl-11 pr-4 py-3 border-2 border-neutral-300 rounded-xl font-mono text-base uppercase tracking-wider focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 transition-all"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1.5">
                  Dica de teste: Use os códigos de exemplo (ex: <strong>JUMP-01</strong> até <strong>JUMP-10</strong>) ou a senha do mesário (<strong>{codigoMesario}</strong>).
                </p>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                <span>{carregando ? 'Validando...' : 'Liberar Urna para Votação'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {aptos.length === 0 ? (
                <div className="text-center py-6 text-neutral-500 text-xs">
                  Todos os jovens cadastrados já votaram!
                </div>
              ) : (
                aptos.map((eleitor) => (
                  <button
                    key={eleitor.id}
                    type="button"
                    onClick={() => handleSelecionarDaLista(eleitor)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 hover:border-emerald-500 hover:bg-emerald-50 text-left transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        {eleitor.nome[0]}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-neutral-800 group-hover:text-emerald-900">
                          {eleitor.nome}
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400">
                          Código: {eleitor.codigo}
                        </div>
                      </div>
                    </div>
                    <UserCheck className="w-4 h-4 text-neutral-300 group-hover:text-emerald-600" />
                  </button>
                ))
              )}
            </div>
          )}

          {/* Atalho de Demonstração Rápida */}
          <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-[11px] text-neutral-500">
              Modo Teste / Demonstração:
            </span>
            <button
              type="button"
              onClick={() => onLiberarVotacao()}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
            >
              Liberar Voto Avulso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

