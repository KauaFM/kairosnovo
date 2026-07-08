// =============================================================
// ORVAX · useScratchToReveal — interação tipo raspadinha em canvas.
//
// Pinta uma camada de cobertura sobre a carta · usuário arrasta o dedo
// (pointermove) e os pixels são apagados via destination-out.
// Quando ~55% foi raspado, dispara onReveal e completa o sweep.
//
// Mobile-first · pointer events só (suporta touch + mouse + pen).
// =============================================================
import { useEffect, useRef, useState, useCallback } from 'react';

interface Options {
  /** % (0..1) de pixels apagados pra disparar onReveal · default 0.55 */
  threshold?: number;
  /** raio do "dedo" em px · default 32 */
  brushSize?: number;
  /** chamado uma vez quando o threshold é atingido */
  onReveal?: () => void;
  /** se true, ignora interação (carta já revelada) */
  disabled?: boolean;
}

interface Result {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** progresso 0..1 atualizado em tempo real (60% throttled) */
  progress: number;
  /** true quando threshold foi atingido */
  revealed: boolean;
  /** força revelação imediata (botão "revelar tudo") */
  forceReveal: () => void;
  /** reseta a camada de cobertura (re-empacotar a carta) */
  reset: () => void;
}

/**
 * Pinta uma camada de "tinta de raspadinha" no canvas.
 * Gradient escuro com brilho metálico + textura sutil.
 */
function paintCover(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.globalCompositeOperation = 'source-over';
  // base · gradient diagonal sutil entre tons quase iguais (zinc-950 → zinc-900)
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0,    '#09090b');  // zinc-950
  grad.addColorStop(0.5,  '#18181b');  // zinc-900
  grad.addColorStop(1,    '#09090b');  // zinc-950
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // textura · pontilhado fino · monocromático
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  const dotSpacing = 10;
  for (let y = 0; y < h; y += dotSpacing) {
    for (let x = 0; x < w; x += dotSpacing) {
      if ((x + y) % 20 === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // halo esmeralda discreto · só sugere "vivo"
  const shimmer = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.50);
  shimmer.addColorStop(0,    'rgba(16,185,129,0.10)');
  shimmer.addColorStop(0.7,  'rgba(16,185,129,0.02)');
  shimmer.addColorStop(1,    'rgba(16,185,129,0)');
  ctx.fillStyle = shimmer;
  ctx.fillRect(0, 0, w, h);

  // Hairline interno · criando o "frame" da carta mesmo selada
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = Math.max(1, w * 0.0025);
  const inset = Math.round(w * 0.045);
  // border-radius simulado via rect arredondado manual
  const r = Math.round(w * 0.045);
  ctx.beginPath();
  ctx.moveTo(inset + r, inset);
  ctx.lineTo(w - inset - r, inset);
  ctx.quadraticCurveTo(w - inset, inset, w - inset, inset + r);
  ctx.lineTo(w - inset, h - inset - r);
  ctx.quadraticCurveTo(w - inset, h - inset, w - inset - r, h - inset);
  ctx.lineTo(inset + r, h - inset);
  ctx.quadraticCurveTo(inset, h - inset, inset, h - inset - r);
  ctx.lineTo(inset, inset + r);
  ctx.quadraticCurveTo(inset, inset, inset + r, inset);
  ctx.stroke();
  ctx.restore();

  // Top label · "ORVAX · SEALED"
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.40)';
  ctx.font = `bold ${Math.round(w * 0.028)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('ORVAX · SEALED', w / 2, inset + Math.round(w * 0.06));
  ctx.restore();

  // Marca d'água central · "RASPE PARA REVELAR" letter-spaced
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.font = `900 ${Math.round(w * 0.07)}px ui-sans-serif, system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // letter-spacing simulado
  ctx.fillText('R A S P E', w / 2, h / 2 - Math.round(w * 0.045));
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.font = `bold ${Math.round(w * 0.038)}px ui-monospace, monospace`;
  ctx.fillText('PARA  REVELAR', w / 2, h / 2 + Math.round(w * 0.025));
  ctx.restore();

  // Linha esmeralda fina embaixo · único acento de cor
  ctx.save();
  ctx.strokeStyle = 'rgba(16,185,129,0.55)';
  ctx.lineWidth = Math.max(1, w * 0.005);
  ctx.beginPath();
  const lineY = h - Math.round(w * 0.18);
  const lineL = w * 0.36;
  const lineR = w * 0.64;
  ctx.moveTo(lineL, lineY);
  ctx.lineTo(lineR, lineY);
  ctx.stroke();
  ctx.restore();
}

