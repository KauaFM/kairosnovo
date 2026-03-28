import React, { useState } from 'react';
import { Heart, MessageCircle, Trash2, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { timeAgo, formatDuration, ACTIVITY_TYPES } from '../utils/formatters';
import { toggleReaction, addComment, getComments, deleteWorkout } from '../services/checkinService';

const WorkoutCard = ({ workout, currentUserId, onDelete }) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const activityInfo = ACTIVITY_TYPES.find(a => a.value === workout.activity_type) || ACTIVITY_TYPES[7];
  const isOwner = workout.user_id === currentUserId;

  const handleLike = async () => {
    const result = await toggleReaction(workout.id, currentUserId);
    setLiked(result);
    setLikeCount(prev => result ? prev + 1 : prev - 1);
  };

  const handleToggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true);
      const data = await getComments(workout.id);
      setComments(data);
      setLoadingComments(false);
    }
    setShowComments(!showComments);
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    const newComment = await addComment(workout.id, currentUserId, commentText.trim());
    if (newComment) setComments(prev => [...prev, newComment]);
    setCommentText('');
  };

  const handleDelete = async () => {
    await deleteWorkout(workout.id);
    onDelete?.(workout.id);
  };

  return (
    <div className="p-4 rounded-sm border relative overflow-hidden"
      style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full overflow-hidden border"
          style={{ borderColor: 'var(--border-color)' }}>
          {workout.profiles?.avatar_url ? (
            <img src={workout.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] font-mono opacity-40">?</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold tracking-wide block truncate">
            {workout.profiles?.username || 'Anon'}
          </span>
          <span className="text-[9px] font-mono opacity-40">{timeAgo(workout.created_at)}</span>
        </div>
        <span className="text-lg">{activityInfo.icon}</span>
        {isOwner && (
          <button onClick={handleDelete} className="opacity-30 hover:opacity-80 hover:text-red-400 transition-all">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      <h4 className="text-sm font-bold mb-1">{workout.title}</h4>
      {workout.description && (
        <p className="text-[11px] opacity-60 mb-2 font-mono">{workout.description}</p>
      )}

      {/* Photo */}
      {workout.photo_url && (
        <div className="rounded-sm overflow-hidden mb-3 border" style={{ borderColor: 'var(--border-color)' }}>
          <img src={workout.photo_url} alt={workout.title} className="w-full max-h-60 object-cover" />
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[10px] font-mono opacity-60 mb-3 flex-wrap">
        {workout.duration_min && <span>{formatDuration(workout.duration_min)}</span>}
        {workout.calories && <span>{workout.calories} kcal</span>}
        {workout.steps && <span>{workout.steps.toLocaleString()} passos</span>}
        {workout.distance_km && <span>{workout.distance_km} km</span>}
        <span className="ml-auto text-[#22c55e] font-bold">+{Number(workout.points).toFixed(0)} pts</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <button onClick={handleLike} className={`flex items-center gap-1.5 text-[11px] font-mono transition-all ${liked ? 'text-red-400' : 'opacity-50 hover:opacity-100'}`}>
          <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
          {likeCount > 0 && likeCount}
        </button>
        <button onClick={handleToggleComments} className="flex items-center gap-1.5 text-[11px] font-mono opacity-50 hover:opacity-100 transition-all">
          <MessageCircle size={14} />
          {comments.length > 0 && comments.length}
          {showComments ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: 'var(--border-color)' }}>
          {loadingComments && <span className="text-[10px] font-mono opacity-40">Carregando...</span>}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-5 h-5 rounded-full overflow-hidden border flex-shrink-0 mt-0.5"
                style={{ borderColor: 'var(--border-color)' }}>
                {c.profiles?.avatar_url ? (
                  <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-current opacity-10" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold">{c.profiles?.username}</span>
                <p className="text-[11px] opacity-70">{c.body}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
              placeholder="Comentar..."
              className="flex-1 text-[11px] font-mono bg-transparent border rounded-sm px-2 py-1.5 outline-none"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
            <button onClick={handleSendComment} className="opacity-50 hover:opacity-100 transition-opacity">
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const WorkoutFeed = ({ workouts, currentUserId, onDelete }) => {
  if (!workouts.length) {
    return (
      <div className="text-center py-12 opacity-40">
        <p className="text-[11px] font-mono tracking-wider">NENHUM TREINO REGISTRADO</p>
        <p className="text-[9px] font-mono mt-1">Seja o primeiro a fazer check-in!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workouts.map((w) => (
        <WorkoutCard key={w.id} workout={w} currentUserId={currentUserId} onDelete={onDelete} />
      ))}
    </div>
  );
};

export default WorkoutFeed;
