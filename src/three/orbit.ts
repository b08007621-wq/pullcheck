export type Orbit = {
  yaw: number;
  pitch: number;
  yawVelocity: number;
  pitchVelocity: number;
  zoom: number;
  zoomTarget: number;
  flipTo: number | null;
  touching: boolean;
  idle: number;
  sway: number;
  clock: number;
};

const DRAG_SPEED = 0.011;
const FRICTION = 2.4;
const PITCH_LIMIT = 0.6;
const PITCH_RETURN = 1.6;
const FLIP_STIFFNESS = 8;
const IDLE_DELAY = 2.4;
const ZOOM_MIN = 0.7;
const ZOOM_MAX = 2.4;
const REST_YAW = -0.32;
const INTRO_SPIN = 7.2;

export function createOrbit(intro: boolean): Orbit {
  return {
    yaw: intro ? REST_YAW - INTRO_SPIN / FRICTION : REST_YAW,
    pitch: 0.06,
    yawVelocity: intro ? INTRO_SPIN : 0,
    pitchVelocity: 0,
    zoom: 1,
    zoomTarget: 1,
    flipTo: null,
    touching: false,
    idle: 0,
    sway: 0,
    clock: 0,
  };
}

export function grabOrbit(orbit: Orbit) {
  orbit.touching = true;
  orbit.flipTo = null;
  orbit.yawVelocity = 0;
  orbit.pitchVelocity = 0;
  orbit.idle = 0;
}

export function dragOrbit(orbit: Orbit, dx: number, dy: number, seconds: number) {
  const yawDelta = dx * DRAG_SPEED;
  const pitchDelta = dy * DRAG_SPEED * 0.6;
  orbit.yaw += yawDelta;
  orbit.pitch = clamp(orbit.pitch + pitchDelta, -PITCH_LIMIT, PITCH_LIMIT);
  if (seconds > 0) {
    orbit.yawVelocity = orbit.yawVelocity * 0.4 + (yawDelta / seconds) * 0.6;
    orbit.pitchVelocity = orbit.pitchVelocity * 0.4 + (pitchDelta / seconds) * 0.6;
  }
}

export function releaseOrbit(orbit: Orbit, heldStill: boolean) {
  orbit.touching = false;
  if (heldStill) {
    orbit.yawVelocity = 0;
    orbit.pitchVelocity = 0;
  }
  orbit.yawVelocity = clamp(orbit.yawVelocity, -18, 18);
  orbit.pitchVelocity = clamp(orbit.pitchVelocity, -6, 6);
}

export function zoomOrbit(orbit: Orbit, zoom: number) {
  orbit.zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
  orbit.zoomTarget = orbit.zoom;
}

export function flipOrbit(orbit: Orbit) {
  const base = orbit.flipTo ?? orbit.yaw;
  orbit.flipTo = Math.round(base / Math.PI) * Math.PI + Math.PI;
  orbit.yawVelocity = 0;
  orbit.idle = 0;
}

export function resetOrbit(orbit: Orbit) {
  orbit.flipTo = Math.round(orbit.yaw / (Math.PI * 2)) * Math.PI * 2 + REST_YAW;
  orbit.yawVelocity = 0;
  orbit.pitchVelocity = 0;
  orbit.zoomTarget = 1;
  orbit.idle = 0;
}

export function stepOrbit(orbit: Orbit, delta: number, motion: boolean) {
  const dt = Math.min(delta, 1 / 20);
  orbit.clock += dt;

  if (orbit.flipTo !== null) {
    const remaining = orbit.flipTo - orbit.yaw;
    orbit.yaw += remaining * (1 - Math.exp(-FLIP_STIFFNESS * dt));
    if (Math.abs(remaining) < 0.002) {
      orbit.yaw = orbit.flipTo;
      orbit.flipTo = null;
    }
  } else if (!orbit.touching) {
    orbit.yaw += orbit.yawVelocity * dt;
    orbit.yawVelocity *= Math.exp(-FRICTION * dt);
  }

  if (!orbit.touching) {
    orbit.pitch = clamp(orbit.pitch + orbit.pitchVelocity * dt, -PITCH_LIMIT, PITCH_LIMIT);
    orbit.pitchVelocity *= Math.exp(-FRICTION * 2 * dt);
    orbit.pitch += (0.06 - orbit.pitch) * (1 - Math.exp(-PITCH_RETURN * dt));
  }

  orbit.zoom += (orbit.zoomTarget - orbit.zoom) * (1 - Math.exp(-10 * dt));

  const settled = !orbit.touching && orbit.flipTo === null && Math.abs(orbit.yawVelocity) < 0.05;
  orbit.idle = settled ? orbit.idle + dt : 0;
  const swayTarget = motion && orbit.idle > IDLE_DELAY ? 1 : 0;
  orbit.sway += (swayTarget - orbit.sway) * (1 - Math.exp(-(swayTarget > orbit.sway ? 0.8 : 8) * dt));
}

export function displayYaw(orbit: Orbit): number {
  return orbit.yaw + Math.sin(orbit.clock * 0.7) * 0.24 * orbit.sway;
}

export function displayPitch(orbit: Orbit): number {
  return orbit.pitch + Math.sin(orbit.clock * 0.9 + 1) * 0.05 * orbit.sway;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
