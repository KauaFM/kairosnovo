// =============================================================
// ORVAX · AnimatedScore — CountUp + cor dinâmica + pulse
// Framer Motion useSpring para contagem suave.
// =============================================================
import { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface Props {
  value: number;       // 0-100
  className?: string;
  delay?: number;      // ms before starting
}

function scoreColor(v: number): string {
  if (v <= 40) return '#ef4444';  // red
  if (v <= 70) return '#eab308';  // yellow
  return '#22c55e';               // green
}

export function AnimatedScore({ value, className = '', delay = 0 }: Props) {
  const spring = useSpring(0, { stiffness: 40, damping: 18 });
  const display = useTransform(spring, (v) => Math.round(v));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => spring.set(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay, spring]);

  const color = scoreColor(value);

  return (
    <div className={`relative inline-flex items-baseline gap-1.5 ${className}`}>
      <motion.span
        ref={ref}
        className="font-mono font-bold tabular-nums tracking-tighter leading-none"
        style={{ color }}
      >
        {display}
      </motion.span>
      <span className="text-[18px] font-mono text-zinc-400 dark:text-zinc-500">/100</span>

      {/* Pulse ring on complete */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 0.15, 0], scale: [0.8, 1.3, 1.5] }}
        transition={{ delay: (delay / 1000) + 0.8, duration: 0.8, ease: 'easeOut' }}
        style={{ border: `2px solid ${color}` }}
      />
    </div>
  );
}
