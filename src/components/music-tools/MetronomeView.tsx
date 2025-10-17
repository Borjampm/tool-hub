import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import metronomeSampleUrl from '../../assets/sounds/metronome/Perc_MetronomeQuartz_lo.wav?url';

const MIN_BPM = 40;
const MAX_BPM = 240;
const DEFAULT_BPM = 120;
const LOOKAHEAD_SECONDS = 0.025; // 25ms
const SCHEDULE_AHEAD_SECONDS = 0.1; // 100ms
const PULSE_DISPLAY_MS = 140;

type SubdivisionOption = {
  value: number;
  label: string;
  description: string;
};

const SUBDIVISION_OPTIONS: SubdivisionOption[] = [
  { value: 1, label: 'Quarter notes', description: '1 click per beat' },
  { value: 2, label: 'Eighth notes', description: '2 clicks per beat' },
  { value: 3, label: 'Triplets', description: '3 clicks per beat' },
  { value: 4, label: 'Sixteenth notes', description: '4 clicks per beat' },
];

const clampBpm = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_BPM;
  }

  if (value < MIN_BPM) {
    return MIN_BPM;
  }

  if (value > MAX_BPM) {
    return MAX_BPM;
  }

  return Math.round(value);
};

const trimSilence = (buffer: AudioBuffer, context: AudioContext, threshold = 0.0005): AudioBuffer => {
  const { numberOfChannels, sampleRate, length } = buffer;
  const channelData = buffer.getChannelData(0);

  let startOffset = 0;
  let endOffset = length - 1;

  while (startOffset < length) {
    if (Math.abs(channelData[startOffset]) > threshold) {
      break;
    }
    startOffset += 1;
  }

  while (endOffset > startOffset) {
    if (Math.abs(channelData[endOffset]) > threshold) {
      break;
    }
    endOffset -= 1;
  }

  const trimmedLength = Math.max(1, endOffset - startOffset + 1);
  const trimmedBuffer = context.createBuffer(numberOfChannels, trimmedLength, sampleRate);

  for (let channel = 0; channel < numberOfChannels; channel += 1) {
    const channelArray = buffer.getChannelData(channel);
    trimmedBuffer.copyToChannel(channelArray.subarray(startOffset, endOffset + 1), channel);
  }

  return trimmedBuffer;
};

