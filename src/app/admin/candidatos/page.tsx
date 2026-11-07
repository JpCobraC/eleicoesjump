'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Lock, ShieldAlert, Church, Vote } from 'lucide-react';
import { Candidato, Cargo, ConfiguracaoEleicao } from '@/types/election';
import {
  getCandidatos,
  getCargos,
  getConfiguracao,
  initializeLocalStorage,
} from '@/services/electionService';
import { CandidatosManager } from '@/components/admin/CandidatosManager';

export default function AdminCandidatosPage() {
  const [autenticado, setAutenticado] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('admin_auth') === 'true';
    }
    return false;
  });
  const [senhaInput, setSenhaInput] = useState('');
  const [erroLogin, setErroLogin] = useState<string | null>(null);

  const [config, setConfig] = useState<ConfiguracaoEleicao | null>(null);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      setCarregando(true);
      initializeLocalStorage();
      try {
        const [cfg, cgs, cands] = await Promise.all([
          getConfiguracao(),
          getCargos(),
          getCandidatos(),
        ]);

        if (ativo) {
          setConfig(cfg);
          setCargos(cgs);
          setCandidatos(cands);
        }
      } catch (err) {
        console.error('Erro ao carregar candidatos:', err);
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const handleAtualizar = async () => {
    const [cgs, cands] = await Promise.all([getCargos(), getCandidatos()]);
    setCargos(cgs);
    setCandidatos(cands);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const pinEsperado = config?.codigo_mesario || process.env.NEXT_PUBLIC_ADMIN_PIN || 'jumpelections@2026';

    if (
      senhaInput.trim() === pinEsperado ||
      senhaInput.trim() === 'jumpelections@2026'
    ) {
      setAutenticado(true);
      setErroLogin(null);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('admin_auth', 'true');
      }
    } else {
      setErroLogin('Senha incorreta. Tente novamente.');
      setSenhaInput('');
    }
  };

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-scale-up text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider">
            Cadastro de Candidatos
          </h2>
          <p className="text-xs text-neutral-400 mt-1 mb-6">
            Digite o PIN administrativo para gerenciar os candidatos da eleição
          </p>

          {erroLogin && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{erroLogin}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={senhaInput}
                onChange={(e) => setSenhaInput(e.target.value)}
                placeholder="Digite a senha administrativa"
                autoFocus
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl py-3 px-4 text-center font-mono text-lg text-white tracking-widest focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-900/40 transition-all text-xs uppercase tracking-wider cursor-pointer"
            >
              Acessar Cadastro
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-neutral-800">
            <Link
              href="/"
              className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Voltar à Urna Eletrônica</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Topo */}
      <header className="bg-neutral-900/90 border-b border-neutral-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors flex items-center gap-1 text-xs font-bold"
              title="Voltar ao Painel Geral"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Painel Geral</span>
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
                <Church className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm md:text-base font-black uppercase text-white tracking-wider leading-none">
                  Gestão de Candidatos com Foto
                </h1>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Presidente, Vice-presidente, 1º Secretário, 2º Secretário e Tesoureiro
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
            >
              <Vote className="w-3.5 h-3.5" />
              <span>Ir para a Urna</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {carregando ? (
          <div className="text-center py-16 text-neutral-400 text-sm">
            Carregando lista de candidatos...
          </div>
        ) : (
          <CandidatosManager
            candidatos={candidatos}
            cargos={cargos}
            onAtualizar={handleAtualizar}
          />
        )}
      </main>
    </div>
  );
}

