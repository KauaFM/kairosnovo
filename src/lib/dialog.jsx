// ============================================================
// ORVAX — Diálogos do design system (substitui alert/confirm nativos)
// API imperativa: confirmDialog({...}) → Promise<boolean>,
//                 alertDialog({...})   → Promise<void>.
// Um <DialogHost/> montado uma vez no App renderiza tudo.
// Tema preto-branco; sem os "localhost diz:" do WebView.
// ============================================================
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

let _emit = null;
let _seq = 0;
const resolvers = new Map();

function request(opts) {
  return new Promise((resolve) => {
    const id = ++_seq;
    resolvers.set(id, resolve);
    if (_emit) _emit({ id, ...opts });
    else { resolvers.delete(id); resolve(opts.kind === 'confirm' ? false : undefined); }
  });
}

/** Confirmação → resolve true/false. */
export function confirmDialog({ title, message, confirmLabel, cancelLabel, danger = false } = {}) {
  return request({ kind: 'confirm', title, message, confirmLabel, cancelLabel, danger });
}

/** Aviso → resolve quando fechado. */
export function alertDialog({ title, message, danger = false } = {}) {
  return request({ kind: 'alert', title, message, danger });
}

export function DialogHost() {
  const [dlg, setDlg] = useState(null);

  useEffect(() => {
    _emit = (payload) => setDlg(payload);
    return () => { _emit = null; };
  }, []);

  if (!dlg) return null;

  const finish = (value) => {
    const r = resolvers.get(dlg.id);
    resolvers.delete(dlg.id);
    setDlg(null);
    if (r) r(value);
  };

  const isConfirm = dlg.kind === 'confirm';
  const Icon = dlg.danger ? AlertTriangle : Info;

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={() => finish(isConfirm ? false : undefined)}>
      <div
        className="w-full max-w-[340px] rounded-[24px] border p-6 animate-in fade-in zoom-in-95 duration-200"
        style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${dlg.danger ? 'text-red-500' : ''}`}
          style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--border-color)' }}>
          <Icon size={18} />
        </div>
        {dlg.title && <h3 className="text-[14px] font-outfit font-black uppercase tracking-wide mb-1.5">{dlg.title}</h3>}
        {dlg.message && <p className="text-[12px] font-mono opacity-70 leading-relaxed mb-5">{dlg.message}</p>}

        <div className="flex gap-2">
          {isConfirm && (
            <button onClick={() => finish(false)}
              className="flex-1 py-3 rounded-xl font-mono text-[11px] font-bold uppercase tracking-widest border"
              style={{ borderColor: 'var(--border-color)' }}>
              {dlg.cancelLabel || 'Cancelar'}
            </button>
          )}
          <button onClick={() => finish(isConfirm ? true : undefined)}
            className={`flex-1 py-3 rounded-xl font-mono text-[11px] font-bold uppercase tracking-widest ${dlg.danger ? 'bg-red-600 text-white' : ''}`}
            style={dlg.danger ? {} : { backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}>
            {dlg.confirmLabel || (isConfirm ? 'Confirmar' : 'OK')}
          </button>
        </div>
      </div>
    </div>
  );
}
