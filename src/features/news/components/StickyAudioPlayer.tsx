import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, ChevronUp, ChevronDown, Volume2, VolumeX, X } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   STICKY AUDIO PLAYER — ORVAX

   Arquitetura de som:
   - LOFI: HTML5 Audio element (nosso controle total)
   - YOUTUBE: Iframe embed PERSISTENTE renderizado aqui
     (não no drawer). O iframe fica sempre montado para o som
     não parar. O player expande/colapsa para mostrar/esconder
     o iframe.
   ═══════════════════════════════════════════════════════════════ */

export type AudioSource = 'lofi' | 'youtube';

export interface AudioPlayerState {
  activeSource: AudioSource;
  isPlaying: boolean;
  isMuted: boolean;
  trackTitle: string;
  youtubeEmbedId: string | null;
}

export const INITIAL_AUDIO_STATE: AudioPlayerState = {
  activeSource: 'lofi',
  isPlaying: false,
  isMuted: false,
  trackTitle: 'ORVAX RADIO // DEEP FOCUS',
  youtubeEmbedId: null,
};

const STREAMS = [
  'https://play.streamafrica.net/lofiradio',
  'https://stream.zeno.fm/f3wvbbqmdg8uv',
  'https://ice2.somafm.com/lush-128-mp3',
];

interface Props {
  isDark: boolean;
  onOpenDrawer: () => void;
  state: AudioPlayerState;
  onStateChange: (patch: Partial<AudioPlayerState>) => void;
}

