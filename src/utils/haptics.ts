import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { playSound, type SoundName } from './sfx';

export type HapticsApi = {
  selection: () => void;
  tap: () => void;
  collect: () => void;
  remove: () => void;
  ready: () => void;
  shutter: () => void;
  reveal: () => void;
  flip: () => void;
  turn: () => void;
  hit: () => void;
};

const NOOP = () => {};

export function createHaptics(enabled: boolean, sounds = false): HapticsApi {
  const buzz = enabled && Platform.OS !== 'web';
  const sound = (name: SoundName) => (sounds ? () => playSound(name) : NOOP);
  const both = (feel: () => void, name: SoundName | null) => {
    const play = name ? sound(name) : NOOP;
    return () => {
      if (buzz) feel();
      play();
    };
  };

  return {
    selection: both(() => fire(Haptics.selectionAsync()), 'tick'),
    tap: both(() => fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)), null),
    collect: both(() => {
      fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
      setTimeout(() => fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)), 110);
      setTimeout(() => fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)), 280);
    }, 'collect'),
    remove: both(() => fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)), 'remove'),
    ready: both(() => fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)), null),
    shutter: both(() => fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)), 'shutter'),
    reveal: both(() => {
      fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      setTimeout(() => fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)), 140);
    }, 'reveal'),
    flip: both(() => fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)), 'flip'),
    turn: both(() => {
      fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
      setTimeout(() => fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)), 300);
    }, 'turn'),
    hit: both(() => {
      fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      setTimeout(() => fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)), 160);
      setTimeout(() => fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)), 320);
      setTimeout(() => fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)), 480);
    }, 'hit'),
  };
}

function fire(promise: Promise<void>) {
  promise.catch(() => {});
}
