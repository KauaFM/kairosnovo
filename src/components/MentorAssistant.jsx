import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, Sun, Moon, Sparkles } from 'lucide-react';
import { MENTORS } from './MentorConfig';
import { getSelectedMentor } from '../services/db';
import { getMentorHistory, sendMentorMessage } from '../services/mentorAgent';
import { useLang } from '../i18n/LanguageContext';

// ─── Bolha de mensagem ──────────────────────────────────────────
const Bubble = ({ role, content, accent }) => {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className="max-w-[80%] px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words"
        style={
          isUser
            ? { backgroundColor: 'var(--text-main)', color: 'var(--bg-color)', borderRadius: '18px 18px 4px 18px' }
            : { backgroundColor: 'var(--glass-bg)', color: 'var(--text-main)', border: `1px solid ${accent}40`, borderRadius: '18px 18px 18px 4px' }
        }
      >
        {content}
      </div>
    </div>
  );
};

const MentorAssistant = ({ theme, toggleTheme }) => {
  const { t } = useLang();
  const [mentorId, setMentorId] = useState('atlas');
  const [messages, setMessages] = useState([]); // { role, content }
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef(null);

  const mentor = MENTORS.find(m => m.id === mentorId) || MENTORS[0];
  const accent = mentor.accentColor || '#22c55e';

  // Carrega mentor selecionado + histórico
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const id = await getSelectedMentor();
        if (alive) setMentorId(id || 'atlas');
        const hist = await getMentorHistory(50);
        if (alive) setMessages(hist);
      } catch (err) {
        console.error('[MentorAssistant] init falhou:', err);
      } finally {
        if (alive) setLoadingHistory(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }, []);

  useEffect(scrollToBottom, [messages, sending, scrollToBottom]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const history = messages.slice();
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setSending(true);
    try {
      const { reply } = await sendMentorMessage(text, history);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error('[MentorAssistant] envio falhou:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${err?.message || t('mentorChat.error')}` }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}>

      {/* ─── Header: identidade do mentor ─── */}
      <div className="shrink-0 px-5 pt-11 pb-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center"
            style={{ border: `1px solid ${accent}60`, boxShadow: `0 0 16px ${accent}30` }}
          >
            {mentor.image
              ? <img src={mentor.image} alt={mentor.name} className="w-full h-full object-cover" style={{ objectPosition: 'top center' }} />
              : <Sparkles size={18} style={{ color: accent }} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-syncopate font-black uppercase tracking-wider truncate">{mentor.name}</h1>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            </div>
            <span className="text-[8px] font-mono uppercase tracking-[0.25em] opacity-40 block truncate">{mentor.archetype || t('mentorChat.innerMentor')}</span>
          </div>
        </div>

        {/* Theme toggle compacto */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          style={{ borderColor: 'var(--border-color)' }}
          aria-label={t('common.toggleTheme')}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      {/* ─── Mensagens ─── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: 'none' }}>
        {loadingHistory ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 size={20} className="animate-spin opacity-30" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-3xl overflow-hidden mb-4 flex items-center justify-center" style={{ border: `1px solid ${accent}50`, boxShadow: `0 0 24px ${accent}25` }}>
              {mentor.image
                ? <img src={mentor.image} alt={mentor.name} className="w-full h-full object-cover" style={{ objectPosition: 'top center' }} />
                : <Sparkles size={26} style={{ color: accent }} />}
            </div>
            <p className="text-[13px] font-bold opacity-80 mb-1">{t('mentorChat.iam', { name: mentor.name })}</p>
            <p className="text-[11px] font-mono opacity-40 leading-relaxed max-w-[260px]">
              {t('mentorChat.intro')}
            </p>
          </div>
        ) : (
          messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} accent={accent} />)
        )}

        {/* Indicador "pensando" */}
        {sending && (
          <div className="flex justify-start mb-3">
            <div className="px-4 py-3 rounded-[18px_18px_18px_4px] flex items-center gap-1.5" style={{ backgroundColor: 'var(--glass-bg)', border: `1px solid ${accent}40` }}>
              {[0, 1, 2].map(d => (
                <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: accent, animationDelay: `${d * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Input (acima do dock de navegação) ─── */}
      <div className="shrink-0 px-4 pt-3 pb-28">
        <div className="flex items-end gap-2 rounded-[24px] border px-3 py-2" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('mentorChat.placeholder', { name: mentor.name })}
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-[13px] py-1.5 max-h-28"
            style={{ color: 'var(--text-main)', scrollbarWidth: 'none' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-30"
            style={{ backgroundColor: accent, color: '#000' }}
            aria-label={t('common.send')}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MentorAssistant;
