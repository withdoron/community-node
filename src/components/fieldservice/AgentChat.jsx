/**
 * AgentChat — conversational chat panel connected to a Base44 Superagent.
 * Supports text input, push-to-talk voice, conversation history, and file upload.
 * Renders as a slide-up panel on mobile, slide-in drawer on desktop.
 *
 * Props:
 *   agentName  — Base44 agent name (e.g. 'FieldServiceAgent')
 *   userId     — current user's ID (for conversation persistence)
 *   isOpen     — whether the panel is visible
 *   onClose    — callback to close the panel
 *   docked     — render as relative panel (for Mylane) vs fixed overlay
 *   onMessage  — callback when agent responds
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Send, Loader2, Mic, MicOff, Bot, Plus, Clock, Paperclip, FileText, ArrowLeft, Pencil, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { parseRenderInstruction } from '@/components/mylane/parseRenderInstruction';
import ConfirmationCard from '@/components/mylane/ConfirmationCard';

// ─── Constants ──────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];

// ─── Quick-Action Chip Definitions ──────────────
const CHIP_DEFS = [
  { label: '+ Client',              message: 'I want to add a new field service client',    workspace: 'field-service', write: true },
  { label: '+ Estimate',            message: 'I want to create a new estimate',             workspace: 'field-service', write: true },
  { label: 'Log Receipt',           message: 'I want to log a receipt',                     workspace: 'field-service', write: true },
  { label: 'Log Expense',           message: 'I want to log an expense',                    workspace: 'finance',       write: true },
  { label: 'Log Income',            message: 'I want to log income',                        workspace: 'finance',       write: true },
  { label: 'Add Player',            message: 'I want to add a player to the team',          workspace: 'team',          write: true },
  { label: '+ Property',            message: 'I want to add a new property',                workspace: 'property-pulse',write: true },
  { label: 'Maintenance Request',   message: 'I want to log a maintenance request',         workspace: 'property-pulse',write: true },
  { label: 'Search Directory',      message: 'Search the business directory',               workspace: null,            write: false },
  { label: 'Give Feedback',         message: 'I want to give feedback',                     workspace: null,            write: false },
];

// ─── Helpers ─────────────────────────────────────

/** Parse URLs in text and wrap them in clickable <a> tags */
function renderMessageContent(text) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s)<>]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary-hover hover:text-primary-hover underline break-all"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/** Relative time display */
function relativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

