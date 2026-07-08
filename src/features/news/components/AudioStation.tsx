import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Radio,
  Music2, Youtube, Link2, AlertTriangle,
  ChevronDown, ChevronUp, X,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   AUDIO STATION — ORVAX
   Widget compacto fixo no topo-esquerdo da tela do Blog.
   Design: pill escuro, album art circular, info + controls.
   ═══════════════════════════════════════════════════════════════ */

type Source = 'lofi' | 'youtube';

const LOFI_STREAMS = [
  { url: 'https://ice2.somafm.com/lush-128-mp3',          name: 'LUSH',         sub: 'SOMAFM' },
  { url: 'https://ice4.somafm.com/groovesalad-128-mp3',   name: 'GROOVE SALAD', sub: 'SOMAFM' },
  { url: 'https://ice2.somafm.com/dronezone-128-mp3',     name: 'DRONE ZONE',   sub: 'SOMAFM' },
  { url: 'https://ice6.somafm.com/deepspaceone-128-mp3',  name: 'DEEP SPACE',   sub: 'SOMAFM' },
];

/* ── URL Parsers ─────────────────────────────────────────────── */
function parseYT(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:music\.youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

/* ── Animated vinyl disc ─────────────────────────────────────── */
function Disc({ playing, source }: { playing: boolean; source: Source }) {
  return (
    <div className="relative w-[44px] h-[44px] shrink-0">
      <div className="absolute inset-0 rounded-full border border-white/10" />

      {source === 'lofi' && (
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-700 via-zinc-900 to-black flex items-center justify-center"
          animate={{ rotate: playing ? 360 : 0 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatType: 'loop' }}
        >
          <div className="absolute inset-[5px] rounded-full border border-white/5" />
          <div className="absolute inset-[11px] rounded-full border border-white/5" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-950 border border-white/10" />
        </motion.div>
      )}

      {source === 'youtube' && (
        <div className="absolute inset-0 rounded-full bg-red-600/20 flex items-center justify-center border border-red-500/30">
          <Youtube size={18} strokeWidth={1.5} className="text-red-500" />
        </div>
      )}

      {playing && (
        <motion.div
          className="absolute -inset-1 rounded-full border border-white/20"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  );
}

/* ── EQ bars ─────────────────────────────────────────────────── */
function EqBars({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-[2px] h-[10px]">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="w-[2px] bg-white/50 rounded-full origin-bottom"
          style={{
            height: playing ? undefined : 2,
            animation: playing ? `eq-anim ${0.4 + i * 0.12}s ease-in-out infinite alternate` : 'none',
          }}
        />
      ))}
    </div>
  );
}