export function MetronomeView() {
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [subdivision, setSubdivision] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pulseAccent, setPulseAccent] = useState(false);
  const [isPulseActive, setIsPulseActive] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isSampleLoaded, setIsSampleLoaded] = useState(false);
  const [tempoInputValue, setTempoInputValue] = useState<string>(() => String(DEFAULT_BPM));

  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalIdRef = useRef<number | null>(null);
  const pulseTimeoutRef = useRef<number | null>(null);
  const subdivisionIndexRef = useRef(0);
  const sampleBufferRef = useRef<AudioBuffer | null>(null);
  const sampleLoadingRef = useRef<Promise<AudioBuffer | null> | null>(null);
  const nextTickTimeRef = useRef(0);
  const uiTimeoutsRef = useRef<number[]>([]);

  const clearIntervalTimer = useCallback(() => {
    if (intervalIdRef.current !== null) {
      window.clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  const clearPulseTimeout = useCallback(() => {
    if (pulseTimeoutRef.current !== null) {
      window.clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = null;
    }
    setIsPulseActive(false);
  }, []);

  const clearUiTimeouts = useCallback(() => {
    uiTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    uiTimeoutsRef.current = [];
  }, []);

  const ensureAudioContext = useCallback(async () => {
    if (typeof window === 'undefined') {
      return null;
    }

    const typedWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextCtor = window.AudioContext ?? typedWindow.webkitAudioContext;

    if (!AudioContextCtor) {
      setAudioError('Metronome requires a browser that supports the Web Audio API.');
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }

    const context = audioContextRef.current;

    if (context.state === 'suspended') {
      await context.resume();
    }

    setAudioError(null);
    return context;
  }, []);

  const loadSampleBuffer = useCallback(async (context: AudioContext) => {
    if (sampleBufferRef.current) {
      return sampleBufferRef.current;
    }

    if (sampleLoadingRef.current) {
      return sampleLoadingRef.current;
    }

    const loadPromise = (async () => {
      try {
        const response = await fetch(metronomeSampleUrl);
        if (!response.ok) {
          throw new Error('Unable to load metronome sample.');
        }
        const arrayBuffer = await response.arrayBuffer();
        const decoded = await context.decodeAudioData(arrayBuffer);
        const trimmed = trimSilence(decoded, context);
        sampleBufferRef.current = trimmed;
        setIsSampleLoaded(true);
        return trimmed;
      } catch (error) {
        console.error('Failed to decode metronome sample', error);
        setAudioError('Could not load metronome sound. Please try again.');
        return null;
      } finally {
        sampleLoadingRef.current = null;
      }
    })();

    sampleLoadingRef.current = loadPromise;
    return loadPromise;
  }, []);

  const playClick = useCallback((accent: boolean, startTime: number) => {
    const context = audioContextRef.current;
    const buffer = sampleBufferRef.current;

    if (!context || !buffer) {
      return;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(startTime);
  }, []);

  const scheduleVisualPulse = useCallback(
    (accent: boolean, startTime: number) => {
      const context = audioContextRef.current;
      if (!context) {
        return;
      }

      const delayMs = Math.max(0, (startTime - context.currentTime) * 1000);

      const timeoutId = window.setTimeout(() => {
        setPulseAccent(accent);
        clearPulseTimeout();
        setIsPulseActive(true);

        pulseTimeoutRef.current = window.setTimeout(() => {
          setIsPulseActive(false);
        }, PULSE_DISPLAY_MS);
      }, delayMs);

      uiTimeoutsRef.current.push(timeoutId);
    },
    [clearPulseTimeout]
  );

  const schedulePendingTicks = useCallback(() => {
    const context = audioContextRef.current;
    if (!context || !sampleBufferRef.current) {
      return;
    }

    const secondsPerSubdivision = 60 / (bpm * subdivision);

    while (nextTickTimeRef.current < context.currentTime + SCHEDULE_AHEAD_SECONDS) {
      const accent = subdivisionIndexRef.current === 0;
      playClick(accent, nextTickTimeRef.current);
      scheduleVisualPulse(accent, nextTickTimeRef.current);

      nextTickTimeRef.current += secondsPerSubdivision;
      subdivisionIndexRef.current = (subdivisionIndexRef.current + 1) % subdivision;
    }
  }, [bpm, playClick, scheduleVisualPulse, subdivision]);

  const startScheduler = useCallback(() => {
    clearIntervalTimer();
    schedulePendingTicks();
    const intervalId = window.setInterval(schedulePendingTicks, LOOKAHEAD_SECONDS * 1000);
    intervalIdRef.current = intervalId;
  }, [clearIntervalTimer, schedulePendingTicks]);

  const stopScheduler = useCallback(() => {
    clearIntervalTimer();
    clearUiTimeouts();
  }, [clearIntervalTimer, clearUiTimeouts]);
  const handleSliderChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = clampBpm(Number(event.target.value));
      setBpm(next);
      setTempoInputValue(String(next));
    },
    []
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      if (/^\d*$/.test(value)) {
        setTempoInputValue(value);
      }
    },
    []
  );

  const adjustBpm = useCallback((delta: number) => {
    setBpm((prev) => {
      const next = clampBpm(prev + delta);
      setTempoInputValue(String(next));
      return next;
    });
  }, []);

  const handleInputBlur = useCallback(() => {
    if (tempoInputValue.trim() === '') {
      setTempoInputValue(String(bpm));
      return;
    }

    const numericValue = Number(tempoInputValue);
    if (!Number.isFinite(numericValue)) {
      setTempoInputValue(String(bpm));
      return;
    }

    const clamped = clampBpm(numericValue);
    setBpm(clamped);
    setTempoInputValue(String(clamped));
  }, [bpm, tempoInputValue]);

  const handleInputKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
  }, []);

  const handleSubdivisionSelect = useCallback((value: number) => {
    setSubdivision(value);
  }, []);

  const togglePlayback = useCallback(async () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    const context = await ensureAudioContext();
    if (!context) {
      return;
    }

    const buffer = await loadSampleBuffer(context);
    if (!buffer) {
      return;
    }

    clearPulseTimeout();
    clearUiTimeouts();
    subdivisionIndexRef.current = 0;
    const startTime = context.currentTime + LOOKAHEAD_SECONDS;
    nextTickTimeRef.current = startTime;
    setPulseAccent(false);
    setIsPlaying(true);
  }, [clearPulseTimeout, clearUiTimeouts, ensureAudioContext, isPlaying, loadSampleBuffer]);

  useEffect(() => {
    if (!isPlaying) {
      stopScheduler();
      clearPulseTimeout();
      clearUiTimeouts();
      subdivisionIndexRef.current = 0;
      setIsPulseActive(false);
      setPulseAccent(false);
      return;
    }

    void (async () => {
      const context = await ensureAudioContext();
      if (!context) {
        setIsPlaying(false);
        return;
      }

      const buffer = await loadSampleBuffer(context);
      if (!buffer) {
        setIsPlaying(false);
        return;
      }

      clearPulseTimeout();
      clearUiTimeouts();
      subdivisionIndexRef.current = 0;
      const startTime = Math.max(context.currentTime + LOOKAHEAD_SECONDS, nextTickTimeRef.current || context.currentTime + LOOKAHEAD_SECONDS);
      nextTickTimeRef.current = startTime;
      schedulePendingTicks();
      startScheduler();
    })();

    return () => {
      stopScheduler();
    };
  }, [bpm, subdivision, clearPulseTimeout, clearUiTimeouts, ensureAudioContext, isPlaying, loadSampleBuffer, schedulePendingTicks, startScheduler, stopScheduler]);

  useEffect(() => {
    return () => {
      clearIntervalTimer();
      clearPulseTimeout();

      const context = audioContextRef.current;
      if (context) {
        audioContextRef.current = null;
        context.close().catch(() => undefined);
      }
    };
  }, [clearIntervalTimer, clearPulseTimeout]);

  return (
    <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 space-y-8">
      <header className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-500">Metronome</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Keep time simply</h1>
        <p className="text-sm text-gray-500">
          Set your tempo, choose a subdivision, and tap start.
        </p>
      </header>

      <div className="flex flex-col items-center gap-8">
        <div
          className={`relative flex h-32 w-32 items-center justify-center rounded-full border text-center transition-all duration-150 ${
            isPulseActive
              ? pulseAccent
                ? 'border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-200 scale-105'
                : 'border-purple-300 bg-white text-purple-700 shadow-md shadow-purple-200/60 scale-105'
              : 'border-purple-200 bg-white text-purple-700'
          }`}
        >
          <span className="text-xl font-semibold">{pulseAccent ? 'Accent' : 'Beat'}</span>
        </div>

        <button
          type="button"
          onClick={() => void togglePlayback()}
          className={`w-full max-w-xs rounded-full py-3 text-sm font-semibold text-white transition-colors duration-150 touch-manipulation min-h-[44px] ${
            isPlaying ? 'bg-red-500 hover:bg-red-600 focus:bg-red-600' : 'bg-purple-600 hover:bg-purple-700 focus:bg-purple-700'
          }`}
        >
          {isPlaying ? 'Stop' : 'Start'}
        </button>

        <div className="w-full max-w-xl space-y-6">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-semibold text-gray-900">{bpm}</span>
              <span className="text-sm uppercase tracking-[0.3em] text-gray-400">bpm</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => adjustBpm(-1)}
                aria-label="Decrease tempo"
                className="min-h-[40px] min-w-[40px] rounded-full border border-gray-200 bg-white text-base font-semibold text-gray-700 transition-colors duration-150 hover:border-purple-200 hover:text-purple-600"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => adjustBpm(1)}
                aria-label="Increase tempo"
                className="min-h-[40px] min-w-[40px] rounded-full border border-gray-200 bg-white text-base font-semibold text-gray-700 transition-colors duration-150 hover:border-purple-200 hover:text-purple-600"
              >
                +
              </button>
            </div>
          </div>

          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={handleSliderChange}
            className="w-full accent-purple-600"
            aria-labelledby="metronome-tempo-label"
          />

          <div className="flex flex-wrap items-center gap-3">
            <label
              id="metronome-tempo-label"
              htmlFor="metronome-bpm-input"
              className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500"
            >
              Direct entry
            </label>
            <input
              id="metronome-bpm-input"
              type="number"
              min={MIN_BPM}
              max={MAX_BPM}
              value={tempoInputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              className="w-24 rounded-md border border-gray-200 bg-white px-3 py-2 text-base font-medium text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <span className="text-xs text-gray-400">{MIN_BPM}-{MAX_BPM} bpm</span>
          </div>
        </div>

        <div className="w-full max-w-xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">Subdivision</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SUBDIVISION_OPTIONS.map((option) => {
              const isActive = option.value === subdivision;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSubdivisionSelect(option.value)}
                  aria-pressed={isActive}
                  className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 ${
                    isActive
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-purple-200 hover:bg-purple-50/60'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {audioError && (
          <p className="w-full max-w-xl rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {audioError}
          </p>
        )}
        {!audioError && !isSampleLoaded && (
          <p className="text-xs text-gray-400">Loading metronome sound...</p>
        )}
      </div>
    </section>
  );
}

