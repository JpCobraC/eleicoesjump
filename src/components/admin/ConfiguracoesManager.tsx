'use client';

import React, { useState } from 'react';
import { ConfiguracaoEleicao } from '@/types/election';
import { updateConfiguracao, zerarVotacao } from '@/services/electionService';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  Save,
  Trash2,
  Database,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface ConfiguracoesManagerProps {
  config: ConfiguracaoEleicao | null;
  onAtualizar: () => void;
}

export const ConfiguracoesManager: React.FC<ConfiguracoesManagerProps> = ({
  config,
  onAtualizar,
}) => {
  const [titulo, setTitulo] = useState(config?.titulo || '');
  const [igreja, setIgreja] = useState(config?.igreja || '');
  const [subtitulo, setSubtitulo] = useState(config?.subtitulo || '');
  const [status, setStatus] = useState<'aguardando' | 'aberta' | 'encerrada'>(
    config?.status || 'aberta'
  );
  const [exigirCodigo, setExigirCodigo] = useState(
    config?.exigir_codigo_eleitor ?? true
  );
  const [codigoMesario, setCodigoMesario] = useState(
    config?.codigo_mesario || '1234'
  );
  const [modoVotacao, setModoVotacao] = useState<'sequencial_um_por_vez' | 'todos_juntos'>(
    config?.modo_votacao || 'sequencial_um_por_vez'
  );
  const [salvando, setSalvando] = useState(false);
  const [salvoComSucesso, setSalvoComSucesso] = useState(false);
  const [copiouSql, setCopiouSql] = useState(false);

  const supabaseAtivo = isSupabaseConfigured();

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    await updateConfiguracao({
      titulo,
      igreja,
      subtitulo,
      status,
      exigir_codigo_eleitor: exigirCodigo,
      codigo_mesario: codigoMesario,
      modo_votacao: modoVotacao,
    });
    setSalvando(false);
    setSalvoComSucesso(true);
    setTimeout(() => setSalvoComSucesso(false), 2500);
    onAtualizar();
  };

  const handleZerarVotos = async () => {
    const confirmacao1 = confirm(
      'ATENÇÃO: Deseja ZERAR todos os votos registrados e resetar os eleitores? Esta ação é irreversível e geralmente feita antes de iniciar a votação oficial (Zerésima).'
    );
    if (!confirmacao1) return;

    const confirmacao2 = prompt(
      'Para confirmar, digite a palavra ZERAR em maiúsculo:'
    );
    if (confirmacao2 === 'ZERAR') {
      await zerarVotacao();
      alert('Votação zerada com sucesso! A urna está pronta para a eleição oficial.');
      onAtualizar();
    }
  };

  const copiarInstrucoesSql = () => {
    const sqlScript = `-- Script de Configuração Supabase:
-- Acesse o SQL Editor do seu projeto Supabase e cole o conteúdo de /supabase/schema.sql
-- Ou clone o repositório e execute a migração.`;
    navigator.clipboard.writeText(sqlScript);
    setCopiouSql(true);
    setTimeout(() => setCopiouSql(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Status da Integração com o Supabase */}
      <div
        className={`p-5 rounded-2xl border ${supabaseAtivo
            ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
            : 'bg-amber-950/40 border-amber-600/50 text-amber-200'
          }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2 rounded-xl shrink-0 ${supabaseAtivo ? 'bg-emerald-800 text-white' : 'bg-amber-800 text-white'
              }`}
          >
            <Database className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span>
                {supabaseAtivo
                  ? 'Supabase Conectado e Operacional'
                  : 'Modo Demonstração / Armazenamento Local (LocalStorage)'}
              </span>
              {supabaseAtivo && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </h4>
            <p className="text-xs opacity-90">
              {supabaseAtivo
                ? 'Todos os votos, candidatos e eleitores estão sendo sincronizados e protegidos em tempo real no banco PostgreSQL do Supabase.'
                : 'A aplicação está funcionando no modo local do navegador para testes imediatos. Para sincronizar votos entre múltiplos dispositivos na Vercel, conecte seu projeto Supabase gratuito.'}
            </p>
          </div>
        </div>

        {/* Guia Rápido de Configuração Vercel + Supabase */}
        {!supabaseAtivo && (
          <div className="mt-4 pt-4 border-t border-amber-600/30 text-xs space-y-2 text-neutral-300">
            <div className="font-bold text-white uppercase text-[11px] tracking-wider">
              Como Conectar ao Supabase & Vercel (3 Passos Rápidos):
            </div>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[11px]">
              <li>
                Crie um projeto grátis no{' '}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 underline font-bold inline-flex items-center gap-0.5"
                >
                  supabase.com <ExternalLink className="w-3 h-3 inline" />
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span>
                  Vá no <strong>SQL Editor</strong> do Supabase e execute o script{' '}
                  <code className="text-amber-300 font-mono">supabase/schema.sql</code>
                </span>
                <button
                  type="button"
                  onClick={copiarInstrucoesSql}
                  className="px-2 py-0.5 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  title="Copiar comando"
                >
                  {copiouSql ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </li>
              <li>
                Adicione as variáveis de ambiente na Vercel (ou no arquivo{' '}
                <code className="text-amber-300 font-mono">.env.local</code>):
                <div className="bg-neutral-900 p-2.5 rounded-lg font-mono text-[10px] mt-1 text-emerald-400 select-all border border-neutral-700">
                  NEXT_PUBLIC_SUPABASE_URL=https://seu-id.supabase.co
                  <br />
                  NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
                </div>
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Formulário de Configuração Geral */}
      <form
        onSubmit={handleSalvar}
        className="bg-neutral-800/90 border border-neutral-700/80 rounded-2xl p-6 space-y-5 text-xs shadow-xl"
      >
        <div className="border-b border-neutral-700/80 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              Dados da Eleição e Juventude
            </h3>
            <p className="text-neutral-400 text-xs">
              Personalize os nomes exibidos na tela da urna e nos relatórios impressos.
            </p>
          </div>
          {salvoComSucesso && (
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-700/60 px-3 py-1 rounded-full animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvo com sucesso!</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-neutral-400 font-bold uppercase mb-1">
              Nome da Igreja / Ministério:
            </label>
            <input
              type="text"
              value={igreja}
              onChange={(e) => setIgreja(e.target.value)}
              placeholder="Ex: Igreja Batista Memorial - Juventude JUMP"
              required
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-neutral-400 font-bold uppercase mb-1">
              Título Oficial da Eleição:
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Eleições Juventude JUMP 2026"
              required
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-neutral-400 font-bold uppercase mb-1">
            Subtítulo / Mensagem aos Jovens:
          </label>
          <input
            type="text"
            value={subtitulo}
            onChange={(e) => setSubtitulo(e.target.value)}
            placeholder="Ex: Escolha com oração e sabedoria a nova liderança para o próximo ano"
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {/* Formato da Eleição */}
          <div>
            <label className="block text-neutral-400 font-bold uppercase mb-1">
              Formato da Eleição:
            </label>
            <select
              value={modoVotacao}
              onChange={(e) =>
                setModoVotacao(
                  e.target.value as 'sequencial_um_por_vez' | 'todos_juntos'
                )
              }
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="sequencial_um_por_vez">
                ⭐ 1 Cargo por Vez (Sequencial com Eliminação)
              </option>
              <option value="todos_juntos">
                Todos os 5 Cargos Juntos na Mesma Cabine
              </option>
            </select>
          </div>

          {/* Status da Eleição */}
          <div>
            <label className="block text-neutral-400 font-bold uppercase mb-1">
              Status da Eleição:
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as 'aguardando' | 'aberta' | 'encerrada')
              }
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="aberta">🟢 Votação Aberta (Em andamento)</option>
              <option value="aguardando">🟡 Aguardando Início (Pausada)</option>
              <option value="encerrada">🔴 Eleição Encerrada (Finalizada)</option>
            </select>
          </div>

          {/* Modo de Controle de Acesso */}
          <div>
            <label className="block text-neutral-400 font-bold uppercase mb-1">
              Modo da Cabine de Voto:
            </label>
            <select
              value={exigirCodigo ? 'sim' : 'nao'}
              onChange={(e) => setExigirCodigo(e.target.value === 'sim')}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="sim">
                🔒 Exigir Código / Liberação do Mesário
              </option>
              <option value="nao">
                🔓 Terminal Livre (Qualquer jovem vota direto)
              </option>
            </select>
          </div>

          {/* Senha do Mesário */}
          <div>
            <label className="block text-neutral-400 font-bold uppercase mb-1">
              PIN / Senha do Mesário:
            </label>
            <input
              type="text"
              value={codigoMesario}
              onChange={(e) => setCodigoMesario(e.target.value)}
              placeholder="Ex: 1234"
              required
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-700/80 flex justify-end">
          <button
            type="submit"
            disabled={salvando}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition-all uppercase tracking-wider cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{salvando ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </form>

      {/* Zona de Perigo / Zerésima */}
      <div className="bg-red-950/20 border border-red-900/60 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Zerar Votação (Zerésima Oficial)</span>
            </h4>
            <p className="text-xs text-neutral-400 max-w-xl">
              Esta ação apaga todos os votos registrados no sistema e redefine o status
              de todos os eleitores para &quot;Apto a Votar&quot;. Deve ser executada antes de
              iniciar a eleição real no culto ou após testes de demonstração.
            </p>
          </div>
          <button
            type="button"
            onClick={handleZerarVotos}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition-all text-xs uppercase tracking-wider shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Zerar Todos os Votos</span>
          </button>
        </div>
      </div>
    </div>
  );
};
