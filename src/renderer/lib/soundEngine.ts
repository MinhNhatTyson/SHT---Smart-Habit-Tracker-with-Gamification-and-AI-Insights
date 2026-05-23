// src/renderer/lib/soundEngine.ts
// Web Audio API sound synthesizer.
// Plays short procedural tones for habit completion and badge earned events.
// No audio files needed — all sounds are synthesized from note sequences
// stored in StoreItem.payload JSON.

export interface SoundNote {
  freq: number   // Hz
  dur:  number   // seconds
  type: OscillatorType
  gain: number   // 0–1
}

// Shared AudioContext — created once, reused for all sounds
let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext()
  }
  return ctx
}

/**
 * Play a sequence of notes defined by the store item payload.
 * Notes play back-to-back with a tiny gap between them.
 */
export async function playNotes(notes: SoundNote[]): Promise<void> {
  const audioCtx = getCtx()

  // Resume context if it was suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume()
  }

  let startTime = audioCtx.currentTime + 0.01 // slight delay to avoid click

  for (const note of notes) {
    const osc     = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    osc.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    osc.type      = note.type
    osc.frequency.setValueAtTime(note.freq, startTime)

    // Envelope: fast attack, short decay to 0 for clean notes
    gainNode.gain.setValueAtTime(0, startTime)
    gainNode.gain.linearRampToValueAtTime(note.gain, startTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + note.dur)

    osc.start(startTime)
    osc.stop(startTime + note.dur + 0.01)

    startTime += note.dur + 0.01 // tiny gap between notes
  }
}

/**
 * Built-in default sounds (no purchase required).
 * These play when activeHabitSound / activeBadgeSound === 'default'.
 */
export const DEFAULT_SOUNDS: Record<string, SoundNote[]> = {
  habit_default: [
    { freq: 660, dur: 0.10, type: 'sine', gain: 0.3 },
    { freq: 880, dur: 0.15, type: 'sine', gain: 0.25 },
  ],
  badge_default: [
    { freq: 523, dur: 0.10, type: 'sine',     gain: 0.35 },
    { freq: 659, dur: 0.10, type: 'sine',     gain: 0.35 },
    { freq: 784, dur: 0.20, type: 'triangle', gain: 0.30 },
  ],
}

/**
 * Play the user's active habit completion sound.
 * Pass the StoreItem payload notes if a custom sound is equipped,
 * or null to fall back to the default.
 */
export function playHabitSound(customNotes?: SoundNote[] | null): void {
  const notes = customNotes ?? DEFAULT_SOUNDS.habit_default
  playNotes(notes).catch(() => {/* silently ignore if audio context unavailable */})
}

/**
 * Play the user's active badge earned sound.
 */
export function playBadgeSound(customNotes?: SoundNote[] | null): void {
  const notes = customNotes ?? DEFAULT_SOUNDS.badge_default
  playNotes(notes).catch(() => {})
}