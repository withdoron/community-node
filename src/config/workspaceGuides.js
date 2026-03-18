/**
 * Workspace Guide Content — per-type walkthrough steps.
 *
 * Each workspace type defines a welcome message and an ordered array of steps.
 * The WorkspaceGuide component renders any of them identically.
 *
 * This is Moment 3 of the Activation Protocol (THE-GARDEN.md, DEC-082):
 *   Fork (type picker) → Setup (onboarding wizard) → Guide (this).
 *
 * The guide lives inline on the Home tab — not a modal, not a popup.
 * It walks alongside the user like a companion, not a tutorial.
 */

export const WORKSPACE_GUIDES = {
  field_service: {
    welcome: "Welcome to your workspace. This is where your business runs.",
    steps: [
      {
        id: 'settings',
        title: 'Make it yours',
        description:
          'Set your company name, toggle the features you use, and customize your trade categories.',
        actionLabel: 'Go to Settings',
        targetTab: 'settings',
        icon: 'Settings',
      },
      {
        id: 'client',
        title: 'Add your first client',
        description:
          'Everything flows from clients — estimates, projects, and payments all connect back to a person.',
        actionLabel: 'Go to People',
        targetTab: 'people',
        icon: 'Users',
      },
      {
        id: 'estimate',
        title: 'Create your first estimate',
        description:
          'Build a professional estimate for your client. Send it, they accept it, it becomes a project.',
        actionLabel: 'Go to Estimates',
        targetTab: 'estimates',
        icon: 'FileText',
      },
      {
        id: 'log',
        title: 'Log your first day',
        description:
          'Track materials, labor, and photos for any project. Your daily record of work done.',
        actionLabel: 'Go to Log',
        targetTab: 'log',
        icon: 'ClipboardList',
      },
    ],
  },

  // Future: each follows the same shape — welcome + steps[]
  // The WorkspaceGuide component renders any of them identically.

  team: {
    welcome: "Welcome to your team space. This is where your players grow.",
    steps: [
      // TODO: Define steps when Team guide is built
    ],
  },

  finance: {
    welcome: "Welcome to your finance space. This is where you see clearly.",
    steps: [
      // TODO: Define steps when Finance guide is built
    ],
  },

  property_management: {
    welcome: "Welcome to your property space. This is where you manage what you own.",
    steps: [
      // TODO: Define steps when PM guide is built
    ],
  },
};
