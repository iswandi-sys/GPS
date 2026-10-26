import { NavTargetCalculation, NavPosition, AppSettings } from '../types';

class VoiceGuidanceService {
  private lastSpokenTime: number = 0;
  private lastProximityAlertWaypointId: string | null = null;
  private synth: SpeechSynthesis | null = null;
  private indonesianVoice: SpeechSynthesisVoice | null = null;
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.findIndonesianVoice();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.findIndonesianVoice();
      }
    }
  }

  private findIndonesianVoice() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    this.indonesianVoice =
      voices.find((v) => v.lang.startsWith('id') || v.lang.includes('IND')) ||
      voices.find((v) => v.lang.startsWith('ms')) ||
      null;
  }

  public playBeep(frequency = 880, durationMs = 200) {
    try {
      if (typeof window === 'undefined') return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + durationMs / 1000);
    } catch {
      // AudioContext may be blocked before user interaction
    }
  }

  public speak(text: string, force = false): void {
    if (!this.synth) return;

    if (!force && this.synth.speaking) {
      return;
    }

    try {
      this.synth.cancel(); // cancel pending speech for freshness
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      if (this.indonesianVoice) {
        utterance.voice = this.indonesianVoice;
      }

      this.synth.speak(utterance);
      this.lastSpokenTime = Date.now();
    } catch {
      // Speech synthesis error fallback
    }
  }

  public processNavigation(
    calc: NavTargetCalculation,
    pos: NavPosition,
    settings: AppSettings
  ): void {
    if (!settings.voiceGuidanceEnabled || !calc.target) {
      return;
    }

    // Do not speak if speed is under 0.5 knots or GPS accuracy is too poor (> 30m)
    if (pos.speedKnots < 0.5 || pos.accuracy > 30) {
      return;
    }

    const now = Date.now();
    const intervalMs = (settings.voiceIntervalSeconds || 60) * 1000;

    // Check Proximity Alert (< threshold nmi, e.g. 0.5 nmi)
    if (
      calc.distanceNmi <= settings.voiceProximityWarningNmi &&
      this.lastProximityAlertWaypointId !== calc.target.id
    ) {
      this.lastProximityAlertWaypointId = calc.target.id;
      this.playBeep(1200, 300);
      const distStr = calc.distanceNmi < 0.2 ? '300 meter' : `${calc.distanceNmi.toFixed(1)} mil laut`;
      this.speak(`Peringatan. Anda telah mendekati target ${calc.target.name}. Jarak tersisa ${distStr}.`, true);
      return;
    }

    // Regular interval course guidance
    if (now - this.lastSpokenTime >= intervalMs) {
      const delta = Math.round(calc.relativeBearingDelta);
      const absDelta = Math.abs(delta);

      let message = '';

      if (absDelta <= (settings.voiceHeadingThreshold || 15)) {
        message = `Haluan lurus mantap. Jarak menuju ${calc.target.name} ${calc.distanceNmi.toFixed(1)} mil laut.`;
      } else if (delta < 0) {
        // Target is to port (kiri)
        message = `Target di sebelah kiri. Koreksi arah ke kiri ${absDelta} derajat.`;
      } else {
        // Target is to starboard (kanan)
        message = `Target di sebelah kanan. Koreksi arah ke kanan ${absDelta} derajat.`;
      }

      if (calc.etaMinutes && calc.etaMinutes > 0 && calc.etaMinutes < 300) {
        if (calc.etaMinutes < 60) {
          message += ` Estimasi tiba ${calc.etaMinutes} menit.`;
        } else {
          const h = Math.floor(calc.etaMinutes / 60);
          const m = calc.etaMinutes % 60;
          message += ` Estimasi tiba ${h} jam ${m} menit.`;
        }
      }

      this.speak(message);
    }
  }

  public testVoice(): void {
    this.playBeep(900, 150);
    setTimeout(() => {
      this.speak('Tes panduan suara Navigasi Laut S R aktif. Sistem siap memandu haluan kapal nelayan.', true);
    }, 200);
  }
}

export const voiceGuidance = new VoiceGuidanceService();
