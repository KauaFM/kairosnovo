import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Radio, Youtube, Link2, Check, AlertTriangle, Loader2 } from 'lucide-react';
import type { AudioSource, AudioPlayerState } from './StickyAudioPlayer';

/* ═══════════════════════════════════════════════════════════════
   AUDIO SOURCE DRAWER — BOTTOM SHEET
   Abas: LOFI / YOUTUBE
   YouTube: input com parse
   Swipe-down-to-close
   ═══════════════════════════════════════════════════════════════ */

/* ── Parsers ────────────────────────────────────────────────── */
function parseYoutubeUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:music\.youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/* ── Tab button ─────────────────────────────────────────────── */
function Tab({ active, label, icon: Icon, onClick }: {
  active: boolean; label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`
      flex-1 flex items-center justify-center gap-1.5 py-2.5
      text-[9px] font-mono font-black uppercase tracking-[0.18em]
      border-b-[2px] transition-all duration-200
      ${active
        ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
        : 'border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}
    `}>
      <Icon size={11} strokeWidth={active ? 2.5 : 1.6} />
      {label}
    </button>
  );
}

/* ── Props ──────────────────────────────────────────────────── */
interface Props {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  state: AudioPlayerState;
  onStateChange: (patch: Partial<AudioPlayerState>) => void;
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */
export function AudioSourceDrawer({ isOpen, onClose, state, onStateChange }: Props) {
  const [tab, setTab] = useState<AudioSource>(state.activeSource);
  const [youtubeInput, setYoutubeInput] = useState('');
  const [activating, setActivating] = useState(false);

  useEffect(() => { if (isOpen) setTab(state.activeSource); }, [isOpen, state.activeSource]);

  /* ── Swipe to close ─────────────────────────────────────── */
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 400) onClose();
  }, [onClose]);

  /* ── Parse inputs ───────────────────────────────────────── */
  const youtubeParsed = useMemo(() => parseYoutubeUrl(youtubeInput), [youtubeInput]);

  /* ── Actions ────────────────────────────────────────────── */
  const activateLofi = useCallback(() => {
    setActivating(true);
    setTimeout(() => {
      onStateChange({
        activeSource: 'lofi',
        isPlaying: true,
        trackTitle: 'ORVAX RADIO // DEEP FOCUS',
        youtubeEmbedId: null,
      });
      setActivating(false);
      onClose();
    }, 600);
  }, [onStateChange, onClose]);

  const activateYoutube = useCallback(() => {
    if (!youtubeParsed) return;
    onStateChange({
      activeSource: 'youtube',
      youtubeEmbedId: youtubeParsed,
      isPlaying: true,
      trackTitle: 'YOUTUBE // AUDIO STREAM',
    });
    setYoutubeInput('');
    onClose();
  }, [youtubeParsed, onStateChange, onClose]);

  /* ── YouTube embed URL ──────────────────────────────────── */
  const liveYoutubeEmbed = useMemo(() => {
    if (!youtubeParsed) return null;
    return `https://www.youtube.com/embed/${youtubeParsed}?rel=0&modestbranding=1`;
  }, [youtubeParsed]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50 dark:bg-black/70"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-[61] mx-auto max-w-[428px]
              rounded-t-2xl overflow-hidden
              border-t border-x border-zinc-200 dark:border-zinc-800
              bg-white dark:bg-zinc-950"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 cursor-grab">
              <div className="w-9 h-[3px] rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-1">
              <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">
                AUDIO STATION
              </span>
              <button onClick={onClose} className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors active:scale-90" aria-label="Fechar">
                <X size={15} strokeWidth={2} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-100 dark:border-zinc-800/60 mx-5">
              <Tab active={tab === 'lofi'} label="LOFI" icon={Radio} onClick={() => setTab('lofi')} />
              <Tab active={tab === 'youtube'} label="YOUTUBE" icon={Youtube} onClick={() => setTab('youtube')} />
            </div>

            {/* Content */}
            <div className="px-5 pt-4 pb-8 overflow-y-auto" style={{ maxHeight: '55vh', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
              <AnimatePresence mode="wait">

                {/* ────────── LOFI ────────── */}
                {tab === 'lofi' && (
                  <motion.div key="lofi" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                    <div className="flex flex-col items-center py-6">
                      <Radio size={28} strokeWidth={1.2} className="text-zinc-400 dark:text-zinc-500 mb-3" />
                      <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500 mb-1">
                        24/7 FOCUS STREAM
                      </span>
                      <span className="text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-zinc-700 dark:text-zinc-300 mb-6">
                        ORVAX LOFI RADIO
                      </span>
                      <button
                        onClick={activateLofi}
                        disabled={activating}
                        className={`w-full py-3 rounded-xl text-[10px] font-mono font-black uppercase tracking-[0.18em] border transition-all active:scale-[0.97]
                          ${state.activeSource === 'lofi' && state.isPlaying
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                            : 'border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-900 hover:text-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-900 hover:border-transparent'}
                          ${activating ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {activating
                          ? <span className="flex items-center justify-center gap-2"><Loader2 size={12} className="animate-spin" />CONECTANDO...</span>
                          : state.activeSource === 'lofi' && state.isPlaying
                            ? 'AO VIVO'
                            : 'SINTONIZAR'}
                      </button>
                      <div className="flex gap-4 mt-4">
                        {['128KBPS', 'STEREO', 'MP3'].map(s => (
                          <span key={s} className="text-[7px] font-mono tracking-[0.2em] text-zinc-300 dark:text-zinc-600">{s}</span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ────────── YOUTUBE ────────── */}
                {tab === 'youtube' && (
                  <motion.div key="youtube" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="space-y-4">

                    <div>
                      <span className="text-[7px] font-mono uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 block mb-1.5">
                        ABRA O YOUTUBE &gt; COMPARTILHAR &gt; COPIAR LINK
                      </span>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all
                        ${youtubeParsed ? 'border-zinc-500' : youtubeInput.length > 5 ? 'border-red-400/50' : 'border-zinc-200 dark:border-zinc-800 focus-within:border-zinc-400 dark:focus-within:border-zinc-500'}
                        bg-zinc-50 dark:bg-zinc-900/60`}
                      >
                        <Link2 size={13} className="text-zinc-400 shrink-0" />
                        <input
                          type="url"
                          value={youtubeInput}
                          onChange={(e) => setYoutubeInput(e.target.value)}
                          placeholder="youtube.com/watch?v=... ou youtu.be/..."
                          spellCheck={false}
                          autoCapitalize="off"
                          className="flex-1 bg-transparent outline-none text-[10px] font-mono text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 placeholder:text-[9px]"
                        />
                        {youtubeParsed && <Check size={13} className="text-zinc-600 dark:text-zinc-400 shrink-0" />}
                        {!youtubeParsed && youtubeInput.length > 10 && <AlertTriangle size={13} className="text-red-400/60 shrink-0" />}
                      </div>
                    </div>

                    {/* Preview */}
                    <AnimatePresence>
                      {liveYoutubeEmbed && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                              <iframe
                                src={liveYoutubeEmbed}
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                loading="lazy"
                                title="YouTube Preview"
                                className="absolute inset-0 w-full h-full"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={activateYoutube}
                      disabled={!youtubeParsed}
                      className={`w-full py-2.5 rounded-xl text-[9px] font-mono font-black uppercase tracking-[0.15em] border transition-all active:scale-[0.97]
                        ${youtubeParsed
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 border-transparent hover:opacity-90'
                          : 'text-zinc-300 dark:text-zinc-600 border-zinc-200 dark:border-zinc-800 cursor-not-allowed'}`}
                    >
                      ATIVAR YOUTUBE
                    </button>

                    <p className="text-[7px] font-mono text-zinc-300 dark:text-zinc-600 uppercase tracking-wider leading-relaxed">
                      DICA: NO APP DO YOUTUBE, TOQUE EM COMPARTILHAR E DEPOIS EM COPIAR LINK.
                    </p>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
