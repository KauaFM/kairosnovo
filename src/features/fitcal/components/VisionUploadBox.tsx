import { useState, useRef, useCallback } from 'react';
import {
  Camera, X, Check, AlertTriangle, Aperture,
  Maximize2, HardDrive, Clock, ChevronDown, ChevronUp,
  Shield, Loader2, Image as ImageIcon,
} from 'lucide-react';
import {
  analyzeFood,
  checkRateLimit,
  type VisionAnalysisResult,
  type FoodItem,
  type RateLimitStatus,
} from '../../../services/visionApi';

/* ═══════════════════════════════════════════════════════════════════════════════
 * VISION UPLOAD BOX — Rastreador Nutricional · AI Food Recognition Interface
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Design system: Brutalista / Terminal Financeiro
 *   - Mono fonts, thin borders, zinc palette, zero emojis
 *   - High data density in results view
 *   - Terminal-style processing animation
 *
 * States:
 *   IDLE       → Drop zone / camera trigger
 *   PREVIEW    → Compressed image preview + scan button
 *   ANALYZING  → Terminal animation + compression stats
 *   RESULTS    → Data table with macros + confidence scores
 *   ERROR      → Technical error display with retry
 *
 * ═══════════════════════════════════════════════════════════════════════════════ */

interface VisionUploadBoxProps {
  userId: string;
  mealType: string;
  isPremium?: boolean;
  onResult: (items: FoodItem[], mealType: string, photoUrl: string) => void;
  onClose: () => void;
}

type ViewState = 'idle' | 'preview' | 'analyzing' | 'results' | 'error';

/* ── Terminal animation lines ── */
const TERMINAL_LINES = [
  'INIT_VISION_PIPELINE...',
  'COMPRESS_IMAGE [512x512 @ q0.70]',
  'VALIDATE_INPUT_BUFFER...',
  'ENCODE_BASE64_PAYLOAD...',
  'CONNECT_GEMINI_1.5_FLASH...',
  'TX_VISION_REQUEST [~45KB]',
  'AWAIT_INFERENCE...',
  'PARSE_JSON_RESPONSE...',
  'VALIDATE_FOOD_ITEMS...',
  'CALCULATE_MACROS...',
  'PIPELINE_COMPLETE',
];

