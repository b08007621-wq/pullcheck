import { useRef } from 'react';
import { type GestureResponderEvent, StyleSheet, View } from 'react-native';

import { dragOrbit, grabOrbit, type Orbit, releaseOrbit, zoomOrbit } from '@/three/orbit';

type Props = {
  orbit: Orbit;
  onDoubleTap: () => void;
};

const TAP_SLOP = 10;
const DOUBLE_TAP_MS = 300;
const STILL_MS = 90;

export function OrbitSurface({ orbit, onDoubleTap }: Props) {
  const gesture = useRef({
    x: 0,
    y: 0,
    time: 0,
    touches: 0,
    pinchStart: 0,
    zoomStart: 1,
    travel: 0,
    lastTap: 0,
  });

  const anchor = (event: GestureResponderEvent) => {
    const state = gesture.current;
    const touches = event.nativeEvent.touches;
    state.touches = touches.length;
    state.x = event.nativeEvent.pageX;
    state.y = event.nativeEvent.pageY;
    state.time = Date.now();
    const [first, second] = touches;
    if (first && second) {
      state.pinchStart = Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);
      state.zoomStart = orbit.zoom;
    }
  };

  const onGrant = (event: GestureResponderEvent) => {
    gesture.current.travel = 0;
    anchor(event);
    grabOrbit(orbit);
  };

  const onMove = (event: GestureResponderEvent) => {
    const state = gesture.current;
    const touches = event.nativeEvent.touches;
    if (touches.length !== state.touches) {
      anchor(event);
      return;
    }
    const [first, second] = touches;
    if (first && second) {
      const distance = Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);
      if (state.pinchStart > 0) zoomOrbit(orbit, (state.zoomStart * distance) / state.pinchStart);
      state.travel += TAP_SLOP;
      return;
    }
    const now = Date.now();
    const dx = event.nativeEvent.pageX - state.x;
    const dy = event.nativeEvent.pageY - state.y;
    dragOrbit(orbit, dx, dy, Math.max(1, now - state.time) / 1000);
    state.travel += Math.abs(dx) + Math.abs(dy);
    state.x = event.nativeEvent.pageX;
    state.y = event.nativeEvent.pageY;
    state.time = now;
  };

  const onEnd = () => {
    const state = gesture.current;
    const now = Date.now();
    releaseOrbit(orbit, now - state.time > STILL_MS);
    if (state.travel > TAP_SLOP) return;
    if (now - state.lastTap < DOUBLE_TAP_MS) {
      state.lastTap = 0;
      onDoubleTap();
    } else {
      state.lastTap = now;
    }
  };

  return (
    <View
      style={StyleSheet.absoluteFill}
      accessibilityLabel="3D model. Drag to spin, pinch to zoom, double tap to flip."
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={onGrant}
      onResponderMove={onMove}
      onResponderRelease={onEnd}
      onResponderTerminate={onEnd}
    />
  );
}
