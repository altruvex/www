import { gsap } from "@/lib/utils/gsap";
import type { SpringConfig } from "../tokens";

/**
 * Analytic damped-harmonic-oscillator spring.
 *
 * Why analytic instead of Euler stepping: the closed-form solution is exact
 * for any frame delta, so a 16ms frame, a 33ms dropped frame and a 2s tab-hide
 * all land on the same curve — no substep tuning, no instability at high
 * stiffness. Retargeting (`set`) re-bases the solution from the CURRENT
 * position and velocity, which is what makes a hover that reverses mid-flight
 * feel continuous instead of restarting an ease.
 *
 * All springs share one `gsap.ticker` listener that is attached only while at
 * least one spring is moving, so an idle page costs nothing. Values are handed
 * to a setter each frame; pair with `gsap.quickSetter` so writes go through
 * GSAP's transform cache (composes with other tweens on the same element,
 * no per-frame allocation).
 */
export interface Spring {
  /** Retarget, preserving current position + velocity. */
  set(target: number): void;
  /** Teleport to a value with zero velocity (no animation). */
  jump(value: number): void;
  /** Swap the physics without discontinuity (e.g. press-in vs release). */
  retune(config: SpringConfig): void;
  readonly value: number;
  readonly velocity: number;
  readonly target: number;
  readonly active: boolean;
  /** Stop and detach. Leaves the element at its current value. */
  kill(): void;
}

interface Node {
  setter: (v: number) => void;
  w0: number;
  zeta: number;
  restDelta: number;
  restSpeed: number;
  x0: number;
  v0: number;
  t0: number;
  target: number;
  value: number;
  velocity: number;
  active: boolean;
}

const running = new Set<Node>();
let ticking = false;

function tick(time: number): void {
  for (const n of running) step(n, time);
  if (running.size === 0) {
    gsap.ticker.remove(tick);
    ticking = false;
  }
}

function wake(n: Node): void {
  if (!n.active) {
    n.active = true;
    running.add(n);
  }
  if (!ticking) {
    ticking = true;
    gsap.ticker.add(tick);
  }
}

function sleep(n: Node): void {
  n.active = false;
  running.delete(n);
}

function tune(n: Node, config: SpringConfig): void {
  const k = config.stiffness;
  const c = config.damping;
  const m = config.mass ?? 1;
  n.w0 = Math.sqrt(k / m);
  n.zeta = c / (2 * Math.sqrt(k * m));
  n.restDelta = config.restDelta ?? 0.01;
  n.restSpeed = config.restSpeed ?? 0.1;
}

/** Re-base the closed-form solution from the current state. */
function rebase(n: Node): void {
  n.x0 = n.value - n.target;
  n.v0 = n.velocity;
  n.t0 = gsap.ticker.time;
}

function step(n: Node, time: number): void {
  const t = time - n.t0;
  const { w0, zeta, x0, v0 } = n;
  let x: number;
  let v: number;

  if (zeta < 1) {
    // Underdamped: decaying oscillation.
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const decay = Math.exp(-zeta * w0 * t);
    const B = (v0 + zeta * w0 * x0) / wd;
    const cos = Math.cos(wd * t);
    const sin = Math.sin(wd * t);
    x = decay * (x0 * cos + B * sin);
    v = -zeta * w0 * x + decay * (-x0 * wd * sin + B * wd * cos);
  } else if (zeta === 1) {
    // Critically damped: fastest settle with no overshoot.
    const decay = Math.exp(-w0 * t);
    const B = v0 + w0 * x0;
    x = (x0 + B * t) * decay;
    v = -w0 * x + B * decay;
  } else {
    // Overdamped: two real exponentials.
    const s = w0 * Math.sqrt(zeta * zeta - 1);
    const r1 = -zeta * w0 + s;
    const r2 = -zeta * w0 - s;
    const C1 = (v0 - r2 * x0) / (r1 - r2);
    const C2 = x0 - C1;
    const e1 = Math.exp(r1 * t);
    const e2 = Math.exp(r2 * t);
    x = C1 * e1 + C2 * e2;
    v = C1 * r1 * e1 + C2 * r2 * e2;
  }

  if (Math.abs(x) < n.restDelta && Math.abs(v) < n.restSpeed) {
    n.value = n.target;
    n.velocity = 0;
    sleep(n);
    n.setter(n.target);
    return;
  }

  n.value = n.target + x;
  n.velocity = v;
  n.setter(n.value);
}

export function createSpring(
  setter: (value: number) => void,
  config: SpringConfig,
  initial = 0,
): Spring {
  const n: Node = {
    setter,
    w0: 0,
    zeta: 1,
    restDelta: 0.01,
    restSpeed: 0.1,
    x0: 0,
    v0: 0,
    t0: 0,
    target: initial,
    value: initial,
    velocity: 0,
    active: false,
  };
  tune(n, config);

  return {
    set(target) {
      if (target === n.target && !n.active) return;
      n.target = target;
      rebase(n);
      wake(n);
    },
    jump(value) {
      n.target = value;
      n.value = value;
      n.velocity = 0;
      sleep(n);
      setter(value);
    },
    retune(next) {
      tune(n, next);
      if (n.active) rebase(n);
    },
    get value() {
      return n.value;
    },
    get velocity() {
      return n.velocity;
    },
    get target() {
      return n.target;
    },
    get active() {
      return n.active;
    },
    kill() {
      sleep(n);
    },
  };
}
