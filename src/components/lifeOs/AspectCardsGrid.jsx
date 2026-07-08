// =============================================================
// ORVAX — AspectCardsGrid
// Grid de cards por aspecto da vida. Cada card abre detalhe
// (Power-BI-style) quando clicado.
// =============================================================
import React, { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { listLifeAspects } from '../../services/lifeOs';

const IconOf = (name) => {
  const I = Icons[name];
  return I || Icons.Circle;
};

export default function AspectCardsGrid({ onOpenAspect }) {
  const [aspects, setAspects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listLifeAspects()
      .then((rows) => {
        // Dedupe por key (a RPC pode devolver row do sistema + clone do usuário).
        // Mantém a com maior contagem (geralmente a do usuário com links).
        const map = new Map();
        for (const r of rows || []) {
          const prev = map.get(r.key);
          if (!prev || (r.total_links || 0) > (prev.total_links || 0)) {
            map.set(r.key, r);
          }
        }
        setAspects(Array.from(map.values()));
      })
      .catch(err => console.error('AspectCardsGrid:', err))
      .finally(() => setLoading(false));
  }, []);

  // Mostra ativos primeiro, depois ordem
  const visible = aspects.filter(a => a.is_active);

  return (
    <section className="w-full">
      <header className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold tracking-wider">ASPECTOS DA VIDA</h2>
          <span className="text-[9px] font-mono opacity-40 tracking-widest">
            {visible.length} áreas monitoradas
          </span>
        </div>
      </header>

      {loading ? (
        <p className="text-[10px] font-mono opacity-40 py-4 text-center">Carregando…</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {visible.map((a) => {
            const Icon = IconOf(a.icon);
            const recent = a.recent_links || 0;
            const total  = a.total_links  || 0;
            return (
              <button
                key={a.key}
                onClick={() => onOpenAspect?.(a)}
                className="text-left p-3 rounded-sm border transition-all hover:scale-[1.02]"
                style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div
                    className="w-8 h-8 rounded-sm flex items-center justify-center"
                    style={{ backgroundColor: `${a.color}18`, color: a.color }}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="text-right">
                    <span className="text-[12px] font-bold font-mono block" style={{ color: a.color }}>
                      {total}
                    </span>
                    <span className="text-[8px] font-mono opacity-40 tracking-wider">ITENS</span>
                  </div>
                </div>
                <p className="text-[11px] font-bold truncate">{a.label}</p>
                <p className="text-[9px] font-mono opacity-40 truncate">
                  {recent > 0 ? `+${recent} nos últimos 7d` : 'sem atividade recente'}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
