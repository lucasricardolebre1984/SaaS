# Voice Reactive Avatar

Reusable React component for Module 01 continuous voice chat.

## Files

- `voice-reactive-avatar.jsx`: avatar video component (`idle`/`speaking` switch)
- `use-voice-activity.js`: voice activity detection hook
- `voice-activity.js`: threshold + hold logic
- `voice-reactive-avatar.css`: base styles

## Recommended Assets

- `idle` video: subtle movement loop (5-8s)
- `speaking` video: same scene with slightly stronger pulse/energy
- format: `.mp4` + optional `.webm`
- target for webapp: 1280x720, under 3MB

## Usage

```jsx
import React from 'react';
import { VoiceReactiveAvatar } from './avatar/index.js';

export function ChatVoicePanel({ vadLevel }) {
  return (
    <VoiceReactiveAvatar
      idleSrc="/avatars/brain-idle.webm"
      speakingSrc="/avatars/brain-speaking.webm"
      inputLevel={vadLevel}
      startThreshold={0.08}
      stopThreshold={0.05}
      holdMs={220}
    />
  );
}
```

## Inputs

You can drive the component in two ways:

1. `inputLevel` (`0..1`): recommended for production (use your existing VAD/audio pipeline)
2. `mediaStream`: fallback mode using Web Audio API analysis

## Notes

- Keep both videos same duration and framing for smooth crossfade.
- Browser autoplay requires muted videos, already set by default.
