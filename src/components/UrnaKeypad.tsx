'use client';

import React, { useEffect, useCallback } from 'react';

interface UrnaKeypadProps {
  onDigitPress: (digit: string) => void;
  onBrancoPress: () => void;
  onCorrigePress: () => void;
  onConfirmaPress: () => void;
  disabled?: boolean;
}

export const UrnaKeypad: React.FC<UrnaKeypadProps> = ({
  onDigitPress,
  onBrancoPress,
  onCorrigePress,
  onConfirmaPress,
  disabled = false,
}) => {
  // Captura eventos do teclado físico do computador
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      // Se o usuário estiver digitando em um input de formulário, não interceptar
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        onDigitPress(e.key);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirmaPress();
      } else if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        onCorrigePress();
      } else if (e.key.toLowerCase() === 'b' || e.key === ' ') {
        e.preventDefault();
        onBrancoPress();
      }
    },
    [disabled, onDigitPress, onConfirmaPress, onCorrigePress, onBrancoPress]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const numBtnClass =
    'relative flex items-center justify-center text-white bg-neutral-900 border-2 border-neutral-700 active:border-neutral-800 rounded-md font-sans text-2xl font-bold h-14 md:h-16 shadow-[0_5px_0_#171717] active:shadow-none active:translate-y-1 transition-all select-none hover:bg-neutral-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="bg-[#242426] p-4 md:p-6 rounded-xl shadow-2xl border-4 border-[#1b1b1c] w-full max-w-sm mx-auto select-none flex flex-col justify-between">
      {/* Grade numérica 1..9 e 0 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            type="button"
            disabled={disabled}
            onClick={() => onDigitPress(num)}
            className={numBtnClass}
            aria-label={`Dígito ${num}`}
          >
            <span>{num}</span>
            {/* Ponto tátil em braille / relevo na tecla 5 como na urna real */}
            {num === '5' && (
              <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-neutral-500" />
            )}
          </button>
        ))}

        {/* Linha do zero centralizado */}
        <div />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDigitPress('0')}
          className={numBtnClass}
          aria-label="Dígito 0"
        >
          0
        </button>
        <div />
      </div>

      {/* Botões de Ação da Urna: BRANCO, CORRIGE, CONFIRMA */}
      <div className="grid grid-cols-3 gap-2.5 pt-2 border-t-2 border-neutral-700/60 items-end">
        {/* Tecla BRANCO */}
        <button
          type="button"
          disabled={disabled}
          onClick={onBrancoPress}
          className="flex flex-col items-center justify-center bg-white hover:bg-neutral-100 active:bg-neutral-200 text-neutral-900 font-extrabold text-xs md:text-sm py-3.5 px-1 rounded-md border-2 border-neutral-300 shadow-[0_4px_0_#9ca3af] active:shadow-none active:translate-y-1 transition-all uppercase tracking-wide cursor-pointer disabled:opacity-50"
        >
          <span>BRANCO</span>
        </button>

        {/* Tecla CORRIGE */}
        <button
          type="button"
          disabled={disabled}
          onClick={onCorrigePress}
          className="flex flex-col items-center justify-center bg-[#ea580c] hover:bg-[#c2410c] active:bg-[#9a3412] text-black font-extrabold text-xs md:text-sm py-3.5 px-1 rounded-md border-2 border-[#9a3412] shadow-[0_4px_0_#7c2d12] active:shadow-none active:translate-y-1 transition-all uppercase tracking-wide cursor-pointer disabled:opacity-50"
        >
          <span>CORRIGE</span>
        </button>

        {/* Tecla CONFIRMA - mais alta e robusta como na urna real */}
        <button
          type="button"
          disabled={disabled}
          onClick={onConfirmaPress}
          className="flex flex-col items-center justify-center bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] text-black font-black text-xs md:text-sm py-5 px-1 rounded-md border-2 border-[#14532d] shadow-[0_6px_0_#0f3f22] active:shadow-none active:translate-y-1.5 transition-all uppercase tracking-wider cursor-pointer disabled:opacity-50"
        >
          <span>CONFIRMA</span>
        </button>
      </div>

      {/* Dica de teclado */}
      <div className="text-[10px] text-neutral-400 text-center mt-3 font-mono">
        Atalhos: Teclado [0-9] | Enter [Confirma] | Esc [Corrige] | B [Branco]
      </div>
    </div>
  );
};

