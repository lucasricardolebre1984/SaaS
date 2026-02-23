import { useEffect, useMemo, useRef, useState } from 'react';
import { createVoiceActivityMeter } from './voice-activity.js';

function computeRmsLevel(analyser, dataArray) {
  analyser.getByteTimeDomainData(dataArray);
  let sumSquares = 0;
  for (let i = 0; i < dataArray.length; i += 1) {
    const normalized = (dataArray[i] - 128) / 128;
    sumSquares += normalized * normalized;
  }
  const rms = Math.sqrt(sumSquares / dataArray.length);
  return Math.min(1, rms * 2.2);
}

/**
 * Voice activity hook for avatar state switching.
 *
 * Priority:
 * 1) `inputLevel` (external level from your voice pipeline, range 0..1)
 * 2) `mediaStream` (local microphone stream analyzed via WebAudio)
 */
export function useVoiceActivity(options = {}) {
  const {
    inputLevel,
    mediaStream,
    startThreshold = 0.08,
    stopThreshold = 0.05,
    holdMs = 220,
    sampleRateMs = 33
  } = options;

  const meter = useMemo(
    () => createVoiceActivityMeter({ startThreshold, stopThreshold, holdMs }),
    [startThreshold, stopThreshold, holdMs]
  );

  const rafRef = useRef(null);
  const intervalRef = useRef(null);
  const [state, setState] = useState({
    level: 0,
    speaking: false
  });

  useEffect(() => {
    if (typeof inputLevel !== 'number') return undefined;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setState(meter.update(inputLevel, Date.now()));
    }, sampleRateMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [inputLevel, meter, sampleRateMs]);

  useEffect(() => {
    if (typeof inputLevel === 'number') return undefined;
    if (!mediaStream) return undefined;
    if (typeof window === 'undefined' || !window.AudioContext) return undefined;

    const audioContext = new window.AudioContext();
    const source = audioContext.createMediaStreamSource(mediaStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.fftSize);

    const tick = () => {
      const level = computeRmsLevel(analyser, dataArray);
      setState(meter.update(level, Date.now()));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      source.disconnect();
      analyser.disconnect();
      audioContext.close();
    };
  }, [inputLevel, mediaStream, meter]);

  return state;
}
