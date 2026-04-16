/**
 * CommandBar — atomic command bar copilot for Mylane.
 * Two render modes: 'bar' (bottom-docked on mobile) and 'panel' (right-docked on desktop).
 * No conversation history. No greetings. User initiates, organism responds.
 *
 * Props:
 *   mode           — 'bar' | 'panel' (driven by container query / parent)
 *   agentName      — Base44 agent name (default: 'MyLane')
 *   userId         — current user ID
 *   onRenderResult — ({ type, text?, entity?, workspace?, data?, displayHint? }) => void
 *   onNavigate     — ({ workspace, view, tab }) => void
 *   onClose        — () => void (panel mode: close/minimize the panel)
 *   mylane_tier    — tier level for future gating
 *   lastResponse   — brief text from last agent response (shown in panel mode)
 */
import { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, Mic, MicOff, PanelRightClose } from 'lucide-react';
import { parseRenderInstruction } from './parseRenderInstruction';

const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

export default function CommandBar({
  mode = 'bar',
  agentName = 'MyLane',
  userId,
  onRenderResult,
  onNavigate,
  onClose,
  mylane_tier = 'basic',
  lastResponse = null,
}) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [pendingQuery, setPendingQuery] = useState(null); // query text shown while waiting
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  // ─── Send query to agent ───
  const handleSend = useCallback(async (text) => {
    const query = (text || input).trim();
    if (!query || isSending) return;
    setInput('');
    setIsSending(true);
    setPendingQuery(query);
    onRenderResult?.({ type: 'loading', text: query });

    try {
      const conversation = await base44.agents.createConversation({
        agent_name: agentName,
        metadata: { created_by_user_id: userId, ephemeral: true },
      });
      await base44.agents.addMessage(conversation, { role: 'user', content: query });

      let attempts = 0;
      let agentResponse = null;
      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 500));
        attempts++;
        try {
          const conv = await base44.agents.getConversation(conversation.id);
          const msgs = conv?.messages || [];
          const last = msgs[msgs.length - 1];
          if (last?.role === 'assistant') { agentResponse = last.content; break; }
        } catch {}
      }

      if (!agentResponse) {
        onRenderResult?.({ type: 'text', text: 'No response. Try again.' });
        return;
      }

      const parsed = parseRenderInstruction(agentResponse);
      const textPart = agentResponse.replace(/<!-- RENDER[_A-Z]*:\{.*?\} -->/gs, '').trim();

      if (parsed.hasRender) {
        if (parsed.type === 'workspace') {
          // Clear loading state immediately — the workspace view IS the response
          onRenderResult?.(textPart ? { type: 'text', text: textPart } : null);
          onNavigate?.({ workspace: parsed.workspace, view: parsed.view, tab: parsed.tab });
        } else if (parsed.type === 'data') {
          onRenderResult?.({ type: 'data', text: textPart || null, entity: parsed.entity, workspace: parsed.workspace, data: parsed.data, displayHint: parsed.displayHint });
        } else if (parsed.type === 'confirm') {
          onRenderResult?.({ type: 'confirm', text: textPart || null, entity: parsed.entity, workspace: parsed.workspace, action: parsed.action, data: parsed.data });
        }
      } else {
        onRenderResult?.({ type: 'text', text: agentResponse });
      }
    } catch {
      onRenderResult?.({ type: 'text', text: 'Something went wrong. Try again.' });
    } finally {
      setIsSending(false);
      setPendingQuery(null);
    }
  }, [input, isSending, agentName, userId, onRenderResult, onNavigate]);

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  // ─── Voice input ───
  const startListening = useCallback(() => {
    if (!SpeechRecognition || isListening) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) { setIsListening(false); recognitionRef.current = null; handleSend(result[0].transcript.trim()); }
      else setInput(result[0].transcript);
    };
    recognition.onerror = () => { setIsListening(false); recognitionRef.current = null; };
    recognition.onend = () => { setIsListening(false); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, handleSend]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const mushroomIcon = (
    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }} stroke="var(--ll-accent)" fill="none" strokeWidth={1.5}>
      <circle cx="12" cy="10" r="6" /><line x1="12" y1="16" x2="12" y2="22" />
      <line x1="9" y1="19" x2="12" y2="16" /><line x1="15" y1="19" x2="12" y2="16" />
    </svg>
  );

  // ─── Input row (shared between bar and panel modes) ───
  const inputRow = (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: mode === 'panel' ? '10px 14px' : '8px 12px' }}
      onClick={() => inputRef.current?.focus()}
    >
      <div
        style={{
          flex: 1, display: 'flex', alignItems: 'center',
          background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
          borderRadius: 20, minHeight: 44, cursor: 'text',
        }}
        onClick={() => inputRef.current?.focus()}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Mylane..."
          disabled={isSending}
          className="placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          style={{
            flex: 1, background: 'transparent', border: 'none',
            borderRadius: 20, padding: '8px 14px', fontSize: 16,
            color: 'hsl(var(--foreground))', outline: 'none', minHeight: 44,
          }}
        />
      </div>
      {!input && SpeechRecognition && !isSending && (
        <button type="button" onClick={isListening ? stopListening : startListening}
          style={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px solid ${isListening ? 'var(--ll-danger)' : 'var(--ll-border-hover)'}`, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          {isListening ? <MicOff style={{ width: 14, height: 14, color: 'var(--ll-danger)' }} strokeWidth={1.5} /> : <Mic style={{ width: 14, height: 14, color: 'var(--ll-text-dim)' }} strokeWidth={1.5} />}
        </button>
      )}
      {(input || isSending) && (
        <button type="button" onClick={() => handleSend()} disabled={isSending || !input.trim()}
          style={{ width: 36, height: 36, borderRadius: '50%', background: isSending ? 'var(--ll-border)' : 'var(--ll-accent)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isSending ? 'wait' : 'pointer', flexShrink: 0 }}
        >
          {isSending ? <Loader2 style={{ width: 14, height: 14, color: 'var(--ll-text-dim)' }} className="animate-spin" strokeWidth={2} /> : <Send style={{ width: 14, height: 14, color: 'var(--ll-bg-base)' }} strokeWidth={2} />}
        </button>
      )}
    </div>
  );

  // ─── BAR MODE (mobile/tablet) ───
  if (mode === 'bar') {
    return (
      <div style={{ background: 'var(--ll-bg-elevated)', borderTop: '1px solid var(--ll-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--ll-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>
            {mushroomIcon}
          </div>
          <div style={{ flex: 1 }}>{inputRow}</div>
        </div>
      </div>
    );
  }

  // ─── PANEL MODE (desktop) ───
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      {/* Panel header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ll-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid var(--ll-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {mushroomIcon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ll-text-primary)' }}>Mylane</div>
          <div style={{ fontSize: 10, color: 'var(--ll-text-ghost)' }}>Your lane</div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            title="Close panel"
          >
            <PanelRightClose style={{ width: 14, height: 14, color: 'var(--ll-text-dim)' }} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Panel body — last response */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '12px 0' }}>
        {lastResponse ? (
          <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--ll-text-secondary)', lineHeight: 1.5 }}>
            {lastResponse}
          </div>
        ) : (
          <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--ll-text-ghost)', textAlign: 'center' }}>
            Ask anything about your spaces
          </div>
        )}
      </div>

      {/* Panel input — bottom */}
      <div style={{ borderTop: '1px solid var(--ll-border)' }}>
        {inputRow}
      </div>
    </div>
  );
}
