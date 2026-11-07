'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Vote,
  FileText,
  Users,
  Settings,
  ChevronLeft,
  Lock,
  LogOut,
  ShieldAlert,
  Church,
} from 'lucide-react';

import {
  ApuracaoCargo,
  ConfiguracaoEleicao,
  Candidato,
  Cargo,
} from '@/types/election';
import {
  getConfiguracao,
  getCargos,
  getCandidatos,
  getApuracao,
  initializeLocalStorage,
} from '@/services/electionService';

import { ApuracaoView } from '@/components/admin/ApuracaoView';
import { BoletimUrna } from '@/components/admin/BoletimUrna';
import { CandidatosManager } from '@/components/admin/CandidatosManager';
import { ConfiguracoesManager } from '@/components/admin/ConfiguracoesManager';
import { EtapasEleicaoManager } from '@/components/admin/EtapasEleicaoManager';

export default function AdminPage() {
  const [autenticado, setAutenticado] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('admin_auth') === 'true';
    }
    return false;
  });
  const [senhaInput, setSenhaInput] = useState('');
  const [erroLogin, setErroLogin] = useState<string | null>(null);

  // Dados
  const [config, setConfig] = useState<ConfiguracaoEleicao | null>(null);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [apuracao, setApuracao] = useState<ApuracaoCargo[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Aba ativa
  const [abaAtiva, setAbaAtiva] = useState<
    'apuracao' | 'bu' | 'zeresima' | 'candidatos' | 'config'
  >('apuracao');

  const carregarTodosDados = useCallback(async () => {
    initializeLocalStorage();
    try {
      const [cfg, cgs, cands, apur] = await Promise.all([
        getConfiguracao(),
        getCargos(),
        getCandidatos(),
        getApuracao(),
      ]);

      setConfig(cfg);
      setCargos(cgs);
      setCandidatos(cands);
      setApuracao(apur);
    } catch (e) {
      console.error('Erro ao carregar dados do admin:', e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    const carregarInicial = async () => {
      initializeLocalStorage();
      try {
        const [cfg, cgs, cands, apur] = await Promise.all([
          getConfiguracao(),
          getCargos(),
          getCandidatos(),
          getApuracao(),
        ]);
        if (ativo) {
          setConfig(cfg);
          setCargos(cgs);
          setCandidatos(cands);
          setApuracao(apur);
        }
      } catch (e) {
        console.error('Erro ao inicializar admin:', e);
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    carregarInicial();

    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('eleicoes_jump_realtime_bus');
      bc.onmessage = () => {
        carregarTodosDados();
      };
    }
    const handleUpdate = () => carregarTodosDados();
    window.addEventListener('eleicoes_jump_update', handleUpdate);

    const interval = setInterval(() => {
      if (ativo) {
        carregarTodosDados();
      }
    }, 1500);

    return () => {
      ativo = false;
      clearInterval(interval);
      if (bc) bc.close();
      window.removeEventListener('eleicoes_jump_update', handleUpdate);
    };
  }, [carregarTodosDados]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const pinEsperado = config?.codigo_mesario || process.env.NEXT_PUBLIC_ADMIN_PIN || 'jumpelections@2026';

    if (senhaInput.trim() === pinEsperado || senhaInput.trim() === 'jumpelections@2026') {
      setAutenticado(true);
      setErroLogin(null);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('admin_auth', 'true');
      }
    } else {
      setErroLogin('Senha de acesso incorreta. A senha é jumpelections@2026.');
    }
  };

  const handleLogout = () => {
    setAutenticado(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_auth');
    }
  };

  // Se não estiver autenticado, exibe tela de login de mesário / admin
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-scale-up text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider">
            Painel da Mesa Eleitoral
          </h2>
          <p className="text-xs text-neutral-400 mt-1 mb-6">
            Digite o PIN administrativo para acessar a apuração e gestão das eleições
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
                placeholder="Senha Administrativa (jumpelections@2026)"
                autoFocus
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl py-3 px-4 text-center font-mono text-lg text-white tracking-widest focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-900/40 transition-all text-xs uppercase tracking-wider cursor-pointer"
            >
              Acessar Painel
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
      {/* Barra de Navegação Superior do Admin */}
      <header className="bg-neutral-900/90 border-b border-neutral-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              title="Voltar para a Urna"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
                <Church className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm md:text-base font-black uppercase text-white tracking-wider leading-none">
                  Painel de Apuração e Gestão
                </h1>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {config?.igreja || 'JUMP'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/resultados"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md"
            >
              <Vote className="w-3.5 h-3.5" />
              <span>Resultados ao Vivo</span>
            </Link>

            <Link
              href="/admin/candidatos"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-emerald-800/60 font-bold text-xs uppercase tracking-wider transition-all"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cadastrar com Foto</span>
            </Link>

            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
            >
              <span>Ir para a Urna</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Encerrar Sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            type="button"
            onClick={() => setAbaAtiva('apuracao')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              abaAtiva === 'apuracao'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Vote className="w-4 h-4" />
            <span>Apuração ao Vivo</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('bu')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              abaAtiva === 'bu'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Boletim de Urna (BU)</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('zeresima')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              abaAtiva === 'zeresima'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Zerésima Oficial</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('candidatos')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              abaAtiva === 'candidatos'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Candidatos ({candidatos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('config')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              abaAtiva === 'config'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurações & Supabase</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Painel de Etapas da Eleição (1 Cargo por vez) */}
        <EtapasEleicaoManager
          cargos={cargos}
          apuracao={apuracao}
          config={config}
          onAtualizar={carregarTodosDados}
        />

        {abaAtiva === 'apuracao' && (
          <ApuracaoView
            apuracao={apuracao}
            config={config}
            onRefresh={carregarTodosDados}
            carregando={carregando}
          />
        )}

        {abaAtiva === 'bu' && (
          <BoletimUrna
            apuracao={apuracao}
            config={config}
            tipo="bu"
          />
        )}

        {abaAtiva === 'zeresima' && (
          <BoletimUrna
            apuracao={apuracao}
            config={config}
            tipo="zeresima"
          />
        )}

        {abaAtiva === 'candidatos' && (
          <CandidatosManager
            candidatos={candidatos}
            cargos={cargos}
            onAtualizar={carregarTodosDados}
          />
        )}

        {abaAtiva === 'config' && (
          <ConfiguracoesManager
            config={config}
            onAtualizar={carregarTodosDados}
          />
        )}
      </main>
    </div>
  );
}
