/**
 * MylaneMobileSheet — Full-screen mobile overlay for Mylane chat.
 * Slides up from bottom, covers entire viewport.
 */
import React, { useEffect, useState } from 'react';
import AgentChat from '@/components/fieldservice/AgentChat';

export default function MylaneMobileSheet({
  isOpen,
  onClose,
  currentUser,
  onMessage,
  workspaceProfiles,
  pendingMessage = null,
  onPendingMessageSent = null,
  mylane_tier = 'basic',
}) {
  // Animate in: mount first, then transition
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Mount, then animate in on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setVisible(false);
    // Wait for animation to finish before unmounting
    setTimeout(onClose, 300);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-background flex flex-col transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex-1 flex flex-col min-h-0 [&>div]:h-full [&>div>div]:h-full [&>div>div]:max-h-full [&>div>div]:rounded-none [&>div>div]:border-0">
        <AgentChat
          agentName="MyLane"
          userId={currentUser?.id}
          isOpen={true}
          onClose={handleClose}
          docked={true}
          fillHeight={true}
          onMessage={onMessage}
          workspaceProfiles={workspaceProfiles}
          pendingMessage={pendingMessage}
          onPendingMessageSent={onPendingMessageSent}
          mylane_tier={mylane_tier}
        />
      </div>
    </div>
  );
}
