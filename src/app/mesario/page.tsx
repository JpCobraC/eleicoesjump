'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  Clock,
  ChevronLeft,
  RefreshCw,
  UserCheck,
  Church,
  ExternalLink,
} from 'lucide-react';
import { Cargo, ConfiguracaoEleicao, Eleitor } from '@/types/election';
import {
  getConfiguracao,
  getCargos,
  getEleitores,
  initializeLocalStorage,
} from '@/services/electionService';

export default function MesarioPage() {
  const [carregando, setCarregando] = useState(true);
  const [copiadoCodigo, setCopiadoCodigo] = useState<string | null>(null);
  const [config, setConfig] = useState<ConfiguracaoEleicao | null>(null);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [eleitores, setEleitores] = useState<Eleitor[]>([]);
  const [busca, setBusca] = useState('');
  const [eleitorLiberado, setEleitorLiberado] = useState<Eleitor | null>(null);

  const carregarDados = async () => {
    initializeLocalStorage();
    try {
      const [cfg, cgs, elts] = await Promise.all([
        getConfiguracao(),
        getCargos(),
        getEleitores(),
      ]);
      setConfig(cfg);
      setCargos(cgs);
      setEleitores(elts);
    } catch (e) {
      console.error('Erro ao carregar dados do mesário:', e);
    }
  };

  useEffect(() => {
    let ativo = true;

    const init = async () => {
      setCarregando(true);
      initializeLocalStorage();
      try {
        const [cfg, cgs, elts] = await Promise.all([
          getConfiguracao(),
          getCargos(),
          getEleitores(),
        ]);
        if (ativo) {
          setConfig(cfg);
          setCargos(cgs);
          setEleitores(elts);
        }
      } catch (e) {
        console.error('Erro:', e);
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    init();

    const interval = setInterval(() => {
      carregarDados();
    }, 4000);

    return () => {
      ativo = false;
      clearInterval(interval);
    };
  }, []);

  const copiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    setCopiadoCodigo(codigo);
    setTimeout(() => setCopiadoCodigo(null), 2000);
  };

  const handleLiberarEleitor = async (el: Eleitor) => {
    setEleitorLiberado(el);
    copiarCodigo(el.codigo);
  };

  const cargoAtivoObj = cargos.find((c) => c.id === config?.cargo_ativo_id) || cargos[0];

  const eleitoresFiltrados = eleitores.filter(
    (e) =>
      e.nome.toLowerCase().includes(busca.toLowerCase()) ||
      e.codigo.toLowerCase().includes(busca.toLowerCase())
  );

  const totalAptos = eleitores.length;
  const totalVotaram = eleitores.filter((e) => e.votou).length;
  const totalPendentes = totalAptos - totalVotaram;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans select-none">
      {/* Topo do Mesário */}
      <header className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Voltar ao Painel Geral"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Painel</span>
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
                <Church className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm md:text-base font-black uppercase text-white tracking-wider leading-none">
                  Mesa Receptora / Mesário
                </h1>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Controle de chamada dos eleitores e liberação de cabine
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={carregarDados}
              className={`p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer ${
                carregando ? 'opacity-50 animate-spin' : ''
              }`}
              title="Atualizar lista"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir Urna</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* BANNER DO CARGO EM DISPUTA */}
        <div className="bg-gradient-to-r from-emerald-950/70 to-neutral-900 border border-emerald-700/60 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Votação em Andamento</span>
            </div>
            <h2 className="text-xl md:text-3xl font-black text-white uppercase">
              {cargoAtivoObj?.nome || 'DIRETORIA'}
            </h2>
            <p className="text-xs text-neutral-300 mt-0.5">
              Identifique o jovem na lista abaixo e informe seu código para votar na urna.
            </p>
          </div>

          {/* Estatística rápida de comparecimento */}
          <div className="flex items-center gap-3">
            <div className="bg-neutral-950/80 border border-neutral-800 px-4 py-3 rounded-2xl text-center">
              <div className="text-[10px] font-mono text-neutral-400 uppercase font-bold">
                Já Votaram
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-0.5">
                {totalVotaram}
              </div>
            </div>

            <div className="bg-neutral-950/80 border border-neutral-800 px-4 py-3 rounded-2xl text-center">
              <div className="text-[10px] font-mono text-neutral-400 uppercase font-bold">
                Aguardando
              </div>
              <div className="text-2xl font-black text-amber-400 mt-0.5">
                {totalPendentes}
              </div>
            </div>
          </div>
        </div>

        {/* ALERTA DE ELEITOR LIBERADO */}
        {eleitorLiberado && (
          <div className="p-4 bg-emerald-950/80 border-2 border-emerald-500 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-scale-up shadow-xl shadow-emerald-950/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-white font-bold text-sm">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-mono text-emerald-300 font-bold uppercase">
                  Código de Liberação Copiado!
                </div>
                <div className="text-base font-black text-white uppercase">
                  {eleitorLiberado.nome}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-neutral-950 px-4 py-2 rounded-xl font-mono text-xl font-black text-emerald-400 border border-emerald-700 select-all">
                {eleitorLiberado.codigo}
              </div>
              <button
                type="button"
                onClick={() => setEleitorLiberado(null)}
                className="text-xs text-neutral-400 hover:text-white px-2 py-1 font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* BUSCA DE ELEITORES */}
        <div className="relative">
          <Search className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar jovem por nome ou código (ex: Ana Clara, JUMP-01)..."
            className="w-full pl-12 pr-4 py-3.5 bg-neutral-900 border border-neutral-800 rounded-2xl text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-emerald-500 shadow-lg"
          />
        </div>

        {/* LISTA DE ELEITORES PARA A MESA */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="py-3.5 px-5">Nome do Jovem</th>
                  <th className="py-3.5 px-5">Código / Título</th>
                  <th className="py-3.5 px-5 text-center">Status Nesta Votação</th>
                  <th className="py-3.5 px-5 text-right">Ação do Mesário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80 text-neutral-200">
                {eleitoresFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-neutral-500">
                      Nenhum jovem encontrado com este nome ou código.
                    </td>
                  </tr>
                ) : (
                  eleitoresFiltrados.map((el) => (
                    <tr
                      key={el.id}
                      className={`hover:bg-neutral-800/40 transition-colors ${
                        el.votou ? 'opacity-60 bg-neutral-950/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-5 font-bold text-white text-sm">
                        {el.nome}
                      </td>
                      <td className="py-3.5 px-5 font-mono font-bold text-emerald-400">
                        {el.codigo}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        {el.votou ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-950 border border-emerald-700/60 text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Já Votou</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-950 border border-blue-700/60 text-blue-300">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Apto a Votar</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {!el.votou ? (
                          <button
                            type="button"
                            onClick={() => handleLiberarEleitor(el)}
                            className={`inline-flex items-center gap-1.5 font-bold py-1.5 px-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md ${
                              copiadoCodigo === el.codigo
                                ? 'bg-emerald-500 text-black'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{copiadoCodigo === el.codigo ? 'Copiado!' : 'Chamar / Liberar'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-neutral-500 font-mono italic">
                            Voto computado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Rodapé */}
      <footer className="text-center text-[11px] text-neutral-500 py-4 border-t border-neutral-900">
        Painel da Mesa Receptora • Eleições da Juventude
      </footer>
    </div>
  );
}
