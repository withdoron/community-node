/**
 * NotificationBell — small badge + dropdown for FrequencyNotification.
 * Shows unread count. Tap opens a dropdown list.
 * Tap a notification navigates via its link and marks it read.
 * FrequencyNotification read isolation: queries .list() and filters
 * client-side by user_id === currentUser.id (per MylaneNote pattern,
 * Creator Only doesn't scope by recipient).
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Music, Loader2 } from 'lucide-react';

export default function NotificationBell({ userId }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ['frequency-notifications', userId],
    queryFn: async () => {
      try {
        const all = await base44.entities.FrequencyNotification.list();
        const arr = Array.isArray(all) ? all : [];
        // Client-side filter by user_id (Creator Only doesn't scope by recipient)
        return arr.filter((n) => String(n.user_id) === String(userId));
      } catch { return []; }
    },
    enabled: !!userId,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleNotificationClick = useCallback(async (notif) => {
    // Mark as read
    if (!notif.is_read) {
      try {
        await base44.entities.FrequencyNotification.update(notif.id, { is_read: true });
        queryClient.invalidateQueries({ queryKey: ['frequency-notifications'] });
      } catch {}
    }
    setOpen(false);
    if (notif.link) navigate(notif.link);
  }, [navigate, queryClient]);

  if (!userId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-secondary transition-colors"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-72 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-medium text-foreground">Notifications</span>
            <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {notifications
                .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))
                .slice(0, 20)
                .map((notif) => (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-secondary transition-colors ${
                      notif.is_read ? '' : 'bg-primary/5'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Music className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs ${notif.is_read ? 'text-foreground-soft' : 'text-foreground font-medium'}`}>
                          {notif.title}
                        </p>
                        {notif.message && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                        )}
                        {notif.created_date && (
                          <p className="text-[10px] text-muted-foreground/50 mt-1">
                            {new Date(notif.created_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
