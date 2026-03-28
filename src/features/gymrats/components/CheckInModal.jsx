import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Zap } from 'lucide-react';
import { ACTIVITY_TYPES } from '../utils/formatters';

const CheckInModal = ({ open, onClose, onSubmit, scoringType }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityType, setActivityType] = useState('gym');
  const [durationMin, setDurationMin] = useState('');
  const [calories, setCalories] = useState('');
  const [steps, setSteps] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  if (!open) return null;

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(
        {
          title: title.trim(),
          description: description.trim() || null,
          activity_type: activityType,
          duration_min: durationMin ? parseInt(durationMin) : null,
          calories: calories ? parseInt(calories) : null,
          steps: steps ? parseInt(steps) : null,
          distance_km: distanceKm ? parseFloat(distanceKm) : null,
        },
        file
      );
      onClose();
    } catch (err) {
      console.error('CheckIn error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full text-[12px] font-mono bg-transparent border rounded-sm px-3 py-2.5 outline-none transition-all focus:border-[#22c55e]/50";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-[428px] max-h-[85vh] overflow-y-auto rounded-t-xl border-t border-x p-5 pb-8"
        style={{
          backgroundColor: 'var(--bg-color)',
          borderColor: 'var(--border-color)',
          scrollbarWidth: 'none',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-bold tracking-wider" style={{ color: 'var(--text-main)' }}>CHECK-IN</h2>
            <span className="text-[9px] font-mono opacity-40 tracking-widest">REGISTRAR TREINO</span>
          </div>
          <button onClick={onClose} className="opacity-40 hover:opacity-100 transition-opacity">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Activity type selector */}
          <div>
            <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-2">ATIVIDADE</label>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_TYPES.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setActivityType(a.value)}
                  className={`px-2.5 py-1.5 rounded-sm text-[10px] font-mono border transition-all ${activityType === a.value ? 'border-[#22c55e]/50 text-[#22c55e]' : 'opacity-50'}`}
                  style={{
                    backgroundColor: activityType === a.value ? 'rgba(34,197,94,0.1)' : 'var(--glass-bg)',
                    borderColor: activityType === a.value ? 'rgba(34,197,94,0.3)' : 'var(--border-color)',
                  }}
                >
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">TITULO *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Treino de peito e triceps"
              className={inputClass}
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">DESCRICAO</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes do treino..."
              rows={2}
              className={inputClass + " resize-none"}
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">DURACAO (min)</label>
              <input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                placeholder="60"
                className={inputClass}
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>
            <div>
              <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">CALORIAS</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="350"
                className={inputClass}
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>
            {(scoringType === 'steps' || scoringType === 'custom') && (
              <div>
                <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">PASSOS</label>
                <input
                  type="number"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder="10000"
                  className={inputClass}
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>
            )}
            <div>
              <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">DISTANCIA (km)</label>
              <input
                type="number"
                step="0.1"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                placeholder="5.0"
                className={inputClass}
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>
          </div>

          {/* Photo upload */}
          <div>
            <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">FOTO DO TREINO</label>
            <input type="file" accept="image/*" ref={fileRef} onChange={handleFileChange} className="hidden" />
            {preview ? (
              <div className="relative rounded-sm overflow-hidden border" style={{ borderColor: 'var(--border-color)' }}>
                <img src={preview} alt="Preview" className="w-full max-h-40 object-cover" />
                <button onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center bg-black/60">
                  <X size={12} className="text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-6 border border-dashed rounded-sm flex flex-col items-center gap-2 opacity-40 hover:opacity-70 transition-all"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <Camera size={20} />
                <span className="text-[10px] font-mono">Toque para adicionar foto</span>
              </button>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            className="w-full py-3 rounded-sm font-bold text-[12px] tracking-wider transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'var(--text-main)',
              color: 'var(--bg-color)',
            }}
          >
            <Zap size={14} />
            {submitting ? 'REGISTRANDO...' : 'REGISTRAR CHECK-IN'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckInModal;