/* ── Mini equalizer CSS ─────────────────────────────────────── */
function Eq({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-[2px] h-3 shrink-0">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-[2.5px] rounded-sm bg-zinc-400 dark:bg-zinc-500 origin-bottom transition-all"
          style={{
            height: playing ? undefined : 2,
            animation: playing ? `eq ${0.5 + i * 0.15}s ease-in-out infinite alternate` : 'none',
          }}
        />
      ))}
      {playing && (
        <style>{`@keyframes eq { 0% { height: 3px; } 100% { height: 12px; } }`}</style>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════ */
export function StickyAudioPlayer({ isDark, onOpenDrawer, state, onStateChange }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamIdx = useRef(0);
  const [expanded, setExpanded] = useState(false);

  const isEmbed = state.activeSource === 'youtube';
  const hasEmbed = state.activeSource === 'youtube' && !!state.youtubeEmbedId;

  /* ── Audio instance (lofi only) ─────────────────────────── */
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio();
      a.volume = 0.5;
      a.preload = 'none';
      audioRef.current = a;
    }
    return audioRef.current;
  }, []);

  /* ── Cleanup ────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) { a.pause(); a.src = ''; a.load(); audioRef.current = null; }
    };
  }, []);

  /* ── Sync mute ──────────────────────────────────────────── */
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = state.isMuted;
  }, [state.isMuted]);

  /* ── Stop lofi when switching to embed ──────────────────── */
  useEffect(() => {
    if (state.activeSource !== 'lofi') {
      const a = audioRef.current;
      if (a) { a.pause(); a.src = ''; a.load(); }
    }
  }, [state.activeSource]);

  /* ── Auto-expand when embed is activated ────────────────── */
  useEffect(() => {
    if (hasEmbed && isEmbed) setExpanded(true);
  }, [state.youtubeEmbedId]);

  /* ── Lofi play/pause ────────────────────────────────────── */
  const toggleLofi = useCallback(() => {
    const a = getAudio();
    if (state.isPlaying) {
      a.pause();
      a.src = '';
      a.load();
      onStateChange({ isPlaying: false });
    } else {
      streamIdx.current = 0;
      const tryStream = () => {
        if (streamIdx.current >= STREAMS.length) {
          onStateChange({ isPlaying: false });
          return;
        }
        a.src = STREAMS[streamIdx.current];
        a.play().catch(() => { streamIdx.current++; tryStream(); });
      };
      tryStream();
      onStateChange({ isPlaying: true });
    }
  }, [state.isPlaying, getAudio, onStateChange]);

  /* ── Close embed (volta pro lofi) ───────────────────────── */
  const closeEmbed = useCallback(() => {
    setExpanded(false);
    onStateChange({
      activeSource: 'lofi',
      isPlaying: false,
      trackTitle: 'ORVAX RADIO // DEEP FOCUS',
      youtubeEmbedId: null,
    });
  }, [onStateChange]);

  /* ── Embed URLs ─────────────────────────────────────────── */
  const youtubeUrl = state.youtubeEmbedId
    ? `https://www.youtube.com/embed/${state.youtubeEmbedId}?rel=0&modestbranding=1`
    : null;

  const srcLabel = { lofi: 'RADIO', youtube: 'YT' } as const;

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35, delay: 0.3 }}
      className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-[428px]
        bg-zinc-950 dark:bg-zinc-50
        border-t border-zinc-800/60 dark:border-zinc-200/60"
    >
      {/* ── Embed area (SEMPRE montado quando tem embed ativo,
           usa max-height para colapsar sem desmontar iframe,
           assim o som não para ao minimizar) ─────────────── */}
      {hasEmbed && (
        <div
          className="overflow-hidden relative transition-all duration-300 ease-in-out"
          style={{
            maxHeight: expanded ? 400 : 0,
            opacity: expanded ? 1 : 0,
          }}
        >
          {/* Close embed button */}
          <button
            onClick={closeEmbed}
            className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center
              bg-black/60 text-white hover:bg-black/80 transition-all active:scale-90 backdrop-blur-sm"
            aria-label="Fechar embed"
          >
            <X size={12} strokeWidth={2.5} />
          </button>

          {/* YouTube iframe */}
          {state.activeSource === 'youtube' && youtubeUrl && (
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                key={`yt-${state.youtubeEmbedId}`}
                src={youtubeUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                title="YouTube"
                className="absolute inset-0 w-full h-full"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Control bar ──────────────────────────────────── */}
      <div className="flex items-center h-[44px] px-2.5 gap-1.5">
        {/* Play/Pause (lofi) OR expand/collapse (embed) */}
        {state.activeSource === 'lofi' ? (
          <button
            onClick={toggleLofi}
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all active:scale-90
              bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            aria-label={state.isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {state.isPlaying
              ? <Pause size={14} strokeWidth={2.5} fill="currentColor" />
              : <Play size={14} strokeWidth={2.5} fill="currentColor" className="ml-0.5" />}
          </button>
        ) : (
          <button
            onClick={() => hasEmbed && setExpanded(!expanded)}
            disabled={!hasEmbed}
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all active:scale-90
              bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
              ${!hasEmbed ? 'opacity-25 cursor-not-allowed' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
            aria-label={expanded ? 'Minimizar' : 'Expandir player'}
          >
            {expanded ? <ChevronDown size={14} strokeWidth={2.5} /> : <ChevronUp size={14} strokeWidth={2.5} />}
          </button>
        )}

        {/* Eq */}
        <Eq playing={state.activeSource === 'lofi' ? state.isPlaying : (hasEmbed && expanded)} />

        {/* Title */}
        <div className="flex-1 min-w-0 mx-1.5">
          <p className="text-[9px] font-mono font-bold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500 truncate leading-none">
            {state.trackTitle}
          </p>
          {isEmbed && hasEmbed && !expanded && (
            <p className="text-[7px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mt-0.5">
              TOQUE PARA EXPANDIR
            </p>
          )}
        </div>

        {/* Source badge → abre drawer */}
        <button
          onClick={onOpenDrawer}
          className="text-[7px] font-mono font-black uppercase tracking-[0.15em] px-2 py-1 rounded-md shrink-0 transition-all active:scale-90
            bg-zinc-800 dark:bg-zinc-200 text-zinc-500 dark:text-zinc-500
            hover:bg-zinc-700 dark:hover:bg-zinc-300"
        >
          {srcLabel[state.activeSource]}
        </button>

        {/* Mute (lofi) */}
        {state.activeSource === 'lofi' && (
          <button
            onClick={() => onStateChange({ isMuted: !state.isMuted })}
            className="p-1 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-300 dark:hover:text-zinc-700 transition-colors active:scale-90 shrink-0"
            aria-label={state.isMuted ? 'Som' : 'Mudo'}
          >
            {state.isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
        )}

        {/* Drawer chevron */}
        <button
          onClick={onOpenDrawer}
          className="p-1 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-300 dark:hover:text-zinc-700 transition-colors active:scale-90 shrink-0"
          aria-label="Fonte de audio"
        >
          <ChevronUp size={14} />
        </button>
      </div>
    </motion.div>
  );
}
