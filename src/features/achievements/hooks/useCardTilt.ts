// =============================================================
// ORVAX · useCardTilt — 3D tilt interativo · parallax + glare position.
//
// Rastreia pointer (mouse + touch + pen) sobre a carta e calcula:
//   · rotação X/Y em graus
//   · posição do glare (% no card)
//   · intensidade do efeito (% de afastamento do centro)
//
// Tudo via requestAnimationFrame · suave · sem lag.
// =============================================================
import { useRef, useState, useCallback, useEffect } from 'react';

interface TiltState {
  /** rotateX em graus */
  rotX: number;
  /** rotateY em graus */
  rotY: number;
  /** % posição do glare (0..100) */
  glareX: number;
  glareY: number;
  /** intensidade 0..1 (distância do centro) */
  intensity: number;
  /** se está sendo tocado */
  active: boolean;
}

interface Options {
  /** ângulo máximo em graus · default 14 */
  maxTilt?: number;
  /** se true, desativa o tilt (ex: em sealed mode) */
  disabled?: boolean;
}

const REST: TiltState = { rotX: 0, rotY: 0, glareX: 50, glareY: 50, intensity: 0, active: false };

export function useCardTilt({ maxTilt = 14, disabled }: Options = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<TiltState>(REST);
  const rafRef = useRef<number | null>(null);
  const lastEvent = useRef<{ x: number; y: number } | null>(null);

  // throttle via rAF · preserva 60fps mesmo com muitos pointermoves
  const scheduleUpdate = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!ref.current || !lastEvent.current) return;
      const rect = ref.current.getBoundingClientRect();
      // -0.5 .. 0.5 (centro = 0)
      const nx = (lastEvent.current.x - rect.left) / rect.width  - 0.5;
      const ny = (lastEvent.current.y - rect.top)  / rect.height - 0.5;
      // clamp
      const cx = Math.max(-0.5, Math.min(0.5, nx));
      const cy = Math.max(-0.5, Math.min(0.5, ny));
      const intensity = Math.min(1, Math.sqrt(cx * cx + cy * cy) * 2);
      setTilt({
        // Y move horizontal → rotateY · X move vertical → rotateX (invertido para "lean back")
        rotX: -cy * maxTilt,
        rotY:  cx * maxTilt,
        glareX: (cx + 0.5) * 100,
        glareY: (cy + 0.5) * 100,
        intensity,
        active: true,
      });
    });
  }, [maxTilt]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    lastEvent.current = { x: e.clientX, y: e.clientY };
    scheduleUpdate();
  }, [disabled, scheduleUpdate]);

  const onPointerLeave = useCallback(() => {
    if (disabled) return;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastEvent.current = null;
    setTilt(REST);
  }, [disabled]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Reset quando disabled flips
  useEffect(() => {
    if (disabled) setTilt(REST);
  }, [disabled]);

  return {
    ref,
    tilt,
    handlers: {
      onPointerMove,
      onPointerLeave,
      onPointerCancel: onPointerLeave,
    },
  };
}
