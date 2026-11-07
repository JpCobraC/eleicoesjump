'use client';

import React, { useState } from 'react';
import { Eleitor } from '@/types/election';
import {
  salvarEleitor,
  removerEleitor,
  resetarStatusEleitores,
} from '@/services/electionService';
import {
  UserPlus,
  Trash2,
  RotateCcw,
  Copy,
  Check,
  Search,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface EleitoresManagerProps {
  eleitores: Eleitor[];
  onAtualizar: () => void;
}

export const EleitoresManager: React.FC<EleitoresManagerProps> = ({
  eleitores,
  onAtualizar,
}) => {
  const [busca, setBusca] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoCodigo, setNovoCodigo] = useState('');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim() || !novoCodigo.trim()) return;

    const novo: Eleitor = {
      id: `el-${Date.now()}`,
      nome: novoNome.trim(),
      codigo: novoCodigo.trim().toUpperCase(),
      votou: false,
    };

    await salvarEleitor(novo);
    setNovoNome('');
    setNovoCodigo('');
    onAtualizar();
  };

  const handleRemover = async (id: string, nome: string) => {
    if (confirm(`Remover eleitor(a) ${nome}?`)) {
      await removerEleitor(id);
      onAtualizar();
    }
  };

  const handleResetarStatus = async () => {
    if (
      confirm(
        'Deseja resetar o status de todos os eleitores para "Apto a Votar"? Use isso para um segundo turno ou novo teste.'
      )
    ) {
      await resetarStatusEleitores();
      onAtualizar();
    }
  };

  const handleGerarLote = async () => {
    const total = 10;
    const prefix = 'JUMP-';
    const startIdx = eleitores.length + 1;

    for (let i = 0; i < total; i++) {
      const idx = startIdx + i;
      const cod = `${prefix}${idx < 10 ? '0' : ''}${idx}`;
      await salvarEleitor({
        id: `el-lote-${Date.now()}-${i}`,
        nome: `Jovem Participante ${idx}`,
        codigo: cod,
        votou: false,
      });
    }
    onAtualizar();
  };

  const copiarCodigo = (codigo: string, id: string) => {
    navigator.clipboard.writeText(codigo);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const eleitoresFiltrados = eleitores.filter(
    (e) =>
      e.nome.toLowerCase().includes(busca.toLowerCase()) ||
      e.codigo.toLowerCase().includes(busca.toLowerCase())
  );

  const totalAptos = eleitores.length;
  const totalVotaram = eleitores.filter((e) => e.votou).length;

  return (
    <div className="space-y-6">
      {/* Barra de Ações e Resumo */}
      <div className="bg-neutral-800/80 p-5 rounded-2xl border border-neutral-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            Eleitores Cadastrados (Jovens)
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Comparecimento atual: <strong>{totalVotaram}</strong> de{' '}
            <strong>{totalAptos}</strong> jovens (
            {totalAptos > 0 ? Math.round((totalVotaram / totalAptos) * 100) : 0}%)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGerarLote}
            className="flex items-center gap-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
            title="Gera 10 novos códigos sequenciais automaticamente"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Gerar +10 Códigos</span>
          </button>

          <button
            type="button"
            onClick={handleResetarStatus}
            className="flex items-center gap-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
            title="Reseta o status de todos para 'Apto'"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
            <span>Resetar Status</span>
          </button>
        </div>
      </div>

      {/* Formulário de Cadastro Rápido de Novo Eleitor */}
      <form
        onSubmit={handleCadastrar}
        className="bg-neutral-800/90 p-4 rounded-xl border border-neutral-700/80 grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs items-end"
      >
        <div className="sm:col-span-6">
          <label className="block text-neutral-400 font-bold uppercase mb-1">
            Nome do Jovem / Membro:
          </label>
          <input
            type="text"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Ex: Samuel Santos"
            required
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="sm:col-span-4">
          <label className="block text-neutral-400 font-bold uppercase mb-1">
            Código / PIN de Votação:
          </label>
          <input
            type="text"
            value={novoCodigo}
            onChange={(e) => setNovoCodigo(e.target.value.toUpperCase())}
            placeholder="Ex: JUMP-11"
            required
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Adicionar</span>
          </button>
        </div>
      </form>

      {/* Campo de Busca */}
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar eleitor por nome ou código..."
          className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Tabela de Eleitores */}
      <div className="bg-neutral-800/90 rounded-2xl border border-neutral-700/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-900/80 text-neutral-400 border-b border-neutral-700 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Nome do Eleitor</th>
                <th className="py-3 px-4">Código / PIN</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-700/60 text-neutral-200">
              {eleitoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-neutral-400">
                    Nenhum eleitor encontrado.
                  </td>
                </tr>
              ) : (
                eleitoresFiltrados.map((el) => (
                  <tr key={el.id} className="hover:bg-neutral-700/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      {el.nome}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      <div className="inline-flex items-center gap-2">
                        <span>{el.codigo}</span>
                        <button
                          type="button"
                          onClick={() => copiarCodigo(el.codigo, el.id)}
                          className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          title="Copiar código para enviar no WhatsApp"
                        >
                          {copiadoId === el.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {el.votou ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 border border-emerald-700 text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Já Votou</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-950 border border-blue-700 text-blue-300">
                          <Clock className="w-3 h-3" />
                          <span>Apto a Votar</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemover(el.id, el.nome)}
                        className="p-1 rounded hover:bg-red-900/50 text-neutral-400 hover:text-red-300 transition-colors cursor-pointer"
                        title="Excluir eleitor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

