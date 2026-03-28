import React, { useState, useRef } from 'react';
import { Camera, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { analyzeFoodPhoto } from '../services/aiService';

const FoodScanner = ({ userId, mealType, onResult, onClose }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

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
      setError('Erro ao analisar foto. Tente novamente.');
      console.error('Scanner error:', err);
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
            <h2 className="text-sm font-bold tracking-wider">SCANNER IA</h2>
            <span className="text-[9px] font-mono opacity-40 tracking-widest">ANALISE POR FOTO</span>
          </div>
          <button onClick={onClose} className="opacity-40 hover:opacity-100 transition-opacity">
            <X size={20} />
          </button>
        </div>

        {/* Upload area */}
        <input type="file" accept="image/*" capture="environment" ref={fileRef} onChange={handleFileChange} className="hidden" />

        {!preview ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-12 border-2 border-dashed rounded-sm flex flex-col items-center gap-3 opacity-40 hover:opacity-70 transition-all"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <Camera size={32} />
            <span className="text-[11px] font-mono tracking-wider">TIRAR FOTO OU ESCOLHER DA GALERIA</span>
          </button>
        ) : (
          <div className="relative rounded-sm overflow-hidden border mb-4" style={{ borderColor: 'var(--border-color)' }}>
            <img src={preview} alt="Foto da refeicao" className="w-full max-h-52 object-cover" />
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
            {scanning ? <><Loader2 size={14} className="animate-spin" /> ANALISANDO...</> : <><Camera size={14} /> ANALISAR COM IA</>}
          </button>
        )}

        {/* Results */}
        {results && results.items && (
          <div className="mt-4 space-y-2">
            <h3 className="text-[10px] font-mono font-bold tracking-wider opacity-60 mb-2">ALIMENTOS IDENTIFICADOS</h3>
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
              <Check size={14} /> CONFIRMAR E REGISTRAR
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodScanner;
