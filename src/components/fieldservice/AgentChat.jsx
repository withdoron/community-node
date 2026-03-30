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
import { X, Send, Loader2, Mic, MicOff, Bot, Plus, Clock, Paperclip, FileText, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ──────────────────────────────────
const HISTORY_STORAGE_KEY = 'agent_conversation_history';
const MAX_HISTORY_ENTRIES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];

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
        className="text-amber-400 hover:text-amber-300 underline break-all"
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

/** Read/write conversation history from localStorage */
function getHistory(agentName) {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : [];
    return all.filter((h) => h.agentName === agentName).slice(0, MAX_HISTORY_ENTRIES);
  } catch { return []; }
}

function saveToHistory(agentName, conversationId, firstMessage) {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : [];
    // Don't duplicate
    if (all.some((h) => h.id === conversationId)) return;
    const entry = {
      id: conversationId,
      agentName,
      started_at: new Date().toISOString(),
      first_message: (firstMessage || '').slice(0, 60) || 'New conversation',
    };
    const updated = [entry, ...all].slice(0, MAX_HISTORY_ENTRIES);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch { /* localStorage may be full */ }
}

function clearHistory(agentName) {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : [];
    const filtered = all.filter((h) => h.agentName !== agentName);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
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

export default function AgentChat({ agentName = 'FieldServiceAgent', userId, isOpen, onClose, docked = false, onMessage }) {
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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const firstMessageRef = useRef(null); // track first user message for history

  // ─── Scroll to bottom on new messages ──────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ─── Focus input when panel opens ──────────────
  useEffect(() => {
    if (isOpen && inputRef.current && !showHistory) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, showHistory]);

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
          // Track first user message for history
          const firstUserMsg = (existing.messages || []).find((m) => m.role === 'user');
          firstMessageRef.current = firstUserMsg?.content || null;
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
          firstMessageRef.current = null;
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
    // Save current conversation to history
    if (conversationId && firstMessageRef.current) {
      saveToHistory(agentName, conversationId, firstMessageRef.current);
    }
    // Unsubscribe from current
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    // Reset state
    setMessages([]);
    setConversationId(null);
    setConversationObj(null);
    setShowHistory(false);
    setAttachment(null);
    firstMessageRef.current = null;

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
  }, [conversationId, agentName, userId]);

  // ─── Resume a conversation from history ────────
  const handleResumeConversation = useCallback(async (historyEntry) => {
    // Unsubscribe from current
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    // Save current to history first
    if (conversationId && firstMessageRef.current) {
      saveToHistory(agentName, conversationId, firstMessageRef.current);
    }

    setShowHistory(false);
    setIsLoading(true);
    setMessages([]);
    setAttachment(null);

    try {
      // List conversations and find the one we want
      const conversations = await base44.agents.listConversations({
        agent_name: agentName,
      });
      const found = Array.isArray(conversations)
        ? conversations.find((c) => c.id === historyEntry.id)
        : null;

      if (found) {
        setConversationId(found.id);
        setConversationObj(found);
        setMessages(found.messages || []);
        const firstUserMsg = (found.messages || []).find((m) => m.role === 'user');
        firstMessageRef.current = firstUserMsg?.content || historyEntry.first_message;
      } else {
        toast.error('Conversation no longer available.');
      }
    } catch (err) {
      console.error('Failed to resume conversation:', err);
      toast.error('Could not load conversation.');
    }
    setIsLoading(false);
  }, [conversationId, agentName]);

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

      // Track first user message for history
      if (!firstMessageRef.current) {
        firstMessageRef.current = messageText;
      }

      // Optimistic: add user message immediately
      const userMsg = { role: 'user', content: messageText, id: `temp_${Date.now()}` };
      setMessages((prev) => [...prev, userMsg]);

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

  // ─── History entries ───────────────────────────
  const historyEntries = useMemo(() => getHistory(agentName), [agentName, showHistory]);

  if (!isOpen) return null;

  return (
    <div className={docked ? 'w-full' : 'fixed inset-x-0 bottom-0 sm:inset-auto sm:right-4 sm:bottom-20 z-40'}>
      <div className={`bg-slate-950 border border-slate-800 shadow-2xl flex flex-col overflow-hidden ${docked ? 'rounded-t-xl w-full max-h-[50vh]' : 'rounded-t-2xl sm:rounded-2xl w-full sm:w-96 max-h-[80vh] sm:max-h-[60vh]'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Bot className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">{agentDisplayName}</h3>
              <p className="text-xs text-slate-500">Your {agentName.replace(/Agent$/, '').replace(/([A-Z])/g, ' $1').trim()} assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* New conversation */}
            <button
              type="button"
              onClick={handleNewConversation}
              title="New conversation"
              className="p-2 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Plus className="h-5 w-5" />
            </button>
            {/* History */}
            <button
              type="button"
              onClick={() => setShowHistory((s) => !s)}
              title="Conversation history"
              className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                showHistory ? 'text-amber-500 bg-slate-800' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-800'
              }`}
            >
              <Clock className="h-5 w-5" />
            </button>
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* History Panel */}
        {showHistory ? (
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-amber-500 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to chat
                </button>
                {historyEntries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      clearHistory(agentName);
                      setShowHistory(false);
                    }}
                    className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                  >
                    Clear history
                  </button>
                )}
              </div>
            </div>
            {historyEntries.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <p className="text-sm text-slate-500">No conversation history yet.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {historyEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => handleResumeConversation(entry)}
                    className="w-full text-left px-4 py-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                  >
                    <p className="text-sm text-slate-300 truncate">{entry.first_message}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{relativeTime(entry.started_at)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className={`flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent ${docked ? 'min-h-0' : 'min-h-[200px]'}`}>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                    <Bot className="h-6 w-6 text-amber-500" />
                  </div>
                  <p className="text-sm text-slate-300 font-medium">Start a new conversation with {agentDisplayName}.</p>
                  <p className="text-xs text-slate-500 mt-1">Ask me anything about your workspace.</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={msg.id || i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-amber-500/20 text-amber-100 rounded-br-md'
                          : 'bg-slate-800 text-slate-200 rounded-bl-md'
                      }`}
                    >
                      {renderMessageContent(msg.content)}
                    </div>
                  </div>
                ))
              )}

              {/* Agent thinking indicator */}
              {isAgentThinking && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Attachment preview */}
            {attachment && (
              <div className="px-3 pt-2 flex-shrink-0">
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                  {attachment.type === 'image' && attachment.previewUrl ? (
                    <img src={attachment.previewUrl} alt="Attachment" className="h-12 w-12 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                  <span className="text-sm text-slate-300 truncate flex-1">{attachment.name}</span>
                  <button
                    type="button"
                    onClick={clearAttachment}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="flex items-center gap-2 px-3 py-3 border-t border-slate-800 flex-shrink-0">
              {/* File upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-500 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 disabled:opacity-50"
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

              {/* Voice button — hidden if not supported */}
              {voiceSupported && (
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`p-2.5 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 ${
                    isListening
                      ? 'bg-red-500/20 text-red-400 animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-500'
                  }`}
                  title={isListening ? 'Stop listening' : 'Voice input'}
                >
                  {isListening ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
                </button>
              )}

              {/* Text input */}
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? 'Listening...' : 'Type a message...'}
                disabled={isLoading || !conversationObj}
                className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />

              {/* Send button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={(!inputValue.trim() && !attachment) || isSending || isLoading || !conversationObj}
                className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
