/**
 * CommandBar — atomic command bar copilot for Mylane.
 * No conversation history. No greetings. User initiates, organism responds
 * through the surface. Results render as cards via onRenderResult callback.
 *
 * Props:
 *   agentName      — Base44 agent name (default: 'MyLane')
 *   userId         — current user ID
 *   onRenderResult — ({ type, text?, entity?, workspace?, data?, displayHint? }) => void
 *   onNavigate     — ({ workspace, view, tab }) => void  (spinner navigation)
 *   mylane_tier    — tier level for future gating
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, Mic, MicOff } from 'lucide-react';
import { parseRenderInstruction } from './parseRenderInstruction';

// SpeechRecognition detection
const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

export default function CommandBar({
  agentName = 'MyLane',
  userId,
  onRenderResult,
  onNavigate,
  mylane_tier = 'basic',
}) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  // ─── Send query to agent ───
  const handleSend = useCallback(async (text) => {
    const query = (text || input).trim();
    if (!query || isSending) return;

    setInput('');
    setIsSending(true);

    try {
      // Create ephemeral conversation, send, get response, discard
      const conversation = await base44.agents.createConversation({
        agent_name: agentName,
        metadata: { created_by_user_id: userId, ephemeral: true },
      });

      // Send user message
      await base44.agents.addMessage(conversation, { role: 'user', content: query });

      // Wait for agent response via polling (subscription is overkill for atomic)
      let attempts = 0;
      let agentResponse = null;
      while (attempts < 30) { // max ~15 seconds
        await new Promise((r) => setTimeout(r, 500));
        attempts++;
        try {
          const conv = await base44.agents.getConversation(conversation.id);
          const msgs = conv?.messages || [];
          const last = msgs[msgs.length - 1];
          if (last?.role === 'assistant') {
            agentResponse = last.content;
            break;
          }
        } catch { /* retry */ }
      }

      if (!agentResponse) {
        onRenderResult?.({ type: 'text', text: 'No response. Try again.' });
        return;
      }

      // Parse render instructions
      const parsed = parseRenderInstruction(agentResponse);

      if (parsed.hasRender) {
        if (parsed.type === 'workspace') {
          // Navigate spinner to workspace
          onNavigate?.({ workspace: parsed.workspace, view: parsed.view, tab: parsed.tab });
        } else if (parsed.type === 'data') {
          onRenderResult?.({
            type: 'data',
            entity: parsed.entity,
            workspace: parsed.workspace,
            data: parsed.data,
            displayHint: parsed.displayHint,
          });
        } else if (parsed.type === 'confirm') {
          onRenderResult?.({
            type: 'confirm',
            entity: parsed.entity,
            workspace: parsed.workspace,
            action: parsed.action,
            data: parsed.data,
          });
        }
        // Also show text portion if any
        const textPart = agentResponse
          .replace(/<!-- RENDER[_A-Z]*:\{.*?\} -->/gs, '')
          .trim();
        if (textPart) {
          onRenderResult?.((prev) => ({ ...prev, text: textPart }));
        }
      } else {
        // Plain text response — render as text card
        onRenderResult?.({ type: 'text', text: agentResponse });
      }
    } catch (err) {
      onRenderResult?.({ type: 'text', text: 'Something went wrong. Try again.' });
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, agentName, userId, onRenderResult, onNavigate]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Voice input ───
  const startListening = useCallback(() => {
    if (!SpeechRecognition || isListening) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      if (result.isFinal) {
        setIsListening(false);
        recognitionRef.current = null;
        handleSend(transcript.trim());
      } else {
        setInput(transcript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, handleSend]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Mushroom icon
  const mushroomIcon = (
    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }} stroke="var(--ll-accent)" fill="none" strokeWidth={1.5}>
      <circle cx="12" cy="10" r="6" /><line x1="12" y1="16" x2="12" y2="22" />
      <line x1="9" y1="19" x2="12" y2="16" /><line x1="15" y1="19" x2="12" y2="16" />
    </svg>
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: 'var(--ll-bg-elevated)',
        borderTop: '1px solid var(--ll-border)',
        minHeight: 52,
      }}
    >
      {/* Organism icon */}
      <div
        style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '1.5px solid var(--ll-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {mushroomIcon}
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask Mylane..."
        disabled={isSending}
        style={{
          flex: 1,
          background: 'var(--ll-bg-surface)',
          border: '1px solid var(--ll-border-hover)',
          borderRadius: 20,
          padding: '8px 14px',
          fontSize: 13,
          color: 'var(--ll-text-primary)',
          outline: 'none',
          minHeight: 36,
        }}
      />

      {/* Mic button — only when input empty and API available */}
      {!input && SpeechRecognition && !isSending && (
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            border: `1.5px solid ${isListening ? 'var(--ll-danger)' : 'var(--ll-border-hover)'}`,
            background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          {isListening
            ? <MicOff style={{ width: 14, height: 14, color: 'var(--ll-danger)' }} strokeWidth={1.5} />
            : <Mic style={{ width: 14, height: 14, color: 'var(--ll-text-dim)' }} strokeWidth={1.5} />
          }
        </button>
      )}

      {/* Send / Loading */}
      {(input || isSending) && (
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={isSending || !input.trim()}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: isSending ? 'var(--ll-border)' : 'var(--ll-accent)',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: isSending ? 'wait' : 'pointer', flexShrink: 0,
          }}
        >
          {isSending
            ? <Loader2 style={{ width: 14, height: 14, color: 'var(--ll-text-dim)' }} className="animate-spin" strokeWidth={2} />
            : <Send style={{ width: 14, height: 14, color: 'var(--ll-bg-base)' }} strokeWidth={2} />
          }
        </button>
      )}
    </div>
  );
}
