"use client";

/**
 * Sonido de aviso para notificaciones internas.
 *
 * Se sintetiza con Web Audio en vez de cargar un archivo: evita sumar un asset
 * binario al repo y suena identico en todos los navegadores. El navegador
 * bloquea el audio hasta que el usuario interactua con la pagina, asi que
 * `unlockNotificationSound` debe llamarse desde un gesto real del usuario.
 */

type AudioContextConstructor = typeof AudioContext;

let audioContext: AudioContext | null = null;

function resolveAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const legacy = (window as unknown as { webkitAudioContext?: AudioContextConstructor })
    .webkitAudioContext;
  return window.AudioContext ?? legacy ?? null;
}

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;

  const Ctor = resolveAudioContextConstructor();
  if (!Ctor) return null;

  try {
    audioContext = new Ctor();
    return audioContext;
  } catch {
    return null;
  }
}

/**
 * Habilita el audio tras el primer gesto del usuario. Sin esto el navegador
 * deja el contexto en estado "suspended" y el aviso no suena.
 */
export function unlockNotificationSound() {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") {
    void context.resume().catch(() => {});
  }
}

/**
 * Repique corto de dos notas. No lanza si el navegador bloquea el audio.
 */
export function playNotificationChime() {
  const context = getAudioContext();
  if (!context || context.state !== "running") return;

  const now = context.currentTime;
  // Dos notas ascendentes (La5 -> Do#6), suficientes para llamar la atencion
  // sin resultar estridentes en recepcion o consulta.
  const notes = [
    { frequency: 880, startAt: 0, duration: 0.18 },
    { frequency: 1108.73, startAt: 0.13, duration: 0.26 },
  ];

  for (const note of notes) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(note.frequency, now + note.startAt);

    // Envolvente suave para que no chasquee al iniciar ni al cortar.
    gain.gain.setValueAtTime(0.0001, now + note.startAt);
    gain.gain.exponentialRampToValueAtTime(0.18, now + note.startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.startAt + note.duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + note.startAt);
    oscillator.stop(now + note.startAt + note.duration + 0.02);
  }
}
