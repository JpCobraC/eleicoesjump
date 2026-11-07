// Sintetizador Web Audio API para reproduzir os sons autênticos da Urna Eletrônica
// Não necessita de arquivos de áudio externos, funcionando 100% offline e sem erro de carregamento.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Som de tecla digitada (beep curto da urna)
 */
export function playKeyBeep(enabled = true) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1050, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch (err) {
    console.warn('Erro ao tocar som de tecla:', err);
  }
}

/**
 * Som de tecla CORRIGE
 */
export function playCorrigeSound(enabled = true) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (err) {
    console.warn('Erro ao tocar som de corrige:', err);
  }
}

/**
 * Som de confirmação intermediária (entre um cargo e outro)
 */
export function playInterConfirmaSound(enabled = true) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (err) {
    console.warn('Erro ao tocar som intermediário:', err);
  }
}

/**
 * O clássico e inconfundível som de "FIM" da Urna Eletrônica Brasileira ("PILILILI")
 * Recriado minuciosamente com a cadência original do TSE.
 */
export function playUrnaFimSound(enabled = true): Promise<void> {
  if (!enabled) return Promise.resolve();
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) {
        resolve();
        return;
      }

      const startTime = ctx.currentTime + 0.05;
      
      // Sequência de notas do pililili da urna:
      // A urna eletrônica reproduz um som contínuo e rápido modulado em frequências altas
      // 1ª parte: notas curtas alternadas rápidas (pi-li-li-li...)
      // 2ª parte: tom final mais longo e agudo
      const notes = [
        { freq: 830, duration: 0.07 },
        { freq: 1100, duration: 0.07 },
        { freq: 830, duration: 0.07 },
        { freq: 1100, duration: 0.07 },
        { freq: 830, duration: 0.07 },
        { freq: 1250, duration: 0.07 },
        { freq: 1450, duration: 0.07 },
        { freq: 1650, duration: 0.45 }, // Nota final longa
      ];

      let accumulatedTime = startTime;

      notes.forEach((note, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Mistura de onda retangular suave e senoidal para dar o timbre clássico do buzzer piezoelétrico da urna
        osc.type = index === notes.length - 1 ? 'sine' : 'square';
        osc.frequency.setValueAtTime(note.freq, accumulatedTime);

        // Curva de ganho
        const volume = index === notes.length - 1 ? 0.35 : 0.22;
        gain.gain.setValueAtTime(volume, accumulatedTime);
        gain.gain.exponentialRampToValueAtTime(0.001, accumulatedTime + note.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(accumulatedTime);
        osc.stop(accumulatedTime + note.duration);

        accumulatedTime += note.duration + 0.01;
      });

      setTimeout(() => {
        resolve();
      }, (accumulatedTime - startTime + 0.2) * 1000);

    } catch (err) {
      console.warn('Erro ao tocar som de FIM da urna:', err);
      resolve();
    }
  });
}

