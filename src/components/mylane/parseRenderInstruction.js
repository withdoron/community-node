/**
 * parseRenderInstruction — extracts render instructions from agent messages.
 *
 * Two formats:
 *   <!-- RENDER:{"workspace":"field-service","view":"clients"} -->
 *     → drill into workspace component
 *
 *   <!-- RENDER_DATA:{"entity":"FSClient","workspace":"field-service","data":[...]} -->
 *     → universal renderer with raw data
 *
 * HTML comments — invisible to ReactMarkdown, parseable by us.
 * Pure function, no side effects.
 */

// Map of view aliases to actual tab IDs
const VIEW_TO_TAB = {
  // Field Service
  home: 'home',
  clients: 'people',
  people: 'people',
  estimates: 'estimates',
  projects: 'projects',
  documents: 'documents',
  'daily-log': 'log',
  log: 'log',
  settings: 'settings',
  // Team
  playbook: 'playbook',
  roster: 'roster',
  schedule: 'schedule',
  messages: 'messages',
  // Finance
  activity: 'activity',
  debts: 'debts',
  recurring: 'bills',
  bills: 'bills',
  // Property Pulse
  properties: 'properties',
  owners: 'owners',
  finances: 'finances',
  maintenance: 'maintenance',
  settlements: 'settlements',
  listings: 'listings',
};

export function parseRenderInstruction(messageContent) {
  if (!messageContent) return { hasRender: false };

  // Check for RENDER_DATA first (raw data rendering)
  const dataMatch = messageContent.match(/<!-- RENDER_DATA:(\{.*?\}) -->/s);
  if (dataMatch) {
    try {
      const instruction = JSON.parse(dataMatch[1]);
      return {
        hasRender: true,
        type: 'data',
        entity: instruction.entity,
        workspace: instruction.workspace || null,
        data: instruction.data || [],
        displayHint: instruction.displayHint || null,
      };
    } catch {
      // Fall through to check for RENDER
    }
  }

  // Check for RENDER (workspace drill)
  const match = messageContent.match(/<!-- RENDER:(\{.*?\}) -->/);
  if (!match) return { hasRender: false };
  try {
    const instruction = JSON.parse(match[1]);
    const workspace = instruction.workspace;
    const view = instruction.view || 'home';
    const tab = VIEW_TO_TAB[view] || view;
    return { hasRender: true, type: 'workspace', workspace, view, tab };
  } catch {
    return { hasRender: false };
  }
}
