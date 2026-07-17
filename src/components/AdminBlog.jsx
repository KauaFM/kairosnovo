import React, { useState, useEffect } from 'react';
import { useLang } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2, Eye, EyeOff, Star, ArrowLeft, Save, AlertTriangle } from 'lucide-react';

const EMPTY = {
  title: '',
  summary: '',
  content: '',
  category: '',
  image_url: '',
  author_name: 'ORVAX',
  author_avatar: '',
  read_time_min: 5,
  date_day: '',
  date_month: '',
  is_highlight: false,
  highlight_order: 0,
  published: true,
};

export default function AdminBlog() {
    const { t } = useLang();
  const [posts, setPosts]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [view, setView]               = useState('list'); // 'list' | 'form'
  const [editingId, setEditingId]     = useState(null);
  const [form, setForm]               = useState(EMPTY);
  const [saving, setSaving]           = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError]             = useState('');

  useEffect(() => { loadPosts(); }, []);

  async function loadPosts() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('blog_posts')
      .select('id, title, category, published, is_highlight, highlight_order, author_name, date_day, date_month, created_at')
      .order('created_at', { ascending: false });
    if (!err) setPosts(data || []);
    setLoading(false);
  }

  async function openEdit(id) {
    const { data } = await supabase.from('blog_posts').select('*').eq('id', id).single();
    if (data) { setEditingId(id); setForm({ ...EMPTY, ...data }); setError(''); setView('form'); }
  }

  function openNew() { setEditingId(null); setForm(EMPTY); setError(''); setView('form'); }

  async function save() {
    if (!form.title.trim()) { setError(t('admin.titleRequired')); return; }
    setSaving(true); setError('');
    const payload = {
      ...form,
      highlight_order: Number(form.highlight_order) || 0,
      read_time_min:   Number(form.read_time_min)   || 5,
    };
    const { error: err } = editingId
      ? await supabase.from('blog_posts').update(payload).eq('id', editingId)
      : await supabase.from('blog_posts').insert(payload);
    setSaving(false);
    if (err) { setError(err.message); return; }
    await loadPosts();
    setView('list');
  }

  async function confirmDelete() {
    await supabase.from('blog_posts').delete().eq('id', deleteTarget);
    setDeleteTarget(null);
    await loadPosts();
  }

  async function toggle(id, field, cur) {
    await supabase.from('blog_posts').update({ [field]: !cur }).eq('id', id);
    setPosts(prev => prev.map(p => p.id === id ? { ...p, [field]: !cur } : p));
  }

  const set = (k) => (e) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  // ── LOADING ──────────────────────────────────────────────────
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[var(--bg-color)]">
      <span className="font-mono text-xs tracking-[0.4em] text-[var(--text-main)] opacity-40 animate-pulse uppercase">{t('admin.loading')}</span>
    </div>
  );

  // ── DELETE CONFIRM ────────────────────────────────────────────
  if (deleteTarget) return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 bg-[var(--bg-color)] px-8">
      <AlertTriangle size={36} className="text-[var(--text-main)]" />
      <p className="text-[var(--text-main)] font-black tracking-widest uppercase text-center text-sm leading-loose">
        Deletar este post<br/>permanentemente?
      </p>
      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={() => setDeleteTarget(null)}
          className="flex-1 py-3 border border-[var(--border-color)] text-[var(--text-main)] font-black text-xs tracking-widest uppercase rounded-full active:scale-95 transition-all"
        >
          CANCELAR
        </button>
        <button
          onClick={confirmDelete}
          className="flex-1 py-3 bg-[var(--text-main)] text-[var(--bg-color)] font-black text-xs tracking-widest uppercase rounded-full active:scale-95 transition-all"
        >
          DELETAR
        </button>
      </div>
    </div>
  );

  // ── FORM VIEW ─────────────────────────────────────────────────
  if (view === 'form') return (
    <div className="h-screen overflow-y-auto bg-[var(--bg-color)] px-5 pt-14 pb-32">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => setView('list')}
          className="flex items-center gap-2 text-[var(--text-main)] opacity-40 hover:opacity-100 transition-opacity"
        >
          <ArrowLeft size={16} />
          <span className="font-black text-[10px] tracking-widest uppercase">{t('common.back')}</span>
        </button>
        <span className="font-black text-[10px] tracking-[0.4em] uppercase text-[var(--text-main)]">
          {editingId ? t('admin.editPost') : t('admin.newPost')}
        </span>
      </div>

      {error && (
        <p className="text-red-400 font-mono text-xs mb-5 border border-red-400/30 rounded-xl px-4 py-2">{error}</p>
      )}

      <div className="space-y-4">
        <Field label={t('admin.fTitle')}        value={form.title}        onChange={set('title')} />
        <Field label="SUMMARY"         value={form.summary}      onChange={set('summary')}  multiline rows={2} />
        <Field label={t('admin.fContent')}        value={form.content}      onChange={set('content')}  multiline rows={7} />
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('admin.fCategory')}       value={form.category}     onChange={set('category')}     placeholder={t('admin.sciencePh')} />
          <Field label="READ TIME (min)" value={form.read_time_min} onChange={set('read_time_min')} type="number" />
        </div>
        <Field label={t('admin.fImage')}    value={form.image_url}    onChange={set('image_url')}    placeholder="https://..." />
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('admin.fAuthor')}           value={form.author_name}  onChange={set('author_name')} />
          <Field label="AVATAR (URL)"    value={form.author_avatar} onChange={set('author_avatar')} placeholder="https://..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('admin.fDay')}   value={form.date_day}   onChange={set('date_day')}   placeholder="24" />
          <Field label={t('admin.fMonth')}   value={form.date_month} onChange={set('date_month')} placeholder="MAR" />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <Toggle label={t('admin.fPublished')} checked={!!form.published}   onChange={set('published')} />
          <Toggle label="HIGHLIGHT" checked={!!form.is_highlight} onChange={set('is_highlight')} />
        </div>

        {form.is_highlight && (
          <Field label={t('admin.fHighlightOrder')} value={form.highlight_order} onChange={set('highlight_order')} type="number" />
        )}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-8 py-4 bg-[var(--text-main)] text-[var(--bg-color)] font-black text-xs tracking-widest uppercase rounded-full shadow-lg disabled:opacity-40 active:scale-95 transition-all"
      >
        <Save size={15} />
        {saving ? t('admin.saving') : t('admin.savePost')}
      </button>
    </div>
  );

  // ── LIST VIEW ─────────────────────────────────────────────────
  return (
    <div className="h-screen overflow-y-auto bg-[var(--bg-color)] px-5 pt-14 pb-32">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[9px] font-black tracking-[0.4em] text-[var(--text-main)] opacity-30 uppercase mb-0.5">ADMIN</p>
          <h1 className="text-3xl font-black tracking-tighter text-[var(--text-main)] uppercase leading-none">BLOG</h1>
          <p className="text-[10px] font-mono text-[var(--text-main)] opacity-30 mt-1">{posts.length} posts</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 border border-[var(--border-color)] text-[var(--text-main)] font-black text-[10px] tracking-widest uppercase rounded-full hover:bg-[var(--text-main)] hover:text-[var(--bg-color)] transition-all active:scale-95"
        >
          <Plus size={13} />
          NOVO
        </button>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <p className="text-center text-[var(--text-main)] opacity-20 font-mono text-xs tracking-widest mt-24 uppercase">
          Nenhum post cadastrado.
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <article
              key={post.id}
              className="border border-[var(--border-color)] rounded-2xl p-4 transition-all"
            >
              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {post.category && (
                  <span className="text-[8px] font-black tracking-widest px-2 py-0.5 border border-[var(--border-color)] rounded-full uppercase text-[var(--text-main)] opacity-60">
                    {post.category}
                  </span>
                )}
                {post.is_highlight && (
                  <span className="text-[8px] font-black tracking-widest px-2 py-0.5 bg-[var(--text-main)] text-[var(--bg-color)] rounded-full uppercase">
                    ★ HIGHLIGHT {post.highlight_order}
                  </span>
                )}
                <span className={`text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase border ${post.published ? 'text-emerald-400 border-emerald-400/30' : 'text-zinc-500 border-zinc-500/30'}`}>
                  {post.published ? 'PUBLICADO' : 'RASCUNHO'}
                </span>
              </div>

              {/* Title + meta */}
              <h3 className="font-black text-sm text-[var(--text-main)] leading-tight mb-1">{post.title}</h3>
              <p className="text-[9px] font-mono text-[var(--text-main)] opacity-30">
                {post.date_day && post.date_month
                  ? `${post.date_day} ${post.date_month}`
                  : new Date(post.created_at).toLocaleDateString('pt-BR')}
                {post.author_name ? ` · ${post.author_name}` : ''}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border-color)]">
                <ActionBtn icon={post.published ? <EyeOff size={13}/> : <Eye size={13}/>}
                  label={post.published ? 'OCULTAR' : 'PUBLICAR'}
                  onClick={() => toggle(post.id, 'published', post.published)} />

                <ActionBtn icon={<Star size={13} fill={post.is_highlight ? 'currentColor' : 'none'}/>}
                  label="DESTAQUE"
                  onClick={() => toggle(post.id, 'is_highlight', post.is_highlight)} />

                <div className="ml-auto flex items-center gap-3">
                  <ActionBtn icon={<Pencil size={13}/>} label={t('admin.edit')}
                    onClick={() => openEdit(post.id)} />
                  <ActionBtn icon={<Trash2 size={13}/>} label="DEL"
                    onClick={() => setDeleteTarget(post.id)} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function Field({ label, value, onChange, multiline, rows = 3, type = 'text', placeholder }) {
  const cls = "w-full bg-transparent border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)] font-mono text-sm focus:outline-none focus:border-[var(--text-main)] transition-colors placeholder:opacity-20";
  return (
    <div>
      <label className="block text-[9px] font-black tracking-[0.4em] uppercase text-[var(--text-main)] opacity-40 mb-1.5">
        {label}
      </label>
      {multiline
        ? <textarea className={cls} rows={rows} value={value} onChange={onChange} placeholder={placeholder} />
        : <input type={type} className={cls} value={value} onChange={onChange} placeholder={placeholder} />
      }
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between border border-[var(--border-color)] rounded-xl px-4 py-3 cursor-pointer select-none">
      <span className="text-[9px] font-black tracking-[0.4em] uppercase text-[var(--text-main)] opacity-40">{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4" />
    </label>
  );
}

function ActionBtn({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[var(--text-main)] opacity-40 hover:opacity-100 active:scale-90 transition-all"
    >
      {icon}
      <span className="text-[8px] font-black tracking-widest uppercase">{label}</span>
    </button>
  );
}
