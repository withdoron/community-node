/**
 * parseRenderInstruction — extracts render instructions from agent messages.
 * Format: <!-- RENDER:{"workspace":"field-service","view":"clients"} -->
 * HTML comment — invisible to ReactMarkdown, parseable by us.
 * Pure function, no side effects.
 */

// Map of view aliases to actual tab IDs
const VIEW_TO_TAB = {
  // Field Service
  'home': 'home',
  'clients': 'people',
  'people': 'people',
  'estimates': 'estimates',
  'projects': 'projects',
  'documents': 'documents',
  'daily-log': 'daily-log',
  // Team
  'playbook': 'playbook',
  'roster': 'roster',
  'schedule': 'schedule',
  'messages': 'messages',
  // Finance
  'activity': 'activity',
  'debts': 'debts',
  'recurring': 'recurring',
  // Property Pulse
  'properties': 'properties',
  'maintenance': 'maintenance',
  'listings': 'listings',
};

export function parseRenderInstruction(messageContent) {
  if (!messageContent) return { hasRender: false };
  const match = messageContent.match(/<!-- RENDER:(\{.*?\}) -->/);
  if (!match) return { hasRender: false };
  try {
    const instruction = JSON.parse(match[1]);
    const workspace = instruction.workspace;
    const view = instruction.view || 'home';
    const tab = VIEW_TO_TAB[view] || view;
    return { hasRender: true, workspace, view, tab };
  } catch {
    return { hasRender: false };
  }
}
