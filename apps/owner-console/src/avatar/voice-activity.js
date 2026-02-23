export function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function createVoiceActivityMeter(options = {}) {
  const startThreshold = Number(options.startThreshold ?? 0.08);
  const stopThreshold = Number(options.stopThreshold ?? 0.05);
  const holdMs = Number(options.holdMs ?? 220);

  let speaking = false;
  let lastAboveStopAt = 0;

  return {
    update(level, nowMs = Date.now()) {
      const normalized = clamp01(level);

      if (!speaking && normalized >= startThreshold) {
        speaking = true;
        lastAboveStopAt = nowMs;
      } else if (speaking) {
        if (normalized >= stopThreshold) {
          lastAboveStopAt = nowMs;
        } else if (nowMs - lastAboveStopAt > holdMs) {
          speaking = false;
        }
      }

      return {
        level: normalized,
        speaking
      };
    }
  };
}
