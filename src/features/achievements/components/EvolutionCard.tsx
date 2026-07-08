// =============================================================
// ORVAX · EvolutionCard — carta de rank com 3D tilt + holographic.
//
// Modos:
//   · "sealed"   → camada de raspadinha em canvas (interativo · sem tilt)
//   · "revealed" → conteúdo da carta visível com glow + tilt
//   · "locked"   → bloqueada com cadeado · tilt ativo
//   · "preview"  → unlocked sem interação · tilt ativo
//
// Premium · branco/preto + esmeralda cirúrgico ·
// 3D tilt (parallax) + glare radial + faixa holographic diagonal +
// IconBadge com concentric rings + tick marks + guilloche · sparkles.
// =============================================================
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Lock, Sparkles as SparkleIcon } from 'lucide-react';
import type { Rank } from '../data/ranks';
import { useScratchToReveal } from '../hooks/useScratchToReveal';
import { useCardTilt } from '../hooks/useCardTilt';

const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

type Mode = 'sealed' | 'revealed' | 'locked' | 'preview';

interface BaseProps {
  rank: Rank;
  width?:  number;
  height?: number;
  className?: string;
  /** habilita parallax 3D · default true (exceto sealed que é sempre false) */
  tilt?: boolean;
  /** se true, a carta herda o tamanho do parent · útil em grids · default false */
  fill?: boolean;
}

interface SealedProps extends BaseProps {
  mode: 'sealed';
  onReveal?: () => void;
}
interface RevealedProps extends BaseProps {
  mode: 'revealed';
  unlockedAt?: string;
}
interface LockedProps extends BaseProps {
  mode: 'locked';
  currentXp: number;
}
interface PreviewProps extends BaseProps {
  mode: 'preview';
  unlockedAt?: string;
}

type Props = SealedProps | RevealedProps | LockedProps | PreviewProps;

// Roman numerals
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
function toRoman(n: number): string { return ROMAN[n - 1] ?? String(n); }

// Tier do arquétipo · pra indicador de 4 níveis (Início → Lenda)
const ARCH_TIER: Record<string, number> = { inicio: 1, forja: 2, comando: 3, lenda: 4 };

// Lucide icon getter
function getIcon(name: string): React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }> {
  const map = Icons as unknown as Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>>;
  return map[name] ?? Icons.Star;
}

