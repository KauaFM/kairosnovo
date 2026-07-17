import React, { useState, useRef } from 'react';
import { Camera, X, Check, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { analyzeFoodPhoto } from '../services/aiService';
import { useLang } from '../../../i18n/LanguageContext';

const FoodScanner = ({ userId, mealType, onResult, onClose }) => {
  const { t } = useLang();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResults(null);
      setError('');
    }
  };

  const handleScan = async () => {
    if (!file) return;
    setScanning(true);
    setError('');
    try {
      const data = await analyzeFoodPhoto(file, userId);
      setResults(data);
    } catch (err) {
      console.error('Scanner error:', err);
      setError(err?.message || t('fitcal.analyzeError'));
    } finally {
      setScanning(false);
    }
  };

  const handleConfirm = () => {
    if (results) {
      onResult?.(results.items, mealType, results.photoUrl);
      onClose?.();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-[428px] max-h-[80vh] overflow-y-auto rounded-t-xl border-t border-x p-5 pb-8"
        style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', scrollbarWidth: 'none' }}>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold tracking-wider">{t('fitcal.scannerTitle')}</h2>
            <span className="text-[9px] font-mono opacity-40 tracking-widest">{t('fitcal.scannerSub')}</span>
          </div>
          <button onClick={onClose} className="opacity-40 hover:opacity-100 transition-opacity">
            <X size={20} />
          </button>
        </div>

        {/* Upload area — dois inputs distintos: câmera e galeria */}
        <input type="file" accept="image/*" capture="environment" ref={cameraRef} onChange={handleFileChange} className="hidden" />
        <input type="file" accept="image/*" ref={fileRef} onChange={handleFileChange} className="hidden" />

        {!preview ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => cameraRef.current?.click()}
              className="py-10 border-2 border-dashed rounded-sm flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-all"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <Camera size={26} />
              <span className="text-[10px] font-mono tracking-wider">{t('fitcal.camera')}</span>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="py-10 border-2 border-dashed rounded-sm flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-all"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <ImageIcon size={26} />
              <span className="text-[10px] font-mono tracking-wider">{t('fitcal.gallery')}</span>
            </button>
          </div>
        ) : (
          <div className="relative rounded-sm overflow-hidden border mb-4" style={{ borderColor: 'var(--border-color)' }}>
            <img src={preview} alt={t('lo.mealPhotoAlt')} className="w-full max-h-52 object-cover" />
            <button
              onClick={() => { setFile(null); setPreview(null); setResults(null); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
            >
              <X size={14} className="text-white" />
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-sm border border-red-400/30 bg-red-400/10 text-red-400 text-[11px] font-mono mt-3">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Scan button */}
        {preview && !results && (
          <button
            onClick={handleScan}
            disabled={scanning}
            className="w-full py-3 rounded-sm font-bold text-[12px] tracking-wider mt-4 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}
          >
            {scanning ? <><Loader2 size={14} className="animate-spin" /> {t('fitcal.analyzing')}</> : <><Camera size={14} /> {t('fitcal.analyzeWithAI')}</>}
          </button>
        )}

        {/* No food detected */}
        {results && results.items && results.items.length === 0 && (
          <div className="mt-4 text-center py-6 px-3 rounded-sm border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
            <AlertCircle size={20} className="mx-auto opacity-30 mb-2" />
            <p className="text-[11px] font-mono opacity-60">{t('fitcal.noFoodRecognized')}</p>
            <button
              onClick={() => { setResults(null); }}
              className="mt-3 text-[10px] font-mono tracking-wider underline opacity-50 hover:opacity-90"
            >
              {t('fitcal.tryAnotherPhoto')}
            </button>
          </div>
        )}

        {/* Results */}
        {results && results.items && results.items.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-[10px] font-mono font-bold tracking-wider opacity-60 mb-2">{t('fitcal.identifiedFoods')}</h3>
            {results.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-sm border"
                style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
                <div>
                  <span className="text-[11px] font-bold block">{item.name}</span>
                  <span className="text-[9px] font-mono opacity-40">
                    {item.quantity_g}g · P:{item.protein_g}g · C:{item.carbs_g}g · G:{item.fat_g}g
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[12px] font-bold font-mono">{Math.round(item.calories)}</span>
                  <span className="text-[8px] font-mono opacity-40 block">KCAL</span>
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="flex items-center justify-between px-3 py-2 mt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-[10px] font-mono font-bold tracking-wider opacity-60">TOTAL</span>
              <span className="text-[13px] font-bold font-mono">
                {Math.round(results.items.reduce((s, i) => s + (i.calories || 0), 0))} kcal
              </span>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full py-3 rounded-sm font-bold text-[12px] tracking-wider mt-3 transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: '#22c55e', color: '#000' }}
            >
              <Check size={14} /> {t('fitcal.confirmLog')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodScanner;
