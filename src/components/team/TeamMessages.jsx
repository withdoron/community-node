import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { sanitizeText } from '@/utils/sanitize';
import { toast } from 'sonner';
import { MessageSquare, Send, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CHANNELS = [
  { id: 'announcement', label: 'Announcements', type: 'announcement' },
  { id: 'discussion', label: 'Discussion', type: 'discussion' },
];

function getSenderLabel(userId, team, members = []) {
  if (!userId) return 'Team';
  const ownerId = team?.owner_id;
  if (userId === ownerId) return 'Coach';
  const member = members.find((m) => m.user_id === userId);
  if (member) {
    if (member.role === 'coach') return member.jersey_name || 'Coach';
    if (member.role === 'parent') return member.jersey_name || 'Parent';
    if (member.role === 'player') return member.jersey_name || 'Player';
    return member.jersey_name || 'Member';
  }
  return 'Member';
}

function getRoleBadgeClass(role, ownerId, userId) {
  if (userId === ownerId || role === 'coach') return 'bg-primary/20 text-primary';
  if (role === 'parent') return 'bg-surface text-muted-foreground';
  return 'bg-surface text-foreground-soft';
}

export default function TeamMessages({ teamId, teamScope }) {
  const queryClient = useQueryClient();
  const team = teamScope?.team;
  const members = teamScope?.members || [];
  const currentUserId = teamScope?.currentUserId;
  const isCoach = teamScope?.effectiveRole === 'coach';
  const [activeChannel, setActiveChannel] = useState(isCoach ? 'announcement' : 'discussion');
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const messageType = activeChannel === 'announcement' ? 'announcement' : 'discussion';
  const canPostAnnouncement = isCoach && activeChannel === 'announcement';
  const canPostDiscussion = true;

  const { data: rawMessages = [], isLoading } = useQuery({
    queryKey: ['team-messages', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const list = await base44.entities.TeamMessage.filter({ team_id: teamId });
      return Array.isArray(list) ? list : [];
    },
    enabled: !!teamId,
  });

  const messages = useMemo(() => {
    const filtered = rawMessages.filter((m) => m.message_type === messageType);
    if (messageType === 'announcement') {
      return [...filtered].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        return ta - tb;
      });
    }
    return [...filtered].sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return ta - tb;
    });
  }, [rawMessages, messageType]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => scrollToBottom(), [messages.length, activeChannel]);

  const createMutation = useMutation({
    mutationFn: async ({ text, type, pinned }) => {
      return base44.entities.TeamMessage.create({
        team_id: teamId,
        user_id: currentUserId,
        message: sanitizeText(text),
        message_type: type,
        pinned: !!pinned,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-messages', teamId] });
      setInputText('');
      scrollToBottom();
      toast.success('Message sent');
    },
    onError: (err) => toast.error(err?.message || 'Failed to send'),
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }) => base44.entities.TeamMessage.update(id, { pinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-messages', teamId] }),
    onError: (err) => toast.error(err?.message || 'Failed to update'),
  });

  const canPost = (activeChannel === 'announcement' && canPostAnnouncement) || (activeChannel === 'discussion' && canPostDiscussion);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !canPost) return;
    createMutation.mutate({ text, type: messageType, pinned: false });
  };

  if (!teamId) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {CHANNELS.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setActiveChannel(ch.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeChannel === ch.id ? 'bg-primary text-primary-foreground' : 'bg-surface text-foreground-soft hover:bg-surface'
            }`}
          >
            {ch.label}
          </button>
        ))}
      </div>

      {activeChannel === 'announcement' && (
        <p className="text-muted-foreground text-sm">
          {isCoach ? 'Only coaches can post announcements. Pinned messages stay at the top.' : 'Announcements from your coach.'}
        </p>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading messages…</p>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {activeChannel === 'announcement' ? 'No announcements yet.' : 'No messages in discussion yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {messages.map((msg) => (
            <MessageCard
              key={msg.id}
              msg={msg}
              team={team}
              members={members}
              isCoach={isCoach}
              onPin={() => pinMutation.mutate({ id: msg.id, pinned: !msg.pinned })}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {canPost && (
        <div className="flex gap-2 pt-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder={activeChannel === 'announcement' ? 'Post an announcement…' : 'Message the team…'}
            className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none transition-colors"
          />
          <Button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() || createMutation.isPending}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium px-4 py-2 rounded-lg min-h-[44px] transition-colors"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      {activeChannel === 'discussion' && !currentUserId && (
        <p className="text-muted-foreground/70 text-sm">Sign in to join the discussion.</p>
      )}
    </div>
  );
}

function MessageCard({ msg, team, members, isCoach, onPin }) {
  const senderLabel = getSenderLabel(msg.user_id, team, members);
  const member = members.find((m) => m.user_id === msg.user_id);
  const role = member?.role || (msg.user_id === team?.owner_id ? 'coach' : null);
  const badgeClass = getRoleBadgeClass(role, team?.owner_id, msg.user_id);
  const timeStr = msg.created_at ? new Date(msg.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

  return (
    <div className={`bg-secondary border rounded-xl p-4 transition-colors ${msg.pinned ? 'border-primary/50' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground">{senderLabel}</span>
            {role && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>
                {role === 'coach' ? 'Coach' : role}
              </span>
            )}
            {msg.pinned && <Pin className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
          </div>
          <p className="text-muted-foreground text-xs mt-0.5">{timeStr}</p>
          <p className="text-foreground-soft mt-2 whitespace-pre-wrap break-words">{msg.message}</p>
        </div>
        {isCoach && (
          <button
            type="button"
            onClick={onPin}
            className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${msg.pinned ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-surface'}`}
            title={msg.pinned ? 'Unpin' : 'Pin'}
          >
            <Pin className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