// =============================================================
// IconBadge · concentric rings + tick marks · "watch dial"
// =============================================================
function IconBadge({
  Icon, dim,
}: {
  Icon: ReturnType<typeof getIcon>;
  dim?: boolean;
}) {
  const tickColor = dim
    ? 'bg-zinc-300 dark:bg-zinc-700'
    : 'bg-zinc-500 dark:bg-zinc-400';
  return (
    <div className="relative w-[78px] h-[78px]">
      {/* Outer dotted ring */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 80">
        <circle
          cx="40" cy="40" r="38.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeDasharray="0.5 1.7"
          className={dim ? 'text-zinc-300 dark:text-zinc-700' : 'text-zinc-400 dark:text-zinc-500'}
        />
      </svg>

      {/* Middle thin ring */}
      <div className={[
        'absolute inset-[8%] rounded-full border',
        dim
          ? 'border-zinc-200 dark:border-zinc-800/60'
          : 'border-zinc-200 dark:border-zinc-700',
      ].join(' ')} />

      {/* Tick marks · 12 / 3 / 6 / 9 */}
      {[0, 90, 180, 270].map((deg) => (
        <span
          key={deg}
          className={`absolute left-1/2 top-1/2 ${tickColor}`}
          style={{
            width: 1, height: 4,
            transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-37px)`,
          }}
        />
      ))}

      {/* Sub-tick marks · 12-divisions (relógio) */}
      {[30, 60, 120, 150, 210, 240, 300, 330].map((deg) => (
        <span
          key={deg}
          className={`absolute left-1/2 top-1/2 ${dim ? 'bg-zinc-200 dark:bg-zinc-800' : 'bg-zinc-300 dark:bg-zinc-600'}`}
          style={{
            width: 1, height: 2,
            transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-37px)`,
          }}
        />
      ))}

      {/* Inner solid ring · onde o ícone vive */}
      <div className={[
        'absolute inset-[20%] rounded-full border',
        dim
          ? 'border-zinc-200 dark:border-zinc-800'
          : 'border-zinc-300 dark:border-zinc-700',
      ].join(' ')}>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon
            size={26}
            strokeWidth={1.4}
            className={dim
              ? 'text-zinc-300 dark:text-zinc-700'
              : 'text-zinc-950 dark:text-white'}
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Guilloche · pattern de banknote · linhas senoidais finas
// =============================================================
function Guilloche({ patternId }: { patternId: string }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none
        text-zinc-900 dark:text-white opacity-[0.07] dark:opacity-[0.10]"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id={patternId} patternUnits="userSpaceOnUse" width="22" height="14">
          <path d="M 0 7 Q 5.5 0, 11 7 T 22 7"   fill="none" stroke="currentColor" strokeWidth="0.35" />
          <path d="M 0 7 Q 5.5 14, 11 7 T 22 7"  fill="none" stroke="currentColor" strokeWidth="0.35" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

// =============================================================
// Sparkles · 5 estrelinhas posicionadas com twinkle staggered
// =============================================================
const SPARKLE_POSITIONS = [
  { x: '10%', y: '18%', size: 4, delay: 0   },
  { x: '88%', y: '24%', size: 5, delay: 0.4 },
  { x: '15%', y: '58%', size: 3, delay: 0.8 },
  { x: '85%', y: '70%', size: 4, delay: 1.2 },
  { x: '50%', y: '12%', size: 3, delay: 0.2 },
];

function SparkleField() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {SPARKLE_POSITIONS.map((s, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: s.x, top: s.y, width: s.size, height: s.size }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1.3, 0.7] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: s.delay,
          }}
        >
          <svg viewBox="0 0 10 10" className="w-full h-full text-emerald-400 dark:text-emerald-300">
            <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="currentColor" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

// =============================================================
// Holographic overlay layers · responde ao tilt
// =============================================================
function HolographicLayers({
  glareX, glareY, intensity, active, rotY,
}: {
  glareX: number; glareY: number;
  intensity: number; active: boolean; rotY: number;
}) {
  const angle = 110 + rotY * 4;
  return (
    <>
      {/* Faixa holographic diagonal · responde ao ângulo */}
      <div
        className="absolute inset-0 pointer-events-none rounded-3xl"
        style={{
          background: `linear-gradient(${angle}deg,
            transparent 32%,
            rgba(16,185,129,${0.08 + intensity * 0.10}) 47%,
            rgba(255,255,255,${0.06 + intensity * 0.08}) 52%,
            rgba(167,139,250,${0.06 + intensity * 0.08}) 57%,
            transparent 70%)`,
          mixBlendMode: 'screen',
          opacity: 0.7 + intensity * 0.3,
          transition: active ? 'none' : 'opacity 0.5s ease, background 0.5s ease',
        }}
      />

      {/* Glare radial · segue o pointer */}
      <div
        className="absolute inset-0 pointer-events-none rounded-3xl"
        style={{
          background: `radial-gradient(circle at ${glareX}% ${glareY}%,
            rgba(255,255,255,${active ? 0.22 : 0}) 0%,
            rgba(255,255,255,${active ? 0.06 : 0}) 25%,
            transparent 55%)`,
          mixBlendMode: 'overlay',
          transition: active ? 'none' : 'background 0.5s ease',
        }}
      />

      {/* Counter-glare embaixo · adiciona profundidade no oposto */}
      <div
        className="absolute inset-0 pointer-events-none rounded-3xl"
        style={{
          background: `radial-gradient(circle at ${100 - glareX}% ${100 - glareY}%,
            rgba(0,0,0,${active ? 0.12 : 0}) 0%,
            transparent 50%)`,
          mixBlendMode: 'multiply',
          transition: active ? 'none' : 'background 0.5s ease',
        }}
      />
    </>
  );
}

// =============================================================
// Corner mark
// =============================================================
function CornerMark({ className, dim }: { className: string; dim?: boolean }) {
  const color = dim
    ? 'bg-zinc-200 dark:bg-zinc-800'
    : 'bg-zinc-300 dark:bg-zinc-700';
  return (
    <div className={`absolute pointer-events-none ${className}`}>
      <div className="relative w-[12px] h-[12px]">
        <span className={`absolute top-1/2 left-0 w-full h-px ${color}`} />
        <span className={`absolute left-1/2 top-0 w-px h-full ${color}`} />
      </div>
    </div>
  );
}

// =============================================================
// CardFace · conteúdo principal · revelado/preview
// =============================================================
function CardFace({ rank, dim }: { rank: Rank; dim?: boolean }) {
  const Icon = getIcon(rank.icon);
  const patternId = `guill-${rank.slug}`;
  return (
    <div className={[
      'absolute inset-0 rounded-3xl overflow-hidden',
      'bg-white dark:bg-zinc-950',
      'flex flex-col',
    ].join(' ')}>
      {/* Guilloche pattern · banknote texture */}
      <Guilloche patternId={patternId} />

      {/* Inner double-frame · hairlines aninhadas */}
      <div className="absolute inset-3 rounded-2xl
        border border-zinc-200/80 dark:border-zinc-800/80
        pointer-events-none" />
      <div className="absolute inset-[14px] rounded-[14px]
        border border-zinc-100 dark:border-zinc-900
        pointer-events-none" />

      {/* Cantos */}
      <CornerMark className="top-5 left-5"     dim={dim} />
      <CornerMark className="top-5 right-5"    dim={dim} />
      <CornerMark className="bottom-5 left-5"  dim={dim} />
      <CornerMark className="bottom-5 right-5" dim={dim} />

      {/* TOP BAR · masthead */}
      <div className="relative px-7 pt-7 flex items-center justify-between">
        <p className={[
          'text-[8px] font-mono tracking-[0.32em] uppercase',
          dim ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-500',
        ].join(' ')}>
          ORVAX · EVOLUTION
        </p>
        <p className={[
          'text-[8px] font-mono tracking-[0.28em] uppercase tabular-nums',
          dim ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-500',
        ].join(' ')}>
          {toRoman(rank.ordinal)} <span className="opacity-50">/</span> XII
        </p>
      </div>

      {/* Hairline top */}
      <div className="relative mx-7 mt-3 h-px bg-zinc-200 dark:bg-zinc-800" />

      {/* CENTER · icon + nome + frase */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Tier indicator · 4 níveis de arquétipo */}
        <div className="flex items-center gap-1.5 mb-4">
          {[1, 2, 3, 4].map((t) => {
            const reached = (ARCH_TIER[rank.archetype] ?? 1) >= t;
            return (
              <span
                key={t}
                className="rounded-full transition-all"
                style={{
                  width: reached ? 7 : 5,
                  height: reached ? 7 : 5,
                  backgroundColor: dim
                    ? 'var(--border-color)'
                    : reached ? '#10B981' : 'transparent',
                  border: reached ? 'none' : '1px solid currentColor',
                  opacity: dim ? 0.4 : reached ? 1 : 0.25,
                }}
              />
            );
          })}
        </div>

        <div className="mb-6">
          <IconBadge Icon={Icon} dim={dim} />
        </div>

        {/* Rank name · monumental, com gradient sheen no dark mode */}
        <h2
          className={[
            'font-black uppercase leading-none',
            rank.name.length >= 12 ? 'text-[26px]' : rank.name.length >= 10 ? 'text-[28px]' : 'text-[32px]',
            'tracking-[0.02em]',
            dim
              ? 'text-zinc-300 dark:text-zinc-700'
              : 'text-zinc-950 dark:text-white',
          ].join(' ')}
          style={!dim ? {
            // Subtle inner shadow · "engraved" feel
            textShadow: '0 1px 0 rgba(255,255,255,0.05), 0 -1px 0 rgba(0,0,0,0.08)',
          } : undefined}
        >
          {rank.name}
        </h2>

        {/* Subtitle italic · aspas francesas */}
        <p className={[
          'mt-4 text-[11px] font-mono italic max-w-[80%] leading-snug',
          dim ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-500',
        ].join(' ')}>
          «&nbsp;{rank.subtitle}&nbsp;»
        </p>
      </div>

      {/* Hairline bottom */}
      <div className="relative mx-7 mb-3 h-px bg-zinc-200 dark:bg-zinc-800" />

      {/* BOTTOM BAR · arquétipo + edition + XP */}
      <div className="relative px-7 pb-7 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={[
            'w-1.5 h-1.5 rounded-full',
            dim
              ? 'bg-zinc-400 dark:bg-zinc-700'
              : 'bg-emerald-500',
          ].join(' ')} />
          <p className={[
            'text-[8px] font-mono tracking-[0.32em] uppercase',
            dim ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-500',
          ].join(' ')}>
            {rank.archetype}
          </p>
        </div>
        <p className={[
          'text-[8px] font-mono tracking-[0.22em] uppercase tabular-nums',
          dim ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-500',
        ].join(' ')}>
          № {String(rank.ordinal).padStart(3, '0')} · {rank.xpRequired.toLocaleString('pt-BR')} XP
        </p>
      </div>
    </div>
  );
}

