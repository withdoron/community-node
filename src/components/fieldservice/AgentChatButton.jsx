/**
 * AgentChatButton — floating action button that opens/closes AgentChat.
 * Renders in the bottom-right corner, above any feedback widget.
 * Configurable agent name so any workspace can reuse with a different agent.
 *
 * Props:
 *   agentName  — Base44 agent name (default: 'FieldServiceAgent')
 *   userId     — current user's ID for conversation persistence
 */
import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import AgentChat from './AgentChat';

export default function AgentChatButton({ agentName = 'FieldServiceAgent', userId }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Chat panel */}
      <AgentChat
        agentName={agentName}
        userId={userId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />

      {/* Floating button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          isOpen
            ? 'bg-secondary hover:bg-surface text-foreground-soft rotate-0'
            : 'bg-primary hover:bg-primary-hover text-primary-foreground hover:scale-105'
        }`}
        title={isOpen ? 'Close chat' : 'Open agent chat'}
        aria-label={isOpen ? 'Close chat' : 'Open agent chat'}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>
    </>
  );
}