export default function VisionUploadBox({
  userId,
  mealType,
  isPremium = false,
  onResult,
  onClose,
}: VisionUploadBoxProps) {
  const [state, setState] = useState<ViewState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<VisionAnalysisResult | null>(null);
  const [error, setError] = useState<string>('');
  const [terminalLine, setTerminalLine] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const rateStatus: RateLimitStatus = checkRateLimit(isPremium);

  // ── File selection ────────────────────────────────────
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // Validate file type
    if (!f.type.startsWith('image/')) {
      setError('INVALID_FILE_TYPE: Apenas imagens sao aceitas');
      setState('error');
      return;
    }

    // Validate file size (50MB hard limit matches compression util)
    if (f.size > 50 * 1024 * 1024) {
      setError('FILE_TOO_LARGE: Limite maximo de 50MB');
      setState('error');
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError('');
    setState('preview');
  }, []);

  // ── Clear / reset ─────────────────────────────────────
  const handleClear = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    setState('idle');
    setTerminalLine(0);
    setShowStats(false);
  }, [preview]);

  // ── Analyze ───────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (!file) return;

    // Rate limit check
    if (!rateStatus.allowed) {
      setError(`RATE_LIMIT: ${rateStatus.used}/${rateStatus.limit} scans usados hoje`);
      setState('error');
      return;
    }

    setState('analyzing');
    setTerminalLine(0);

    // Animate terminal lines
    const interval = setInterval(() => {
      setTerminalLine((prev) => {
        if (prev >= TERMINAL_LINES.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 280);

    try {
      const data = await analyzeFood(file, userId, isPremium);
      clearInterval(interval);
      setTerminalLine(TERMINAL_LINES.length - 1);
      setResult(data);

      // Short delay for the "COMPLETE" line to register visually
      setTimeout(() => setState('results'), 400);
    } catch (err) {
      clearInterval(interval);
      const msg = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
      setError(msg);
      setState('error');
    }
  }, [file, userId, isPremium, rateStatus]);

  // ── Confirm and save ──────────────────────────────────
  const handleConfirm = useCallback(() => {
    if (!result) return;
    onResult(result.items, mealType, result.photoUrl);
    onClose();
  }, [result, mealType, onResult, onClose]);

  // ── Computed values ───────────────────────────────────
  const totalCalories = result?.items.reduce((s, i) => s + i.calories, 0) ?? 0;
  const totalProtein = result?.items.reduce((s, i) => s + i.protein_g, 0) ?? 0;
  const totalCarbs = result?.items.reduce((s, i) => s + i.carbs_g, 0) ?? 0;
  const totalFat = result?.items.reduce((s, i) => s + i.fat_g, 0) ?? 0;
  const avgConfidence = result?.items.length
    ? result.items.reduce((s, i) => s + i.confidence, 0) / result.items.length
    : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        style={{ backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative z-10 w-full max-w-[428px] rounded-t-[24px] border-t border-x border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0a0a0b]"
        style={{ maxHeight: '88vh', overflowY: 'auto', scrollbarWidth: 'none' }}
      >
        {/* ── Header ── */}
        <div className="sticky top-0 z-20 bg-white dark:bg-[#0a0a0b] rounded-t-[24px] px-5 pt-3 pb-3 border-b border-zinc-100 dark:border-zinc-900">
          <div className="mx-auto mb-3 h-[3px] w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Aperture size={14} className="text-zinc-400 dark:text-zinc-600" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">
                Rastreador Nutricional
              </span>
              {/* Rate limit badge */}
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 tabular-nums">
                {rateStatus.used}/{rateStatus.limit}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <X size={14} className="text-zinc-400 dark:text-zinc-500" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-8">

          {/* ════════════════════════════════════════════════════════ */}
          {/*  STATE: IDLE — Upload zone                              */}
          {/* ════════════════════════════════════════════════════════ */}
          {state === 'idle' && (
            <div className="pt-5">
              {/* Input câmera (captura direta) */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={cameraRef}
                onChange={handleFileChange}
                className="hidden"
              />
              {/* Input galeria (sem capture → abre rolo da câmera do celular) */}
              <input
                type="file"
                accept="image/*"
                ref={fileRef}
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => cameraRef.current?.click()}
                  disabled={!rateStatus.allowed}
                  className="py-10 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl flex flex-col items-center gap-2 transition-all hover:border-zinc-500 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 active:scale-[0.98] disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <Camera size={24} strokeWidth={1.2} className="text-zinc-400 dark:text-zinc-600" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-500">
                    Câmera
                  </span>
                </button>

                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={!rateStatus.allowed}
                  className="py-10 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl flex flex-col items-center gap-2 transition-all hover:border-zinc-500 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 active:scale-[0.98] disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ImageIcon size={24} strokeWidth={1.2} className="text-zinc-400 dark:text-zinc-600" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-500">
                    Galeria
                  </span>
                </button>
              </div>

              <div className="text-center mt-3">
                <span className="block text-[8px] font-mono text-zinc-300 dark:text-zinc-700 tracking-wider">
                  {rateStatus.allowed
                    ? 'JPEG comprimido para 512x512 antes do envio'
                    : 'Limite Diário Atingido'}
                </span>
              </div>

              {/* Specs strip */}
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-1">
                  <Maximize2 size={9} className="text-zinc-300 dark:text-zinc-700" />
                  <span className="text-[7px] font-mono text-zinc-400 dark:text-zinc-600 tracking-wider">512px MAX</span>
                </div>
                <div className="flex items-center gap-1">
                  <HardDrive size={9} className="text-zinc-300 dark:text-zinc-700" />
                  <span className="text-[7px] font-mono text-zinc-400 dark:text-zinc-600 tracking-wider">~40-60KB</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield size={9} className="text-zinc-300 dark:text-zinc-700" />
                  <span className="text-[7px] font-mono text-zinc-400 dark:text-zinc-600 tracking-wider">GEMINI 1.5 FLASH</span>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════ */}
          {/*  STATE: PREVIEW — Image loaded, ready to scan            */}
          {/* ════════════════════════════════════════════════════════ */}
          {state === 'preview' && preview && (
            <div className="pt-4">
              {/* Image preview */}
              <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 mb-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-h-56 object-cover"
                />
                <button
                  onClick={handleClear}
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center backdrop-blur-sm hover:bg-black/80 transition-colors"
                >
                  <X size={12} className="text-white" />
                </button>
                {/* File info overlay */}
                {file && (
                  <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-black/50 backdrop-blur-sm">
                    <span className="text-[8px] font-mono text-white/60 tracking-wider">
                      {file.name} | {(file.size / 1024).toFixed(0)}KB | {file.type}
                    </span>
                  </div>
                )}
              </div>

              {/* Scan button */}
              <button
                onClick={handleAnalyze}
                className="w-full py-3.5 rounded-xl font-mono font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 active:scale-[0.97] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
              >
                <Aperture size={13} />
                Iniciar Analise
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════ */}
          {/*  STATE: ANALYZING — Terminal animation                    */}
          {/* ════════════════════════════════════════════════════════ */}
          {state === 'analyzing' && (
            <div className="pt-4">
              {/* Preview (dimmed) */}
              {preview && (
                <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 mb-4 opacity-40">
                  <img src={preview} alt="Analyzing" className="w-full max-h-40 object-cover" />
                  <div className="absolute inset-0 bg-black/30" />
                </div>
              )}

              {/* Terminal block */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 font-mono text-[9px] space-y-1">
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 size={11} className="text-zinc-500 animate-spin" />
                  <span className="text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] font-bold">
                    Processing Vision Data
                  </span>
                </div>

                {TERMINAL_LINES.map((line, i) => {
                  if (i > terminalLine) return null;
                  const isActive = i === terminalLine && i < TERMINAL_LINES.length - 1;
                  const isComplete = i < terminalLine || (i === TERMINAL_LINES.length - 1 && terminalLine === TERMINAL_LINES.length - 1);

                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 transition-opacity duration-200 ${
                        isActive ? 'opacity-100' : isComplete ? 'opacity-40' : 'opacity-0'
                      }`}
                    >
                      <span className="text-zinc-400 dark:text-zinc-600 w-6 text-right tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-zinc-300 dark:text-zinc-700">|</span>
                      <span
                        className={`tracking-wider ${
                          isActive
                            ? 'text-zinc-700 dark:text-zinc-300'
                            : 'text-zinc-400 dark:text-zinc-600'
                        }`}
                      >
                        {line}
                        {isActive && <span className="animate-pulse ml-0.5">_</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════ */}
          {/*  STATE: RESULTS — Data table                             */}
          {/* ════════════════════════════════════════════════════════ */}
          {state === 'results' && result && (
            <div className="pt-4 space-y-3">

              {/* Compression stats toggle */}
              <button
                onClick={() => setShowStats(!showStats)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <HardDrive size={10} className="text-zinc-400 dark:text-zinc-600" />
                  <span className="text-[8px] font-mono text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
                    Pipeline Stats
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono text-zinc-400 dark:text-zinc-600 tabular-nums">
                    {result.latencyMs}ms | {result.source.toUpperCase()}
                  </span>
                  {showStats ? <ChevronUp size={10} className="text-zinc-400" /> : <ChevronDown size={10} className="text-zinc-400" />}
                </div>
              </button>

              {showStats && (
                <div className="grid grid-cols-4 gap-2 px-1">
                  <div className="rounded-lg border border-zinc-100 dark:border-zinc-900 p-2 text-center">
                    <div className="text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-300 tabular-nums">
                      {(result.compressed.originalSize / 1024).toFixed(0)}KB
                    </div>
                    <div className="text-[7px] font-mono text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">
                      Original
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-100 dark:border-zinc-900 p-2 text-center">
                    <div className="text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-300 tabular-nums">
                      {(result.compressed.compressedSize / 1024).toFixed(0)}KB
                    </div>
                    <div className="text-[7px] font-mono text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">
                      Enviado
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-100 dark:border-zinc-900 p-2 text-center">
                    <div className="text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-300 tabular-nums">
                      {(result.compressed.ratio * 100).toFixed(0)}%
                    </div>
                    <div className="text-[7px] font-mono text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">
                      Ratio
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-100 dark:border-zinc-900 p-2 text-center">
                    <div className="text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-300 tabular-nums">
                      {result.compressed.dimensions}
                    </div>
                    <div className="text-[7px] font-mono text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">
                      Pixels
                    </div>
                  </div>
                </div>
              )}

              {/* Results header */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[8px] font-mono font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.2em]">
                  Alimentos Identificados
                </span>
                <span className="text-[8px] font-mono text-zinc-400 dark:text-zinc-600 tabular-nums">
                  Conf. media: {(avgConfidence * 100).toFixed(0)}%
                </span>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[1fr_50px_50px_50px_50px_40px] gap-1 px-3 py-1.5">
                <span className="text-[7px] font-mono font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">Item</span>
                <span className="text-[7px] font-mono font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider text-right">Kcal</span>
                <span className="text-[7px] font-mono font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider text-right">Prot</span>
                <span className="text-[7px] font-mono font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider text-right">Carb</span>
                <span className="text-[7px] font-mono font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider text-right">Gord</span>
                <span className="text-[7px] font-mono font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider text-right">Conf</span>
              </div>

              {/* Items */}
              {result.items.map((item, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_50px_50px_50px_50px_40px] gap-1 px-3 py-2.5 rounded-lg border border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                >
                  <div>
                    <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 block leading-tight">
                      {item.name}
                    </span>
                    <span className="text-[8px] font-mono text-zinc-400 dark:text-zinc-600 tabular-nums">
                      {item.quantity_g}g
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300 text-right self-center tabular-nums">
                    {Math.round(item.calories)}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-500 text-right self-center tabular-nums">
                    {item.protein_g.toFixed(1)}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-500 text-right self-center tabular-nums">
                    {item.carbs_g.toFixed(1)}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-500 text-right self-center tabular-nums">
                    {item.fat_g.toFixed(1)}
                  </span>
                  <div className="flex items-center justify-end self-center">
                    <span
                      className={`text-[8px] font-mono font-bold tabular-nums px-1 py-0.5 rounded ${
                        item.confidence >= 0.8
                          ? 'text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800'
                          : item.confidence >= 0.6
                          ? 'text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50'
                          : 'text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900'
                      }`}
                    >
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}

              {/* Totals row */}
              <div className="grid grid-cols-[1fr_50px_50px_50px_50px_40px] gap-1 px-3 py-2.5 border-t border-zinc-200 dark:border-zinc-800 mt-1">
                <span className="text-[9px] font-mono font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider self-center">
                  Total
                </span>
                <span className="text-[11px] font-mono font-black text-zinc-900 dark:text-zinc-100 text-right self-center tabular-nums">
                  {Math.round(totalCalories)}
                </span>
                <span className="text-[9px] font-mono font-bold text-zinc-600 dark:text-zinc-400 text-right self-center tabular-nums">
                  {totalProtein.toFixed(1)}
                </span>
                <span className="text-[9px] font-mono font-bold text-zinc-600 dark:text-zinc-400 text-right self-center tabular-nums">
                  {totalCarbs.toFixed(1)}
                </span>
                <span className="text-[9px] font-mono font-bold text-zinc-600 dark:text-zinc-400 text-right self-center tabular-nums">
                  {totalFat.toFixed(1)}
                </span>
                <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-600 text-right self-center">
                  g
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleClear}
                  className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors active:scale-[0.97]"
                >
                  Refazer
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-[2] py-3 rounded-xl text-[9px] font-mono font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 active:scale-[0.97] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  <Check size={12} strokeWidth={2.5} />
                  Confirmar e Registrar
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════ */}
          {/*  STATE: ERROR — Technical error display                   */}
          {/* ════════════════════════════════════════════════════════ */}
          {state === 'error' && (
            <div className="pt-6 pb-2">
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-4 bg-zinc-50 dark:bg-zinc-900">
                  <AlertTriangle size={20} className="text-zinc-400 dark:text-zinc-500" />
                </div>
                <h3 className="text-[11px] font-mono font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Falha no Pipeline
                </h3>
              </div>

              {/* Error code block */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 mb-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <span className="text-[7px] font-mono text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">stderr</span>
                </div>
                <code className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 leading-relaxed break-all block">
                  {error}
                </code>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors active:scale-[0.97]"
                >
                  Resetar
                </button>
                <button
                  onClick={() => {
                    setError('');
                    if (file) {
                      setState('preview');
                    } else {
                      setState('idle');
                    }
                  }}
                  className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors active:scale-[0.97]"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
