'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Candidato, Cargo } from '@/types/election';
import { salvarCandidato, removerCandidato } from '@/services/electionService';
import {
  Trash2,
  Edit3,
  UserPlus,
  X,
  Upload,
  Link as LinkIcon,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface CandidatosManagerProps {
  candidatos: Candidato[];
  cargos: Cargo[];
  onAtualizar: () => void;
}

export const CandidatosManager: React.FC<CandidatosManagerProps> = ({
  candidatos,
  cargos,
  onAtualizar,
}) => {
  const [modalAberto, setModalAberto] = useState(false);
  const [candidatoEditando, setCandidatoEditando] = useState<Candidato | null>(null);

  // Campos do formulário
  const [cargoId, setCargoId] = useState(cargos[0]?.id || '');
  const [numero, setNumero] = useState('');
  const [nome, setNome] = useState('');
  const [nomeVice, setNomeVice] = useState('');
  const [chapa, setChapa] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [descricao, setDescricao] = useState('');
  const [outrosCargos, setOutrosCargos] = useState<string[]>([]);
  const [modoFoto, setModoFoto] = useState<'upload' | 'url'>('upload');
  const [previewErro, setPreviewErro] = useState(false);
  const [processandoFoto, setProcessandoFoto] = useState(false);

  // Filtro
  const [filtroCargo, setFiltroCargo] = useState<string>('todos');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processa upload de arquivo de imagem local e converte para JPEG otimizado
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP).');
      return;
    }

    setProcessandoFoto(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Redimensiona para formato padrão da urna (máx 400x500px, 3:4)
        const canvas = document.createElement('canvas');
        const maxW = 400;
        const maxH = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxW) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          }
        } else {
          if (height > maxH) {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setFotoUrl(dataUrl);
          setPreviewErro(false);
        }
        setProcessandoFoto(false);
      };
      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const abrirModalCriar = (cargoPreSelecionado?: string) => {
    setCandidatoEditando(null);
    setCargoId(cargoPreSelecionado || cargos[0]?.id || '');
    setNumero('');
    setNome('');
    setNomeVice('');
    setChapa('CHAPA 1');
    setFotoUrl('');
    setDescricao('');
    setOutrosCargos([]);
    setPreviewErro(false);
    setModalAberto(true);
  };

  const abrirModalEditar = (cand: Candidato) => {
    setCandidatoEditando(cand);
    setCargoId(cand.cargo_id);
    setNumero(cand.numero);
    setNome(cand.nome);
    setNomeVice(cand.nome_vice || '');
    setChapa(cand.chapa);
    setFotoUrl(cand.foto_url || '');
    setDescricao(cand.descricao || '');
    setPreviewErro(false);
    setModalAberto(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanNumero = numero.trim();
    const cleanNome = nome.trim().toUpperCase();

    if (!cleanNumero || !cleanNome || !cargoId) {
      alert('Por favor, preencha cargo, número e nome do candidato.');
      return;
    }

    // Verifica se já existe outro candidato com o mesmo número no mesmo cargo
    const numeroExistente = candidatos.find(
      (c) =>
        c.cargo_id === cargoId &&
        c.numero === cleanNumero &&
        c.id !== candidatoEditando?.id
    );

    if (numeroExistente) {
      alert(
        `O número ${cleanNumero} já está sendo usado pelo candidato ${numeroExistente.nome} para este mesmo cargo!`
      );
      return;
    }

    const novoCandidato: Candidato = {
      id: candidatoEditando ? candidatoEditando.id : `cand-${Date.now()}`,
      cargo_id: cargoId,
      numero: cleanNumero,
      nome: cleanNome,
      nome_vice: nomeVice.trim() ? nomeVice.trim().toUpperCase() : undefined,
      chapa: chapa.trim().toUpperCase() || 'CHAPA GERAL',
      foto_url: fotoUrl.trim() || undefined,
      descricao: descricao.trim() || undefined,
    };

    await salvarCandidato(novoCandidato);

    // Se selecionou concorrer também em outros cargos (apenas no modo de cadastro)
    if (!candidatoEditando && outrosCargos.length > 0) {
      for (const extraCargoId of outrosCargos) {
        let numToUse = cleanNumero;
        let n = parseInt(cleanNumero, 10) || 10;
        // Evita colisão de número se o mesmo número já estiver ocupado no outro cargo
        while (candidatos.some((c) => c.cargo_id === extraCargoId && c.numero === numToUse)) {
          n++;
          numToUse = String(n);
        }

        await salvarCandidato({
          id: `cand-${Date.now()}-${extraCargoId}`,
          cargo_id: extraCargoId,
          numero: numToUse,
          nome: cleanNome,
          nome_vice: nomeVice.trim() ? nomeVice.trim().toUpperCase() : undefined,
          chapa: chapa.trim().toUpperCase() || 'CHAPA GERAL',
          foto_url: fotoUrl.trim() || undefined,
          descricao: descricao.trim() || undefined,
        });
      }
    }

    setModalAberto(false);
    onAtualizar();
  };

  const handleRemover = async (id: string, nomeCand: string) => {
    if (confirm(`Tem certeza que deseja excluir o(a) candidato(a) ${nomeCand}?`)) {
      await removerCandidato(id);
      onAtualizar();
    }
  };

  const cargoSelecionadoObj = cargos.find((c) => c.id === cargoId);

  return (
    <div className="space-y-6">
      {/* Barra de Topo com Filtros por Cargo e Botão Novo */}
      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span>Candidatos Cadastrados</span>
            <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-0.5 rounded-full font-mono">
              {candidatos.length} no total
            </span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Cadastre os jovens que concorrem a Presidente, Vice, Secretários e Tesoureiro com foto e número.
          </p>
        </div>

        <button
          type="button"
          onClick={() => abrirModalCriar()}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-xl shadow-lg shadow-emerald-900/30 transition-all text-xs uppercase tracking-wider cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Candidato</span>
        </button>
      </div>

      {/* Abas Rápidas dos 5 Cargos Oficiais */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs font-bold">
        <button
          type="button"
          onClick={() => setFiltroCargo('todos')}
          className={`py-2 px-3.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
            filtroCargo === 'todos'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/30'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
          }`}
        >
          Todos os Cargos ({candidatos.length})
        </button>

        {cargos.map((cargo) => {
          const totalNoCargo = candidatos.filter((c) => c.cargo_id === cargo.id).length;
          const isAtivo = filtroCargo === cargo.id;

          return (
            <button
              key={cargo.id}
              type="button"
              onClick={() => setFiltroCargo(cargo.id)}
              className={`py-2 px-3.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                isAtivo
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/30'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
            >
              <span>{cargo.nome}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isAtivo ? 'bg-emerald-800 text-white' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {totalNoCargo}
              </span>
            </button>
          );
        })}
      </div>

      {/* Listagem em Cards por Cargo */}
      {cargos
        .filter((c) => filtroCargo === 'todos' || filtroCargo === c.id)
        .map((cargo) => {
          const candidatosDoCargo = candidatos.filter((cand) => cand.cargo_id === cargo.id);

          return (
            <div
              key={cargo.id}
              className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4"
            >
              {/* Cabeçalho do Cargo */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div>
                  <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">
                    Cargo {cargo.ordem} ({cargo.digitos} dígitos)
                  </div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    {cargo.nome}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => abrirModalCriar(cargo.id)}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Adicionar {cargo.nome}</span>
                </button>
              </div>

              {/* Grid de Candidatos deste Cargo */}
              {candidatosDoCargo.length === 0 ? (
                <div className="py-8 text-center text-neutral-500 text-xs border border-dashed border-neutral-800 rounded-xl">
                  Nenhum candidato cadastrado para este cargo ainda. Clique em &quot;Adicionar&quot; acima para cadastrar o primeiro!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {candidatosDoCargo.map((cand) => (
                    <div
                      key={cand.id}
                      className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between hover:border-neutral-700 transition-all group"
                    >
                      <div>
                        <div className="flex items-start gap-3.5 mb-3">
                          {/* Foto 3:4 estilo Urna */}
                          <div className="relative w-20 h-24 rounded-lg overflow-hidden bg-neutral-900 border-2 border-neutral-700 shrink-0 shadow-md">
                            {cand.foto_url ? (
                              <Image
                                src={cand.foto_url}
                                alt={cand.nome}
                                fill
                                sizes="90px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center font-bold text-neutral-500 text-xs text-center p-1">
                                <span className="text-2xl mb-1">👤</span>
                                <span>Sem Foto</span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="inline-block px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-300 font-mono font-black text-xs mb-1">
                              Nº {cand.numero}
                            </span>
                            <h4 className="text-sm font-black text-white uppercase leading-snug truncate">
                              {cand.nome}
                            </h4>
                            {cand.nome_vice && (
                              <p className="text-[11px] text-neutral-400 truncate">
                                Vice: <strong className="text-neutral-300">{cand.nome_vice}</strong>
                              </p>
                            )}
                            <p className="text-xs font-semibold text-emerald-400 mt-0.5 truncate">
                              {cand.chapa}
                            </p>
                          </div>
                        </div>

                        {cand.descricao && (
                          <p className="text-xs text-neutral-400 line-clamp-2 italic mb-2">
                            &quot;{cand.descricao}&quot;
                          </p>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-neutral-500 font-mono">
                          ID: {cand.id.slice(0, 10)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirModalEditar(cand)}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
                            title="Editar candidato"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemover(cand.id, cand.nome)}
                            className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 transition-colors cursor-pointer"
                            title="Excluir candidato"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

      {/* MODAL DE CADASTRO / EDIÇÃO COM UPLOAD E PRÉVIA NA URNA */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl animate-scale-up my-6">
            {/* Topo do Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-5">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">
                  {candidatoEditando ? 'Editar Candidato' : 'Cadastrar Novo Candidato'}
                </h3>
                <p className="text-xs text-neutral-400">
                  Preencha os dados e anexe a foto que aparecerá na tela da urna.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* LADO ESQUERDO: DADOS PESSOAIS */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-neutral-300 font-bold uppercase mb-1">
                      Cargo em Disputa:
                    </label>
                    <select
                      value={cargoId}
                      onChange={(e) => setCargoId(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-emerald-500 text-sm"
                    >
                      {cargos.map((cargo) => (
                        <option key={cargo.id} value={cargo.id}>
                          {cargo.nome} ({cargo.digitos} dígitos)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-300 font-bold uppercase mb-1 flex items-center justify-between">
                      <span>Número na Urna:</span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {cargoSelecionadoObj?.digitos || 2} dígitos
                      </span>
                    </label>
                    <input
                      type="text"
                      value={numero}
                      maxLength={cargoSelecionadoObj?.digitos || 2}
                      onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))}
                      placeholder={`Ex: 10`}
                      required
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-white font-mono font-black text-xl focus:outline-none focus:border-emerald-500 text-center tracking-widest"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-300 font-bold uppercase mb-1">
                      Nome do Candidato(a):
                    </label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: LUCAS EMANUEL"
                      required
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-white font-bold uppercase focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-300 font-bold uppercase mb-1">
                      Chapa ou Ministério:
                    </label>
                    <input
                      type="text"
                      value={chapa}
                      onChange={(e) => setChapa(e.target.value)}
                      placeholder="Ex: CHAPA 1 - GERAÇÃO ELEITA"
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-white uppercase focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-300 font-bold uppercase mb-1">
                      Breve Descrição / Versículo / Proposta:
                    </label>
                    <textarea
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      rows={2}
                      placeholder="Ex: Servindo na juventude há 3 anos. Foco em oração e discipulado."
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {!candidatoEditando && cargos.length > 1 && (
                    <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
                      <div className="text-emerald-400 font-bold uppercase text-[11px] flex items-center justify-between">
                        <span>Candidatar aos outros cargos também:</span>
                        <span className="text-[10px] text-neutral-400 font-normal">opcional</span>
                      </div>
                      <p className="text-[10px] text-neutral-400">
                        Marque se esta pessoa concorrerá a mais de uma vaga (se eleita, será eliminada das demais):
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {cargos
                          .filter((c) => c.id !== cargoId)
                          .map((outroCargo) => {
                            const isSelected = outrosCargos.includes(outroCargo.id);
                            return (
                              <label
                                key={outroCargo.id}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-emerald-950/40 border-emerald-600 text-white font-bold'
                                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setOutrosCargos((prev) => [...prev, outroCargo.id]);
                                    } else {
                                      setOutrosCargos((prev) =>
                                        prev.filter((id) => id !== outroCargo.id)
                                      );
                                    }
                                  }}
                                  className="rounded border-neutral-700 text-emerald-600 focus:ring-0"
                                />
                                <span className="truncate">{outroCargo.nome}</span>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>

                {/* LADO DIREITO: FOTO COM UPLOAD E PRÉVIA DA URNA */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-neutral-300 font-bold uppercase">
                        Foto do Candidato:
                      </label>
                      <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setModoFoto('upload')}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                            modoFoto === 'upload'
                              ? 'bg-emerald-600 text-white'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Enviar Arquivo
                        </button>
                        <button
                          type="button"
                          onClick={() => setModoFoto('url')}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                            modoFoto === 'url'
                              ? 'bg-emerald-600 text-white'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Link Web (URL)
                        </button>
                      </div>
                    </div>

                    {modoFoto === 'upload' ? (
                      <div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={processandoFoto}
                          className="w-full border-2 border-dashed border-neutral-700 hover:border-emerald-500 hover:bg-neutral-800/50 rounded-2xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
                        >
                          <Upload className="w-6 h-6 text-emerald-400" />
                          <span className="font-bold text-neutral-200">
                            {processandoFoto
                              ? 'Otimizando imagem...'
                              : 'Clique para escolher foto do computador/celular'}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            JPG, PNG ou WEBP • Redimensionamento automático
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="relative">
                          <LinkIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="url"
                            value={fotoUrl}
                            onChange={(e) => {
                              setFotoUrl(e.target.value);
                              setPreviewErro(false);
                            }}
                            placeholder="https://exemplo.com/foto.jpg"
                            className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PRÉVIA AO VIVO DA FOTO NO ESTILO DA TELA DA URNA */}
                  <div className="bg-[#f4f7f3] border-2 border-[#444] rounded-xl p-3 text-neutral-900 shadow-inner">
                    <div className="flex items-center justify-between border-b border-neutral-300 pb-1.5 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Prévia na Tela da Urna</span>
                      </span>
                      <span className="text-[9px] font-mono bg-neutral-200 px-1.5 py-0.5 rounded text-neutral-700 font-bold">
                        {cargoSelecionadoObj?.nome || 'CARGO'}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="text-[10px] font-mono text-neutral-500 uppercase">
                          NÚMERO: <strong className="text-neutral-900">{numero || '__'}</strong>
                        </div>
                        <div className="text-xs font-black uppercase text-neutral-900 leading-tight">
                          {nome || 'NOME DO CANDIDATO'}
                        </div>
                        <div className="text-[11px] font-bold text-neutral-700 uppercase">
                          {chapa || 'CHAPA'}
                        </div>
                      </div>

                      {/* Quadro da Foto da Urna */}
                      <div className="w-20 h-24 border-2 border-neutral-800 bg-neutral-200 relative overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                        {fotoUrl && !previewErro ? (
                          <Image
                            src={fotoUrl}
                            alt="Prévia"
                            fill
                            sizes="80px"
                            className="object-cover"
                            unoptimized
                            onError={() => setPreviewErro(true)}
                          />
                        ) : (
                          <div className="text-center p-1 text-neutral-500 font-bold text-[10px]">
                            <span className="text-xl block">👤</span>
                            <span>{previewErro ? 'Erro ao carregar' : 'Sem foto'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {fotoUrl && (
                    <button
                      type="button"
                      onClick={() => setFotoUrl('')}
                      className="text-[11px] text-red-400 hover:text-red-300 underline cursor-pointer"
                    >
                      Remover foto
                    </button>
                  )}
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-lg shadow-emerald-900/30 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{candidatoEditando ? 'Salvar Alterações' : 'Cadastrar Candidato'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
