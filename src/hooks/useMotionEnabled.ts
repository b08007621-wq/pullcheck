import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useSettings } from './useSettings';

export function useMotionEnabled(): boolean {
  const motionSetting = useSettings().settings.motion;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return motionSetting && !reduceMotion;
}
