// Tiny synthesised sound effects, so the app needs no audio files and works offline.

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', volume = 0.18) {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = a.currentTime + start;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function buzz(ms: number | number[]) {
  try { navigator.vibrate?.(ms); } catch { /* not supported */ }
}

export const sfx = {
  tap() { tone(660, 0, 0.05, 'triangle', 0.08); },
  correct() {
    tone(784, 0, 0.12, 'triangle');
    tone(1175, 0.09, 0.22, 'triangle');
    buzz(20);
  },
  wrong() {
    tone(220, 0, 0.18, 'sawtooth', 0.07);
    tone(185, 0.12, 0.25, 'sawtooth', 0.07);
    buzz([40, 40, 40]);
  },
  combo() {
    [880, 1109, 1319].forEach((f, i) => tone(f, i * 0.06, 0.12, 'square', 0.06));
  },
  complete() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle'));
    buzz([30, 60, 30]);
  },
  fanfare() {
    [523, 523, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 'square', 0.08));
    buzz([50, 50, 50, 50, 120]);
  },
  coin() {
    tone(988, 0, 0.08, 'square', 0.07);
    tone(1319, 0.07, 0.2, 'square', 0.07);
  },
};
