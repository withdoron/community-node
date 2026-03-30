/**
 * MylanePanel — Desktop resizable right-side copilot panel.
 * Uses react-resizable-panels for drag-to-resize with localStorage persistence.
 * Wraps AgentChat in a side panel alongside workspace card content.
 */
import React, { useState, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import AgentChat from '@/components/fieldservice/AgentChat';

const LS_KEY = 'mylane_panel_collapsed';

export default function MylanePanel({
  children,
  currentUser,
  onMessage,
  workspaceProfiles,
  isCollapsed,
  onToggle,
}) {
  // If parent doesn't control collapsed state, manage locally
  const [localCollapsed, setLocalCollapsed] = useState(() => {
    if (isCollapsed !== undefined) return isCollapsed;
    try { return localStorage.getItem(LS_KEY) === 'true'; } catch { return false; }
  });

  const collapsed = isCollapsed !== undefined ? isCollapsed : localCollapsed;

  const handleToggle = useCallback(() => {
    const next = !collapsed;
    if (onToggle) {
      onToggle(next);
    } else {
      setLocalCollapsed(next);
    }
    try { localStorage.setItem(LS_KEY, String(next)); } catch { /* ignore */ }
  }, [collapsed, onToggle]);

  const handleClose = useCallback(() => {
    if (onToggle) onToggle(true);
    else setLocalCollapsed(true);
    try { localStorage.setItem(LS_KEY, 'true'); } catch { /* ignore */ }
  }, [onToggle]);

  if (collapsed) {
    return (
      <div className="relative h-full">
        {/* Card content takes full width when panel collapsed */}
        <div className="h-full overflow-y-auto">
          {children}
        </div>
        {/* Floating toggle to reopen panel */}
        <button
          type="button"
          onClick={handleToggle}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 flex items-center justify-center transition-all hover:scale-105"
          title="Open Mylane"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      direction="horizontal"
      autoSaveId="mylane-panel"
      className="h-full"
    >
      {/* Left: Card grid / drill content */}
      <ResizablePanel defaultSize={70} minSize={50}>
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </ResizablePanel>

      {/* Resize handle */}
      <ResizableHandle
        className="w-px bg-slate-800 hover:bg-amber-500/40 transition-colors data-[resize-handle-active]:bg-amber-500/60"
        withHandle
      />

      {/* Right: Mylane chat panel */}
      <ResizablePanel defaultSize={30} minSize={25} maxSize={50}>
        <div className="h-full flex flex-col bg-slate-950 [&>div]:h-full [&>div>div]:h-full [&>div>div]:max-h-full [&>div>div]:rounded-none">
          <AgentChat
            agentName="MyLane"
            userId={currentUser?.id}
            isOpen={true}
            onClose={handleClose}
            docked={true}
            fillHeight={true}
            onMessage={onMessage}
            workspaceProfiles={workspaceProfiles}
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