/* ── Source selector drawer ──────────────────────────────────── */
function SourceDrawer({
  visible, source, setSource,
  lofiIdx, ytId,
  onSelectLofiStation, onActivateYt,
  ytInput, setYtInput, ytParsed,
}: {
  visible: boolean; source: Source;
  setSource: (s: Source) => void;
  lofiIdx: number; ytId: string | null;
  onSelectLofiStation: (i: number) => void;
  onActivateYt: () => void;
  ytInput: string; setYtInput: (v: string) => void;
  ytParsed: string | null;
}) {
  const tabs: { key: Source; label: string; icon: React.ComponentType<any> }[] = [
    { key: 'lofi',    label: 'LOFI',    icon: Radio },
    { key: 'youtube', label: 'YT',      icon: Youtube },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.18 }}
          className="absolute top-[calc(100%+8px)] left-0 w-[280px] z-50
            rounded-2xl overflow-hidden border border-white/10
            bg-zinc-900 shadow-2xl shadow-black/60"
        >
          {/* Tabs */}
          <div className="flex border-b border-white/[0.08]">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setSource(key)}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5
                  text-[8px] font-mono font-black uppercase tracking-widest transition-all
                  ${source === key
                    ? 'text-white border-b-2 border-white bg-white/5'
                    : 'text-white/30 hover:text-white/60 border-b-2 border-transparent'}`}
              >
                <Icon size={10} strokeWidth={2} /> {label}
              </button>
            ))}
          </div>

          <div className="p-3 max-h-[320px] overflow-y-auto">
            {/* ── LOFI ── */}
            {source === 'lofi' && (
              <div className="grid grid-cols-1 gap-1">
                {LOFI_STREAMS.map((s, i) => (
                  <button key={s.url} onClick={() => onSelectLofiStation(i)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all active:scale-[0.98]
                      ${i === lofiIdx ? 'bg-white text-zinc-900' : 'text-white/70 hover:bg-white/[0.08] hover:text-white'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === lofiIdx ? 'bg-zinc-900' : 'bg-white/20'}`} />
                    <div className="flex-1">
                      <p className="text-[9px] font-mono font-bold uppercase tracking-wider leading-none">{s.name}</p>
                      <p className={`text-[7px] font-mono uppercase tracking-widest mt-0.5 ${i === lofiIdx ? 'text-zinc-600' : 'text-white/30'}`}>{s.sub}</p>
                    </div>
                    {i === lofiIdx && <EqBars playing={true} />}
                  </button>
                ))}
              </div>
            )}

            {/* ── YOUTUBE ── */}
            {source === 'youtube' && (
              <div className="space-y-2">
                <p className="text-[7px] font-mono text-white/30 uppercase tracking-wider">
                  YOUTUBE APP → COMPARTILHAR → COPIAR LINK
                </p>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all bg-white/5
                  ${ytParsed ? 'border-white/40' : ytInput.length > 5 ? 'border-red-400/30' : 'border-white/10 focus-within:border-white/30'}`}
                >
                  <Link2 size={11} className="text-white/30 shrink-0" />
                  <input
                    type="url" value={ytInput} onChange={e => setYtInput(e.target.value)}
                    placeholder="youtu.be/... ou youtube.com/..."
                    spellCheck={false} autoCapitalize="off"
                    className="flex-1 bg-transparent outline-none text-[9px] font-mono text-white placeholder:text-white/20"
                  />
                  {ytParsed && <Check size={11} className="text-white/50 shrink-0" />}
                  {!ytParsed && ytInput.length > 10 && <AlertTriangle size={11} className="text-red-400/50 shrink-0" />}
                </div>
                <button onClick={onActivateYt} disabled={!ytParsed}
                  className={`w-full py-2 rounded-xl text-[8px] font-mono font-black uppercase tracking-widest transition-all active:scale-[0.97]
                    ${ytParsed ? 'bg-white text-zinc-900' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
                >
                  CARREGAR VÍDEO
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN WIDGET
   ════════════════════════════════════════════════════════════════ */
interface Props { isDark: boolean }

export function AudioStation({ isDark }: Props) {
  /* ── lofi audio ──────────────────────────────────────────────── */
  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const [lofiPlaying, setLofiPlaying] = useState(false);
  const [lofiLoading, setLofiLoading] = useState(false);
  const [lofiIdx, setLofiIdx]         = useState(0);

  /* ── source / embed state ────────────────────────────────────── */
  const [source, setSource] = useState<Source>('lofi');
  const [ytId,   setYtId]   = useState<string | null>(null);

  /* ── input state ─────────────────────────────────────────────── */
  const [ytInput, setYtInput] = useState('');
  const ytParsed = useMemo(() => parseYT(ytInput), [ytInput]);

  /* ── ui ──────────────────────────────────────────────────────── */
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [embedVisible,  setEmbedVisible]  = useState(false);

  /* ── audio instance ──────────────────────────────────────────── */
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio();
      a.volume = 0.5;
      a.preload = 'none';
      audioRef.current = a;
      a.addEventListener('playing', () => { setLofiPlaying(true);  setLofiLoading(false); });
      a.addEventListener('pause',   () =>   setLofiPlaying(false));
      a.addEventListener('waiting', () =>   setLofiLoading(true));
      a.addEventListener('error',   () => { setLofiLoading(false); setLofiPlaying(false); });
    }
    return audioRef.current;
  }, []);

  useEffect(() => () => {
    const a = audioRef.current;
    if (a) { a.pause(); a.src = ''; a.load(); audioRef.current = null; }
  }, []);

  /* stop lofi when switching to embed source */
  useEffect(() => {
    if (source !== 'lofi') {
      const a = audioRef.current;
      if (a) { a.pause(); a.src = ''; a.load(); }
      setLofiPlaying(false);
    }
  }, [source]);

  /* ── lofi controls ───────────────────────────────────────────── */
  const playLofi = useCallback((idx: number) => {
    const a = getAudio();
    a.pause(); a.src = ''; a.load();
    setLofiLoading(true);
    a.src = LOFI_STREAMS[idx].url;
    a.load();
    a.play().catch(() => { setLofiLoading(false); setLofiPlaying(false); });
  }, [getAudio]);

  const toggleLofi = useCallback(() => {
    if (lofiPlaying) {
      const a = audioRef.current;
      if (a) { a.pause(); a.src = ''; a.load(); }
      setLofiPlaying(false);
    } else {
      playLofi(lofiIdx);
    }
  }, [lofiPlaying, lofiIdx, playLofi]);

  /* ── select sources ──────────────────────────────────────────── */
  const selectLofiStation = useCallback((i: number) => {
    setLofiIdx(i);
    setSource('lofi');
    setSpotifyId(null); setYtId(null);
    setEmbedVisible(false);
    setDrawerOpen(false);
    playLofi(i);
  }, [playLofi]);


  const activateYt = useCallback(() => {
    if (!ytParsed) return;
    setSource('youtube');
    setYtId(ytParsed); setSpotifyId(null);
    setYtInput('');
    setEmbedVisible(true);
    setDrawerOpen(false);
    const a = audioRef.current;
    if (a) { a.pause(); a.src = ''; a.load(); }
    setLofiPlaying(false);
  }, [ytParsed]);

  /* ── embed URLs ──────────────────────────────────────────────── */
  const ytEmbed = useMemo(() => ytId
    ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&autoplay=1`
    : null, [ytId]);

  /* ── display strings ─────────────────────────────────────────── */
  const trackName = source === 'lofi'
    ? LOFI_STREAMS[lofiIdx].name
    : source === 'youtube' && ytId
      ? 'YOUTUBE'
      : '---';

  const subLabel = source === 'lofi'
    ? LOFI_STREAMS[lofiIdx].sub
    : source === 'spotify' ? 'SPOTIFY'
    : 'YOUTUBE';

  /* embed is "playing" as long as its ID exists (iframe stays mounted) */
  const isPlaying = source === 'lofi' ? lofiPlaying : !!ytId;
  const isLoading = source === 'lofi' && lofiLoading;
  const hasEmbed  = source === 'youtube' ? !!ytId : false;

  return (
    <>
      {/* ── Widget pill ──────────────────────────────────────── */}
      <div
        className="fixed top-3 z-[55]"
        style={{ left: 'max(12px, calc(50% - 202px))' }}
      >
        <div className="relative">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.2 }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-2xl
              bg-zinc-900/95 border border-white/10
              backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
            style={{ width: 240 }}
          >
            {/* Disc */}
            <Disc playing={isPlaying} source={source} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[7px] font-mono font-black uppercase tracking-[0.2em] text-white/30">
                  {subLabel}
                </span>
                {isPlaying && <EqBars playing={true} />}
              </div>
              <div className="overflow-hidden h-[13px]">
                {trackName.length > 12 ? (
                  <motion.p
                    className="text-[10px] font-mono font-bold uppercase tracking-wide text-white whitespace-nowrap"
                    animate={{ x: ['0%', '-60%', '0%'] }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                  >
                    {trackName}
                  </motion.p>
                ) : (
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wide text-white truncate">
                    {trackName}
                  </p>
                )}
              </div>
              {source === 'lofi' && (
                <span className="text-[6px] font-mono text-white/20 uppercase tracking-widest">
                  {lofiIdx + 1}/{LOFI_STREAMS.length}
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Play/pause (lofi) OR expand/collapse (embed) */}
              {source === 'lofi' ? (
                <button onClick={toggleLofi}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90
                    bg-white text-zinc-900 hover:bg-zinc-100 shadow-sm shrink-0">
                  {isLoading
                    ? <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    : lofiPlaying
                      ? <Pause size={15} strokeWidth={2.5} fill="currentColor" />
                      : <Play  size={15} strokeWidth={2.5} fill="currentColor" className="ml-0.5" />}
                </button>
              ) : (
                <button
                  onClick={() => hasEmbed && setEmbedVisible(!embedVisible)}
                  disabled={!hasEmbed}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90
                    bg-white text-zinc-900 hover:bg-zinc-100 shadow-sm shrink-0
                    ${!hasEmbed ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  {embedVisible
                    ? <ChevronDown size={15} strokeWidth={2.5} />
                    : <ChevronUp   size={15} strokeWidth={2.5} />}
                </button>
              )}

              {/* Source selector */}
              <button
                onClick={() => setDrawerOpen(!drawerOpen)}
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-all active:scale-90
                  ${drawerOpen ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
              >
                <Music2 size={12} strokeWidth={2} />
              </button>
            </div>
          </motion.div>

          {/* Source drawer */}
          <SourceDrawer
            visible={drawerOpen}
            source={source}
            setSource={setSource}
            lofiIdx={lofiIdx}
            ytId={ytId}
            onSelectLofiStation={selectLofiStation}
            onActivateYt={activateYt}
            ytInput={ytInput}
            setYtInput={setYtInput}
            ytParsed={ytParsed}
          />
        </div>
      </div>

      {/* ── Embed panel ── permanece montado via CSS (iframe não desmonta) ── */}
      {ytEmbed && (
        <div
          className="fixed z-[54] transition-all duration-300"
          style={{
            top: embedVisible ? 72 : 16,
            left: 'max(12px, calc(50% - 202px))',
            width: 240,
            maxHeight: embedVisible ? 420 : 0,
            opacity: embedVisible ? 1 : 0,
            overflow: 'hidden',
            pointerEvents: embedVisible ? 'auto' : 'none',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {/* Close / dismiss embed */}
          <button
            onClick={() => {
              setEmbedVisible(false);
              setSource('lofi');
              setYtId(null);
            }}
            className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center
              bg-black/70 text-white hover:bg-black/90 transition-all active:scale-90 backdrop-blur-sm"
          >
            <X size={11} strokeWidth={2.5} />
          </button>

          {source === 'youtube' && (
            <div style={{ position: 'relative', paddingBottom: '56.25%' }}>
              <iframe
                key={ytEmbed}
                src={ytEmbed}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                title="YouTube"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 16 }}
              />
            </div>
          )}
        </div>
      )}

      {/* EQ keyframes */}
      <style>{`@keyframes eq-anim { 0% { height: 2px; } 100% { height: 10px; } }`}</style>
    </>
  );
}