export function useScratchToReveal({
  threshold = 0.55, brushSize = 32, onReveal, disabled,
}: Options = {}): Result {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const completed = useRef(false);
  const sampleAccumulator = useRef(0);

  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);

  // Pinta cobertura inicial
  const initCover = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Reset estado
    completed.current = false;
    sampleAccumulator.current = 0;
    setProgress(0);
    setRevealed(false);
    paintCover(ctx, canvas.width, canvas.height);
  }, []);

  const reset = useCallback(() => initCover(), [initCover]);

  const forceReveal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (completed.current) return;
    completed.current = true;
    // Sweep clear · clear gradual
    let alpha = 1;
    const sweep = () => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0,0,0,${0.12})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      alpha -= 0.12;
      if (alpha > 0) {
        requestAnimationFrame(sweep);
      } else {
        // Limpar de vez · garantir alpha 0 em todos os pixels
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setProgress(1);
        setRevealed(true);
        onReveal?.();
      }
    };
    requestAnimationFrame(sweep);
  }, [onReveal]);

  // Conta pixels apagados · amostragem cada 32 bytes (a cada 8 pixels) pra performance
  const measureProgress = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let cleared = 0;
    let total   = 0;
    for (let i = 3; i < img.data.length; i += 32) {
      total++;
      if (img.data[i] === 0) cleared++;
    }
    return total === 0 ? 0 : cleared / total;
  }, []);

  // Desenha um arco apagando o cover entre dois pontos
  const drawScratch = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap   = 'round';
    ctx.lineJoin  = 'round';
    ctx.lineWidth = brushSize;
    if (lastPoint.current) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    // Stamp arc no ponto atual pra cobrir tap único
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    lastPoint.current = { x, y };
  }, [brushSize]);

  // Coordenadas pointer → coords do canvas
  const pointToCanvas = (e: PointerEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const sx   = canvas.width  / rect.width;
    const sy   = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top)  * sy,
    };
  };

  useEffect(() => {
    initCover();
  }, [initCover]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (disabled) return;

    const onDown = (e: PointerEvent) => {
      if (completed.current) return;
      e.preventDefault();
      isDrawing.current = true;
      const p = pointToCanvas(e, canvas);
      lastPoint.current = p;
      drawScratch(p.x, p.y);
      try { canvas.setPointerCapture(e.pointerId); } catch { /* noop */ }
    };

    const onMove = (e: PointerEvent) => {
      if (!isDrawing.current) return;
      if (completed.current) return;
      e.preventDefault();
      const p = pointToCanvas(e, canvas);
      drawScratch(p.x, p.y);

      // Throttle progress check · 1 a cada 4 movimentos
      sampleAccumulator.current++;
      if (sampleAccumulator.current % 4 === 0) {
        const pct = measureProgress();
        setProgress(pct);
        if (pct >= threshold && !completed.current) {
          completed.current = true;
          forceReveal();
        }
      }
    };

    const onUp = (e: PointerEvent) => {
      isDrawing.current = false;
      lastPoint.current = null;
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    };

    canvas.addEventListener('pointerdown',   onDown,  { passive: false });
    canvas.addEventListener('pointermove',   onMove,  { passive: false });
    canvas.addEventListener('pointerup',     onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave',  onUp);

    return () => {
      canvas.removeEventListener('pointerdown',   onDown);
      canvas.removeEventListener('pointermove',   onMove);
      canvas.removeEventListener('pointerup',     onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave',  onUp);
    };
  }, [disabled, drawScratch, measureProgress, threshold, forceReveal]);

  return { canvasRef, progress, revealed, forceReveal, reset };
}