/** Hidden conversations — localStorage fallback since SDK has no delete method */
function getHiddenConversations(agentName) {
  try {
    const raw = localStorage.getItem(`${agentName}_hidden_conversations`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function hideConversation(agentName, conversationId) {
  try {
    const hidden = getHiddenConversations(agentName);
    hidden.add(conversationId);
    localStorage.setItem(`${agentName}_hidden_conversations`, JSON.stringify([...hidden]));
  } catch { /* ignore */ }
}

// ─── Voice Input Hook ────────────────────────────

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;
const voiceSupported = !!SpeechRecognition;

function useVoiceInput({ onFinal, onInterim }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = useCallback(() => {
    if (!voiceSupported) {
      toast.error('Voice input not supported in this browser');
      return;
    }
    // Stop any previous instance
    if (recognitionRef.current) recognitionRef.current.stop();

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (event.results[0].isFinal) {
        onFinal?.(transcript.trim());
      } else {
        onInterim?.(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Check your browser settings.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onFinal, onInterim]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  return { isListening, startListening, stopListening };
}

// ─── Main Component ──────────────────────────────

export default function AgentChat({ agentName = 'FieldServiceAgent', userId, isOpen, onClose, docked = false, fillHeight = false, onMessage, workspaceProfiles = null, pendingMessage = null, onPendingMessageSent = null, mylane_tier = 'basic' }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversationObj, setConversationObj] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [attachment, setAttachment] = useState(null); // { file, previewUrl, type }
  const [isUploading, setIsUploading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const userScrolledUpRef = useRef(false);
  const hasUserInteractedRef = useRef(false); // don't auto-scroll on mount
  const pendingSentRef = useRef(false); // guard against double-send on re-mount
  const handleSendMessageRef = useRef(null); // stable ref for pending message effect

  // ─── Smart scroll — don't auto-scroll on mount or if user scrolled up ──
  const scrollToBottom = useCallback((force = false) => {
    if (!force && userScrolledUpRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // Skip auto-scroll on initial load — only scroll after user interaction
    if (!hasUserInteractedRef.current) return;
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Detect user scroll position
  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUpRef.current = distFromBottom > 80;
  }, []);

  // ─── Initialize or resume conversation ─────────
  useEffect(() => {
    if (!isOpen || !userId) return;

    let cancelled = false;

    async function initConversation() {
      setIsLoading(true);
      try {
        // Try to find an existing conversation for this user + agent
        const conversations = await base44.agents.listConversations({
          agent_name: agentName,
        });
        const existing = Array.isArray(conversations)
          ? conversations.find(
              (c) =>
                c.metadata?.created_by_user_id === userId &&
                c.agent_name === agentName
            )
          : null;

        if (cancelled) return;

        if (existing) {
          setConversationId(existing.id);
          setConversationObj(existing);
          setMessages(existing.messages || []);
        } else {
          // Create new conversation
          const conv = await base44.agents.createConversation({
            agent_name: agentName,
            metadata: {
              name: `${agentName} Chat`,
              created_by_user_id: userId,
            },
          });
          if (cancelled) return;
          setConversationId(conv.id);
          setConversationObj(conv);
          setMessages(conv.messages || []);
        }
      } catch (err) {
        console.error('Failed to initialize agent conversation:', err);
        if (!cancelled) {
          toast.error('Could not connect to agent. Please try again.');
        }
      }
      if (!cancelled) setIsLoading(false);
    }

    initConversation();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId, agentName]);

  // ─── Subscribe to real-time updates ────────────
  useEffect(() => {
    if (!conversationId) return;

    try {
      const unsubscribe = base44.agents.subscribeToConversation(
        conversationId,
        (updatedData) => {
          setMessages(updatedData.messages || []);
          // If the last message is from the agent, it's done thinking
          const msgs = updatedData.messages || [];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            setIsAgentThinking(false);
            onMessage?.(lastMsg);
          }
        }
      );
      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      console.error('Failed to subscribe to conversation:', err);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [conversationId, onMessage]);

  // ─── New Conversation ──────────────────────────
  const handleNewConversation = useCallback(async () => {
    // Unsubscribe from current
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    // Reset state — old conversation persists in Base44 automatically
    setMessages([]);
    setConversationId(null);
    setConversationObj(null);
    setShowHistory(false);
    setAttachment(null);

    // Create a fresh conversation
    try {
      setIsLoading(true);
      const conv = await base44.agents.createConversation({
        agent_name: agentName,
        metadata: {
          name: `${agentName} Chat`,
          created_by_user_id: userId,
        },
      });
      setConversationId(conv.id);
      setConversationObj(conv);
      setMessages(conv.messages || []);
    } catch (err) {
      console.error('Failed to create new conversation:', err);
      toast.error('Could not start new conversation.');
    }
    setIsLoading(false);
  }, [agentName, userId]);

  // ─── Load conversation history from SDK ─────────
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const conversations = await base44.agents.listConversations({
        agent_name: agentName,
      });
      const list = Array.isArray(conversations) ? conversations : [];
      // Filter to this user's conversations, sort newest first
      // SDK may use created_date/updated_date instead of created_at/updated_at
      const getTime = (c) => new Date(c.updated_at || c.updated_date || c.created_at || c.created_date || 0).getTime();
      // Filter out hidden conversations
      const hidden = getHiddenConversations(agentName);
      const userConvs = list
        .filter((c) => c.metadata?.created_by_user_id === userId && c.agent_name === agentName && !hidden.has(c.id))
        .sort((a, b) => getTime(b) - getTime(a))
        .slice(0, 20);
      setHistoryEntries(userConvs);
    } catch (err) {
      console.error('[AgentChat] Failed to load conversation history:', err);
      setHistoryEntries([]);
    }
    setHistoryLoading(false);
  }, [agentName, userId]);

  // Fetch history when panel opens
  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory, loadHistory]);

  // ─── Resume a conversation from history ────────
  const handleResumeConversation = useCallback(async (conv) => {
    // Unsubscribe from current
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    setShowHistory(false);
    setIsLoading(true);
    setMessages([]);
    setAttachment(null);

    try {
      // Load the full conversation with all messages
      const conversations = await base44.agents.listConversations({
        agent_name: agentName,
      });
      const found = Array.isArray(conversations)
        ? conversations.find((c) => c.id === conv.id)
        : null;

      if (found) {
        setConversationId(found.id);
        setConversationObj(found);
        setMessages(found.messages || []);
      } else {
        // Fallback: set conversation ID and let new messages continue it
        setConversationId(conv.id);
        setConversationObj(conv);
        setMessages(conv.messages || []);
      }
    } catch (err) {
      console.error('[AgentChat] Failed to resume conversation:', err);
      toast.error('Could not load conversation.');
      // Fallback
      setConversationId(conv.id);
      setConversationObj(conv);
      setMessages(conv.messages || []);
    }
    setIsLoading(false);
  }, [agentName]);

  // ─── Delete conversation (hide via localStorage) ──
  const handleDeleteConversation = useCallback((convId) => {
    hideConversation(agentName, convId);
    setHistoryEntries((prev) => prev.filter((c) => c.id !== convId));
    setConfirmDeleteId(null);
    // If deleting the current conversation, start fresh
    if (convId === conversationId) {
      handleNewConversation();
    }
  }, [agentName, conversationId, handleNewConversation]);

  // ─── File Upload ───────────────────────────────
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be selected again
    e.target.value = '';

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Unsupported file type. Use JPG, PNG, HEIC, or PDF.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    const isImage = file.type.startsWith('image/');
    const previewUrl = isImage ? URL.createObjectURL(file) : null;
    setAttachment({ file, previewUrl, type: isImage ? 'image' : 'pdf', name: file.name });
  }, []);

  const clearAttachment = useCallback(() => {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  }, [attachment]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Send Message ──────────────────────────────
  const handleSendMessage = useCallback(
    async (text) => {
      const rawText = (text || inputValue).trim();
      if ((!rawText && !attachment) || !conversationObj || isSending) return;

      setInputValue('');
      setIsSending(true);
      setIsAgentThinking(true);

      let messageText = rawText;

      // Handle file upload if attachment is present
      if (attachment) {
        setIsUploading(true);
        try {
          const result = await base44.integrations.Core.UploadFile({ file: attachment.file });
          const fileUrl = result?.file_url || result?.url;
          if (fileUrl) {
            if (attachment.type === 'image') {
              messageText = `[Attached image: ${fileUrl}]${rawText ? ' ' + rawText : ''}`;
            } else {
              messageText = `[Attached document: ${attachment.name}, URL: ${fileUrl}]${rawText ? ' ' + rawText : ''}`;
            }
          }
        } catch (err) {
          console.error('File upload failed:', err);
          toast.error('File upload failed. Sending message without attachment.');
        }
        setIsUploading(false);
        clearAttachment();
      }

      if (!messageText) {
        setIsSending(false);
        setIsAgentThinking(false);
        return;
      }

      // Optimistic: add user message immediately and force scroll
      hasUserInteractedRef.current = true;
      const userMsg = { role: 'user', content: messageText, id: `temp_${Date.now()}` };
      setMessages((prev) => [...prev, userMsg]);
      userScrolledUpRef.current = false;
      setTimeout(() => scrollToBottom(true), 50);

      try {
        await base44.agents.addMessage(conversationObj, {
          role: 'user',
          content: messageText,
        });
      } catch (err) {
        console.error('Failed to send message:', err);
        toast.error('Failed to send message');
        setIsAgentThinking(false);
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      }
      setIsSending(false);
    },
    [inputValue, conversationObj, isSending, attachment, clearAttachment]
  );

  // Keep handleSendMessageRef current without triggering extra effects
  useEffect(() => { handleSendMessageRef.current = handleSendMessage; }, [handleSendMessage]);

  // Auto-send pendingMessage once conversation is ready (warm workspace entry)
  useEffect(() => {
    if (!pendingMessage || !conversationObj || isLoading || pendingSentRef.current) return;
    pendingSentRef.current = true;
    const timer = setTimeout(() => {
      handleSendMessageRef.current?.(pendingMessage);
      onPendingMessageSent?.();
    }, 400); // small delay lets the panel settle before sending
    return () => clearTimeout(timer);
  }, [pendingMessage, conversationObj, isLoading, onPendingMessageSent]);

  // ─── Voice Input ───────────────────────────────
  const { isListening, startListening, stopListening } = useVoiceInput({
    onFinal: (transcript) => {
      setInputValue('');
      handleSendMessage(transcript);
    },
    onInterim: (transcript) => {
      setInputValue(transcript);
    },
  });

  // ─── Key handler ───────────────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // ─── Agent display name ────────────────────────
  const agentDisplayName = useMemo(() => {
    return agentName.replace(/([A-Z])/g, ' $1').trim();
  }, [agentName]);

  // ─── Quick-action chips ────────────────────────
  const availableChips = useMemo(() => {
    // Determine which workspaces the user has
    const activeWorkspaces = new Set();
    let isAdmin = false;
    if (workspaceProfiles) {
      if (workspaceProfiles.fieldService?.length > 0) activeWorkspaces.add('field-service');
      if (workspaceProfiles.finance?.length > 0) activeWorkspaces.add('finance');
      if (workspaceProfiles.teams?.length > 0) activeWorkspaces.add('team');
      if (workspaceProfiles.propertyMgmt?.length > 0) activeWorkspaces.add('property-pulse');
      isAdmin = !!workspaceProfiles.isAdmin;
    }

    return CHIP_DEFS.filter((chip) => {
      // Always show read chips
      if (!chip.write) return true;
      // Write chips need the workspace to be active
      if (chip.workspace && !activeWorkspaces.has(chip.workspace)) return false;
      // Tier gating: for now, show write chips if admin or profiles exist
      // (subscription_tier is defaulted to "full" pre-revenue)
      if (chip.write && !isAdmin) {
        // Beta/admin users always get write chips
        if (mylane_tier === 'beta') return true;
        // Basic users: check workspace profile tier
        if (chip.workspace && workspaceProfiles) {
          const profileMap = {
            'field-service': workspaceProfiles.fieldService,
            'finance': workspaceProfiles.finance,
            'team': workspaceProfiles.teams,
            'property-pulse': workspaceProfiles.propertyMgmt,
          };
          const profiles = profileMap[chip.workspace];
          if (profiles?.length > 0) {
            const tier = profiles[0]?.subscription_tier;
            if (tier && tier !== 'full') return false;
          }
        }
      }
      return true;
    });
  }, [workspaceProfiles]);

  const showChips = !inputValue.trim() && !attachment && !showHistory && !isLoading && availableChips.length > 0;

  if (!isOpen) return null;

  return (
    <div className={docked ? 'w-full' : 'fixed inset-x-0 bottom-0 sm:inset-auto sm:right-4 sm:bottom-20 z-40'}>
      <div className={`bg-background border border-border shadow-2xl flex flex-col overflow-hidden ${docked ? (fillHeight ? 'w-full h-full' : 'rounded-t-xl w-full max-h-[50vh]') : 'rounded-t-2xl sm:rounded-2xl w-full sm:w-96 max-h-[80vh] sm:max-h-[60vh]'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{agentDisplayName}</h3>
              <p className="text-xs text-muted-foreground/70">Your {agentName.replace(/Agent$/, '').replace(/([A-Z])/g, ' $1').trim()} assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* New conversation */}
            <button
              type="button"
              onClick={handleNewConversation}
              title="New conversation"
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Plus className="h-5 w-5" />
            </button>
            {/* History */}
            <button
              type="button"
              onClick={() => setShowHistory((s) => !s)}
              title="Conversation history"
              className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                showHistory ? 'text-primary bg-secondary' : 'text-muted-foreground hover:text-primary hover:bg-secondary'
              }`}
            >
              <Clock className="h-5 w-5" />
            </button>
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* History Panel — loaded from Base44 SDK */}
        {showHistory ? (
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-border">
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to chat
              </button>
            </div>
            {historyLoading ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              </div>
            ) : historyEntries.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground/70">No past conversations yet.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {historyEntries.map((conv) => {
                  const firstUserMsg = (conv.messages || []).find((m) => m.role === 'user');
                  const preview = firstUserMsg
                    ? (firstUserMsg.content || '').slice(0, 60)
                    : `Conversation from ${new Date(conv.created_at || conv.created_date || Date.now()).toLocaleDateString()}`;
                  const timestamp = conv.updated_at || conv.updated_date || conv.created_at || conv.created_date;
                  const isCurrent = conv.id === conversationId;
                  const isConfirming = confirmDeleteId === conv.id;
                  return (
                    <div
                      key={conv.id}
                      className={`border-b border-border transition-colors ${
                        isCurrent ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-secondary/50'
                      }`}
                    >
                      {isConfirming ? (
                        /* Inline delete confirmation */
                        <div className="px-4 py-3 flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">Delete this conversation?</p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteConversation(conv.id)}
                              className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors min-h-[44px]"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground-soft transition-colors min-h-[44px]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => !isCurrent && handleResumeConversation(conv)}
                            className="flex-1 text-left px-4 py-3"
                          >
                            <p className="text-sm text-foreground-soft truncate">{preview}</p>
                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                              {isCurrent ? 'Current' : relativeTime(timestamp)}
                            </p>
                          </button>
                          {/* Delete button — not shown on current conversation */}
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(conv.id); }}
                              className="p-3 text-muted-foreground/70 hover:text-red-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
                              title="Delete conversation"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Messages */}
            <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className={`flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent ${docked ? 'min-h-0' : 'min-h-[200px]'}`}>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-foreground-soft font-medium">Start a new conversation with {agentDisplayName}.</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Ask me anything about your workspace.</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  // Check for confirmation card in agent messages
                  const renderInstr = msg.role === 'assistant' ? parseRenderInstruction(msg.content) : null;
                  const hasConfirm = renderInstr?.hasRender && renderInstr.type === 'confirm';
                  // Strip the render instruction from visible text
                  const visibleContent = hasConfirm
                    ? msg.content.replace(/<!-- RENDER_CONFIRM:\{.*?\} -->/s, '').trim()
                    : msg.content;

                  return (
                    <div
                      key={msg.id || i}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-2`}
                    >
                      {visibleContent && (
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                            msg.role === 'user'
                              ? 'bg-primary/20 text-amber-100 rounded-br-md'
                              : 'bg-secondary text-foreground rounded-bl-md'
                          }`}
                        >
                          {renderMessageContent(visibleContent)}
                        </div>
                      )}
                      {hasConfirm && (
                        <ConfirmationCard
                          entity={renderInstr.entity}
                          action={renderInstr.action}
                          data={renderInstr.data}
                          onConfirm={() => handleSendMessage('Confirmed. Please create this record.')}
                          onEdit={() => handleSendMessage('I want to make changes before creating.')}
                          onCancel={() => handleSendMessage("Cancel — don't create this record.")}
                        />
                      )}
                    </div>
                  );
                })
              )}

              {/* Agent thinking indicator */}
              {isAgentThinking && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-2xl rounded-bl-md px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick-action chips */}
            {showChips && (
              <div className="px-3 pt-2 flex-shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                  {availableChips.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleSendMessage(chip.message)}
                      disabled={isSending || !conversationObj}
                      className="flex items-center gap-1.5 bg-secondary border border-border rounded-full px-4 py-2 text-sm text-foreground-soft hover:border-primary hover:text-primary transition-colors whitespace-nowrap flex-shrink-0 disabled:opacity-50"
                    >
                      {chip.write ? <Pencil className="h-3 w-3" /> : <Search className="h-3 w-3" />}
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Attachment preview */}
            {attachment && (
              <div className="px-3 pt-2 flex-shrink-0">
                <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2">
                  {attachment.type === 'image' && attachment.previewUrl ? (
                    <img src={attachment.previewUrl} alt="Attachment" className="h-12 w-12 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded bg-surface flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-sm text-foreground-soft truncate flex-1">{attachment.name}</span>
                  <button
                    type="button"
                    onClick={clearAttachment}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="flex items-center gap-2 px-3 py-3 border-t border-border flex-shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
              {/* File upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2.5 rounded-xl bg-secondary hover:bg-surface text-muted-foreground hover:text-primary transition-all min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                title="Attach file"
              >
                {isUploading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <Paperclip className="h-4.5 w-4.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/heic,application/pdf"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Text input */}
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? 'Listening...' : 'Type a message...'}
                disabled={isLoading || !conversationObj}
                className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-card border border-border text-foreground text-sm placeholder-muted-foreground/70 focus:outline-none focus:border-primary disabled:opacity-50"
              />

              {/* Voice button — shows when input empty, hides when typing (saves mobile space) */}
              {voiceSupported && !inputValue.trim() && !attachment && (
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`p-2.5 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 ${
                    isListening
                      ? 'bg-red-500/20 text-red-400 animate-pulse'
                      : 'bg-secondary hover:bg-surface text-muted-foreground hover:text-primary'
                  }`}
                  title={isListening ? 'Stop listening' : 'Voice input'}
                >
                  {isListening ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
                </button>
              )}

              {/* Send button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={(!inputValue.trim() && !attachment) || isSending || isLoading || !conversationObj}
                className="p-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <Send className="h-4.5 w-4.5" />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
