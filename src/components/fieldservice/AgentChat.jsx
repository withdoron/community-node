/**
 * AgentChat — conversational chat panel connected to a Base44 Superagent.
 * Supports text input and push-to-talk voice via the existing VoiceInput pattern.
 * Renders as a slide-up panel on mobile, slide-in drawer on desktop.
 *
 * Props:
 *   agentName  — Base44 agent name (e.g. 'FieldServiceAgent')
 *   userId     — current user's ID (for conversation persistence)
 *   isOpen     — whether the panel is visible
 *   onClose    — callback to close the panel
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Send, Loader2, Mic, MicOff, Bot } from 'lucide-react';
import { toast } from 'sonner';

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

export default function AgentChat({ agentName = 'FieldServiceAgent', userId, isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversationObj, setConversationObj] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // ─── Scroll to bottom on new messages ──────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ─── Focus input when panel opens ──────────────
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

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
  }, [conversationId]);

  // ─── Send Message ──────────────────────────────
  const handleSendMessage = useCallback(
    async (text) => {
      const messageText = (text || inputValue).trim();
      if (!messageText || !conversationObj || isSending) return;

      setInputValue('');
      setIsSending(true);
      setIsAgentThinking(true);

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
    [inputValue, conversationObj, isSending]
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
    // Convert camelCase to Title Case with spaces
    return agentName.replace(/([A-Z])/g, ' $1').trim();
  }, [agentName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:right-4 sm:bottom-20 z-40">
      <div className="bg-slate-950 border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col w-full sm:w-96 max-h-[80vh] sm:max-h-[60vh]">
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
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                <Bot className="h-6 w-6 text-amber-500" />
              </div>
              <p className="text-sm text-slate-300 font-medium">Hey, I&apos;m {agentDisplayName}.</p>
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

        {/* Input bar */}
        <div className="flex items-center gap-2 px-3 py-3 border-t border-slate-800 flex-shrink-0">
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
            disabled={!inputValue.trim() || isSending || isLoading || !conversationObj}
            className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <Send className="h-4.5 w-4.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
