import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

export type SoundName = 'tick' | 'pop' | 'collect' | 'remove' | 'shutter' | 'reveal' | 'flip' | 'turn' | 'hit';

const SOURCES: Record<SoundName, number> = {
  tick: require('../../assets/sfx/tick.wav'),
  pop: require('../../assets/sfx/pop.wav'),
  collect: require('../../assets/sfx/collect.wav'),
  remove: require('../../assets/sfx/remove.wav'),
  shutter: require('../../assets/sfx/shutter.wav'),
  reveal: require('../../assets/sfx/reveal.wav'),
  flip: require('../../assets/sfx/flip.wav'),
  turn: require('../../assets/sfx/turn.wav'),
  hit: require('../../assets/sfx/hit.wav'),
};

const VOLUME: Record<SoundName, number> = {
  tick: 0.28,
  pop: 0.3,
  collect: 0.34,
  remove: 0.28,
  shutter: 0.32,
  reveal: 0.3,
  flip: 0.4,
  turn: 0.4,
  hit: 0.36,
};

const players = new Map<SoundName, AudioPlayer>();
let configured = false;

export function playSound(name: SoundName) {
  try {
    if (!configured) {
      configured = true;
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    }
    let player = players.get(name);
    if (!player) {
      player = createAudioPlayer(SOURCES[name]);
      player.volume = VOLUME[name];
      players.set(name, player);
    }
    const ready = player;
    ready
      .seekTo(0)
      .then(() => ready.play())
      .catch(() => ready.play());
  } catch {}
}
