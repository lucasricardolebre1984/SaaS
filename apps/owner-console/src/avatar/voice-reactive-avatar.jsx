import React, { useEffect } from 'react';
import { useVoiceActivity } from './use-voice-activity.js';
import './voice-reactive-avatar.css';

export function VoiceReactiveAvatar({
  idleSrc,
  speakingSrc,
  poster,
  inputLevel,
  mediaStream,
  startThreshold = 0.08,
  stopThreshold = 0.05,
  holdMs = 220,
  sampleRateMs = 33,
  showDebugBadge = false,
  onStateChange,
  className = ''
}) {
  const { speaking, level } = useVoiceActivity({
    inputLevel,
    mediaStream,
    startThreshold,
    stopThreshold,
    holdMs,
    sampleRateMs
  });

  useEffect(() => {
    if (typeof onStateChange === 'function') {
      onStateChange({
        speaking,
        level
      });
    }
  }, [speaking, level, onStateChange]);

  const speakingVideoSrc = speakingSrc || idleSrc;
  const state = speaking ? 'speaking' : 'idle';
  const composedClassName = className
    ? `voice-avatar ${className}`
    : 'voice-avatar';

  return (
    <div className={composedClassName} data-state={state}>
      <video
        className="voice-avatar__video voice-avatar__video--idle"
        src={idleSrc}
        poster={poster}
        autoPlay
        loop
        muted
        playsInline
      />
      <video
        className="voice-avatar__video voice-avatar__video--speaking"
        src={speakingVideoSrc}
        poster={poster}
        autoPlay
        loop
        muted
        playsInline
      />
      {showDebugBadge ? (
        <div className="voice-avatar__badge">
          {state} | lvl {level.toFixed(2)}
        </div>
      ) : null}
    </div>
  );
}