// =============================================================
// LOCKED Face
// =============================================================
function LockedFace({ rank, currentXp }: { rank: Rank; currentXp: number }) {
  const Icon = getIcon(rank.icon);
  const remaining = Math.max(0, rank.xpRequired - currentXp);
  const pct = rank.xpRequired > 0 ? Math.max(0, Math.min(1, currentXp / rank.xpRequired)) : 0;
  const patternId = `guill-locked-${rank.slug}`;
  return (
    <div className={[
      'absolute inset-0 rounded-3xl overflow-hidden',
      'bg-white dark:bg-zinc-950',
      'flex flex-col',
    ].join(' ')}>
      {/* Guilloche · mais sutil */}
      <div className="opacity-50">
        <Guilloche patternId={patternId} />
      </div>

      {/* Frame interno tracejado · sinaliza "pendente" */}
      <div className="absolute inset-3 rounded-2xl
        border border-dashed border-zinc-300 dark:border-zinc-800
        pointer-events-none" />

      <CornerMark className="top-5 left-5"     dim />
      <CornerMark className="top-5 right-5"    dim />
      <CornerMark className="bottom-5 left-5"  dim />
      <CornerMark className="bottom-5 right-5" dim />

      <div className="relative px-7 pt-7 flex items-center justify-between">
        <p className="text-[8px] font-mono tracking-[0.32em] uppercase
          text-zinc-400 dark:text-zinc-600">
          ORVAX · LOCKED
        </p>
        <p className="text-[8px] font-mono tracking-[0.28em] uppercase tabular-nums
          text-zinc-400 dark:text-zinc-600">
          {toRoman(rank.ordinal)} <span className="opacity-50">/</span> XII
        </p>
      </div>

      <div className="relative mx-7 mt-3 h-px bg-zinc-200 dark:bg-zinc-800" />

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Icon dimmed + cadeado mini */}
        <div className="relative mb-6">
          <IconBadge Icon={Icon} dim />
          <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full
            bg-white dark:bg-zinc-950
            border border-zinc-300 dark:border-zinc-700
            flex items-center justify-center shadow-sm">
            <Lock size={10} strokeWidth={2} className="text-zinc-500 dark:text-zinc-500" />
          </div>
        </div>

        {/* Progresso até o desbloqueio */}
        <div className="w-2/3 mt-1">
          <div className="h-[3px] rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500/70 transition-all duration-700"
              style={{ width: `${pct * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] font-mono font-bold tabular-nums text-zinc-500 dark:text-zinc-400">
            {Math.round(pct * 100)}%
          </p>
        </div>

        <p className="mt-2 text-[10px] font-mono italic
          text-zinc-400 dark:text-zinc-600">
          requer {rank.xpRequired.toLocaleString('pt-BR')} XP
        </p>
      </div>

      <div className="relative mx-7 mb-3 h-px bg-zinc-200 dark:bg-zinc-800" />

      <div className="relative px-7 pb-7 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <p className="text-[8px] font-mono tracking-[0.32em] uppercase
            text-zinc-400 dark:text-zinc-600">
            {rank.archetype}
          </p>
        </div>
        <p className="text-[8px] font-mono tracking-[0.22em] uppercase tabular-nums
          text-zinc-500 dark:text-zinc-500">
          faltam {remaining.toLocaleString('pt-BR')}
        </p>
      </div>
    </div>
  );
}

// =============================================================
// TiltShell · wrapper que aplica perspective + rotateX/Y
// =============================================================
function TiltShell({
  children, width, height, fill, className, enabled, intensified,
}: {
  children: (params: {
    glareX: number; glareY: number;
    intensity: number; active: boolean; rotY: number;
  }) => React.ReactNode;
  width: number; height: number;
  fill?: boolean;
  className?: string;
  enabled: boolean;
  /** quando true, mostra glow esmeralda intensificado atrás (mode revealed) */
  intensified?: boolean;
}) {
  const { ref, tilt, handlers } = useCardTilt({
    maxTilt: 14,
    disabled: !enabled,
  });

  return (
    <div
      style={{
        width:  fill ? '100%' : width,
        height: fill ? '100%' : height,
        perspective: 1200,
      }}
      className={['relative select-none', className || ''].join(' ')}
    >
      {/* Glow halo atrás · sutil · intensifica com tilt */}
      {intensified && (
        <div
          className="absolute inset-0 rounded-3xl bg-emerald-500/20 blur-2xl pointer-events-none"
          style={{
            transform: `scale(${1.05 + tilt.intensity * 0.15})`,
            opacity: 0.4 + tilt.intensity * 0.4,
            transition: tilt.active ? 'none' : 'transform 0.4s ease, opacity 0.4s ease',
          }}
        />
      )}

      <div
        ref={ref}
        {...(enabled ? handlers : {})}
        className="relative w-full h-full rounded-3xl"
        style={{
          transform: enabled
            ? `rotateX(${tilt.rotX}deg) rotateY(${tilt.rotY}deg)`
            : undefined,
          transformStyle: 'preserve-3d',
          transition: tilt.active ? 'none' : 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
          touchAction: enabled ? 'pan-y' : 'auto',
          willChange: enabled ? 'transform' : undefined,
        }}
      >
        {children(tilt)}
      </div>
    </div>
  );
}

// =============================================================
// EvolutionCard · ROOT
// =============================================================
export function EvolutionCard(props: Props) {
  const { rank, width = 280, height = 380, className, fill } = props;
  const tiltEnabled = props.mode !== 'sealed' && props.tilt !== false;

  // ─── SEALED (raspadinha · sem tilt) ─────────────────────────
  if (props.mode === 'sealed') {
    return <SealedCard {...props} width={width} height={height} className={className} fill={fill} />;
  }

  // ─── LOCKED ─────────────────────────────────────────────────
  if (props.mode === 'locked') {
    return (
      <TiltShell
        width={width}
        height={height}
        fill={fill}
        className={className}
        enabled={tiltEnabled}
      >
        {(tilt) => (
          <>
            <LockedFace rank={rank} currentXp={props.currentXp} />
            <HolographicLayers
              glareX={tilt.glareX}
              glareY={tilt.glareY}
              intensity={tilt.intensity * 0.5}
              active={tilt.active}
              rotY={tilt.rotY}
            />
          </>
        )}
      </TiltShell>
    );
  }

  // ─── PREVIEW ────────────────────────────────────────────────
  if (props.mode === 'preview') {
    return (
      <TiltShell
        width={width}
        height={height}
        fill={fill}
        className={className}
        enabled={tiltEnabled}
        intensified
      >
        {(tilt) => (
          <>
            <CardFace rank={rank} />
            <SparkleField />
            <HolographicLayers
              glareX={tilt.glareX}
              glareY={tilt.glareY}
              intensity={tilt.intensity}
              active={tilt.active}
              rotY={tilt.rotY}
            />
            {props.unlockedAt && (
              <div className="absolute top-4 right-4 z-20 px-2 py-0.5 rounded-full
                bg-emerald-500/90 text-white text-[8px] font-mono tracking-wider uppercase
                shadow-md shadow-emerald-500/30">
                {props.unlockedAt}
              </div>
            )}
          </>
        )}
      </TiltShell>
    );
  }

  // ─── REVEALED ───────────────────────────────────────────────
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.45, ease: 'backOut' }}
    >
      <TiltShell
        width={width}
        height={height}
        fill={fill}
        className={className}
        enabled={tiltEnabled}
        intensified
      >
        {(tilt) => (
          <>
            <CardFace rank={rank} />
            <SparkleField />
            <HolographicLayers
              glareX={tilt.glareX}
              glareY={tilt.glareY}
              intensity={tilt.intensity}
              active={tilt.active}
              rotY={tilt.rotY}
            />
            {props.unlockedAt && (
              <div className="absolute top-4 right-4 z-20 px-2 py-0.5 rounded-full
                bg-emerald-500/90 text-white text-[8px] font-mono tracking-wider uppercase
                shadow-md shadow-emerald-500/30">
                {props.unlockedAt}
              </div>
            )}
          </>
        )}
      </TiltShell>
    </motion.div>
  );
}

// =============================================================
// SealedCard · só raspadinha · sem tilt (não confundir interação)
// =============================================================
function SealedCard({
  rank, width = 280, height = 380, fill, className, onReveal,
}: SealedProps) {
  const { canvasRef, progress, revealed, forceReveal } = useScratchToReveal({
    threshold: 0.55,
    brushSize: 36,
    disabled: false,
    onReveal,
  });

  return (
    <div
      className={['relative select-none', className || ''].join(' ')}
      style={{
        width:  fill ? '100%' : width,
        height: fill ? '100%' : height,
        touchAction: 'none',
      }}
    >
      {/* Camada inferior · CardFace */}
      <CardFace rank={rank} />

      {/* Camada superior · canvas raspável */}
      <canvas
        ref={canvasRef}
        width={width  * 2}
        height={height * 2}
        className="absolute inset-0 w-full h-full rounded-3xl cursor-pointer"
        style={{ touchAction: 'none' }}
      />

      {/* Pulse pointer · indica tap target */}
      {progress < 0.04 && !revealed && (
        <div className="absolute inset-0 pointer-events-none
          flex items-center justify-center rounded-3xl">
          <motion.div
            className="w-14 h-14 rounded-full border-2 border-emerald-400/70
              flex items-center justify-center backdrop-blur-sm bg-emerald-500/10"
            animate={{ scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <SparkleIcon size={20} className="text-emerald-300" />
          </motion.div>
        </div>
      )}

      {/* Progress bar · só durante raspagem */}
      {progress > 0.04 && !revealed && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-2/3
          h-1 rounded-full bg-zinc-700/60 overflow-hidden pointer-events-none">
          <div
            className="h-full bg-emerald-400 transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {/* Botão de revelar tudo · após 30% */}
      {progress > 0.30 && !revealed && (
        <button
          type="button"
          onClick={forceReveal}
          className="absolute bottom-3 right-3 z-20 px-3 py-1.5 rounded-full
            bg-emerald-500 text-white text-[10px] font-mono font-bold
            tracking-widest uppercase shadow-lg shadow-emerald-500/30
            hover:scale-105 active:scale-95 transition-transform"
        >
          revelar
        </button>
      )}
    </div>
  );
}
