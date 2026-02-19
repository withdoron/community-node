import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageSquarePlus, Trash2, ExternalLink, Image, Clock, User, MapPin, Lightbulb, Bug } from 'lucide-react';

const FeedbackLog = base44.entities.FeedbackLog;

export default function FeedbackReview() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'feedback', 'bug'

  const loadFeedback = async () => {
    try {
      const list = await FeedbackLog.list('-created_at');
      setFeedback(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load feedback:', err);
      setFeedback([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this feedback entry?')) return;
    try {
      await FeedbackLog.delete(id);
      setFeedback(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('Failed to delete feedback:', err);
    }
  };

  const filtered = filter === 'all'
    ? feedback
    : feedback.filter(f => f.feedback_type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Pilot Feedback</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'feedback', 'bug'].map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filter === type
                  ? 'bg-amber-500/20 text-amber-500'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {type === 'all' ? `All (${feedback.length})` :
               type === 'feedback' ? `Ideas (${feedback.filter(f => f.feedback_type === 'feedback').length})` :
               `Bugs (${feedback.filter(f => f.feedback_type === 'bug').length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <MessageSquarePlus className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-slate-400 font-medium">
            {filter === 'all' ? 'No feedback yet' : `No ${filter === 'bug' ? 'bug reports' : 'feedback'} yet`}
          </h3>
          <p className="text-slate-500 text-sm mt-1">Feedback from pilot users will appear here.</p>
        </div>
      )}

      {/* Feedback entries */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div key={item.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            {/* Header: type badge + user info + date + delete */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                {/* Type badge */}
                {item.feedback_type === 'bug' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                    <Bug className="w-3 h-3" />
                    Bug
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium">
                    <Lightbulb className="w-3 h-3" />
                    Idea
                  </span>
                )}
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-slate-300">{item.user_email || 'Unknown user'}</span>
                {item.user_role && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs">
                    {item.user_role}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="text-slate-500 hover:text-red-400 transition-colors p-2 flex-shrink-0"
                title="Delete feedback"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* What happened */}
            <div className="mb-2">
              <p className="text-white text-sm whitespace-pre-wrap">{item.what_happened}</p>
            </div>

            {/* What expected (if present) */}
            {item.what_expected && (
              <div className="mb-2 pl-3 border-l-2 border-slate-700">
                <p className="text-slate-400 text-sm">
                  <span className="text-slate-500 font-medium">Expected: </span>
                  {item.what_expected}
                </p>
              </div>
            )}

            {/* Screenshot (if present) */}
            {item.screenshot && (
              <div className="mb-2">
                <a
                  href={typeof item.screenshot === 'string' ? item.screenshot : item.screenshot?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-amber-500 hover:text-amber-400 text-sm"
                >
                  <Image className="w-4 h-4" />
                  View screenshot
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Footer: page + timestamp */}
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-3 pt-2 border-t border-slate-800">
              {item.page_url && (
                <span className="flex items-center gap-1 min-w-0">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[200px]">{item.page_url}</span>
                </span>
              )}
              {item.created_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(item.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                  })}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
