import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { sendMessage } from '../services/chatService';
import { useChat } from '../hooks/useChat';
import { timeAgo } from '../utils/formatters';

const ChatWindow = ({ challengeId, userId }) => {
  const { messages, loading } = useChat(challengeId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(challengeId, userId, text.trim());
      setText('');
    } catch (err) {
      console.error('Chat send error:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-3" style={{ scrollbarWidth: 'none' }}>
        {loading && (
          <div className="text-center py-8">
            <span className="text-[10px] font-mono opacity-40 animate-pulse tracking-wider">CARREGANDO MENSAGENS...</span>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center py-12 opacity-30">
            <MessageCircle size={24} className="mx-auto mb-2" />
            <p className="text-[10px] font-mono tracking-wider">CHAT VAZIO</p>
            <p className="text-[9px] font-mono mt-1">Envie a primeira mensagem!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.user_id === userId;
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              {!isMe && (
                <div className="w-6 h-6 rounded-full overflow-hidden border flex-shrink-0 mt-1"
                  style={{ borderColor: 'var(--border-color)' }}>
                  {msg.profiles?.avatar_url ? (
                    <img src={msg.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-current opacity-10" />
                  )}
                </div>
              )}
              <div className={`max-w-[75%] ${isMe ? 'text-right' : ''}`}>
                {!isMe && (
                  <span className="text-[9px] font-mono opacity-40 block mb-0.5">
                    {msg.profiles?.username}
                  </span>
                )}
                <div
                  className={`inline-block px-3 py-2 rounded-sm text-[11px] ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                  style={{
                    backgroundColor: isMe ? 'rgba(34,197,94,0.15)' : 'var(--glass-bg)',
                    border: `1px solid ${isMe ? 'rgba(34,197,94,0.2)' : 'var(--border-color)'}`,
                  }}
                >
                  {msg.body}
                </div>
                <span className="text-[8px] font-mono opacity-30 block mt-0.5">{timeAgo(msg.created_at)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Mensagem..."
          className="flex-1 text-[12px] font-mono bg-transparent border rounded-sm px-3 py-2.5 outline-none transition-all focus:border-[#22c55e]/50"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="px-3 rounded-sm transition-all disabled:opacity-20"
          style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
