'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function MesarioPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/admin');
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-600 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div>
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block mb-1">
            JUMP • ELEIÇÕES
          </span>
          <h2 className="text-xl font-black uppercase text-white tracking-wider">
            Votação Direta por Aparelho
          </h2>
          <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
            Não é necessário código de eleitor. Os jovens votam diretamente apontando a câmera do celular para o QR Code no telão.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            <span>Ir para o Painel Admin</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
