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
 *
 * NOTE: Each workspace entity needs a `guide_dismissed` boolean field
 * added manually in the Base44 dashboard for persistent dismissal.
 */

export const WORKSPACE_GUIDES = {
  business: {
    welcome: "Welcome to your business dashboard. This is your home on LocalLane.",
    steps: [
      {
        id: 'settings',
        title: 'Set up your listing',
        description:
          'Add your business name, photos, description, and contact info so families can find you.',
        actionLabel: 'Go to Settings',
        targetTab: 'settings',
        icon: 'Settings',
      },
      {
        id: 'events',
        title: 'Create your first event',
        description:
          'Events bring families through the door. Add a class, open house, or community gathering.',
        actionLabel: 'Go to Events',
        targetTab: 'events',
        icon: 'Calendar',
      },
      {
        id: 'joy-coins',
        title: 'Set your Joy Coin hours',
        description:
          'Joy Coins let Community Pass members visit your business. Set when they can redeem.',
        actionLabel: 'Go to Joy Coins',
        targetTab: 'joy-coins',
        icon: 'Coins',
      },
    ],
  },

  field_service: {
    welcome: "Welcome to your space. This is where your business runs.",
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
        id: 'documents',
        title: 'Create a document',
        description:
          'Use Oregon templates to generate lien notices, contracts, and sub agreements. Send for e-signature through the client portal.',
        actionLabel: 'Go to Documents',
        targetTab: 'documents',
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

  team: {
    welcome: "Welcome to your team space. This is where your players grow.",
    steps: [
      {
        id: 'settings',
        title: 'Name your team',
        description:
          'Set your team name, sport, season, and format. This is the identity your players see.',
        actionLabel: 'Go to Settings',
        targetTab: 'settings',
        icon: 'Settings',
      },
      {
        id: 'roster',
        title: 'Add your players',
        description:
          'Build your roster — add players with their jersey names and positions. Share an invite code so they can join.',
        actionLabel: 'Go to Roster',
        targetTab: 'roster',
        icon: 'Users',
      },
      {
        id: 'playbook',
        title: 'Create your first play',
        description:
          'Draw up a play for your team. Players study them here and quiz themselves in Playbook Pro.',
        actionLabel: 'Go to Playbook',
        targetTab: 'playbook',
        icon: 'BookOpen',
      },
      {
        id: 'schedule',
        title: 'Set your schedule',
        description:
          'Add practices, games, and team events. Everyone on the roster sees the same calendar.',
        actionLabel: 'Go to Schedule',
        targetTab: 'schedule',
        icon: 'Calendar',
      },
    ],
  },

  finance: {
    welcome: "Welcome to your finance space. This is where you see clearly.",
    steps: [
      {
        id: 'settings',
        title: 'Set up your contexts',
        description:
          'Contexts separate your money into streams — personal, business, household. Each gets its own view.',
        actionLabel: 'Go to Settings',
        targetTab: 'settings',
        icon: 'Settings',
      },
      {
        id: 'transaction',
        title: 'Log your first transaction',
        description:
          'Record an income or expense. This is the raw data that powers your Monthly Target and cash flow.',
        actionLabel: 'Go to Activity',
        targetTab: 'activity',
        icon: 'ArrowDownUp',
      },
      {
        id: 'bills',
        title: 'Add your recurring bills',
        description:
          'Rent, utilities, subscriptions — the things that repeat. These calculate your monthly essentials automatically.',
        actionLabel: 'Go to Bills',
        targetTab: 'bills',
        icon: 'Repeat',
      },
      {
        id: 'debts',
        title: 'Track your debts',
        description:
          'Add any debts with balances and minimum payments. Your Monthly Target includes these automatically.',
        actionLabel: 'Go to Debts',
        targetTab: 'debts',
        icon: 'Landmark',
      },
    ],
  },

  property_management: {
    welcome: "Welcome to your property space. This is where you manage what you own.",
    steps: [
      {
        id: 'settings',
        title: 'Configure your space',
        description:
          'Set your space name and link a finance space if you want costs to flow through automatically.',
        actionLabel: 'Go to Settings',
        targetTab: 'settings',
        icon: 'Settings',
      },
      {
        id: 'properties',
        title: 'Add your first property group',
        description:
          'A property group is a building or address. Add units inside it — apartments, rooms, or spaces.',
        actionLabel: 'Go to Properties',
        targetTab: 'properties',
        icon: 'Building',
      },
      {
        id: 'expense',
        title: 'Record your first expense',
        description:
          'Track repairs, utilities, and maintenance costs against specific properties or groups.',
        actionLabel: 'Go to Finances',
        targetTab: 'finances',
        icon: 'DollarSign',
      },
      {
        id: 'maintenance',
        title: 'Set up maintenance tracking',
        description:
          'Log maintenance requests, assign them to properties, and track their status from open to resolved.',
        actionLabel: 'Go to Maintenance',
        targetTab: 'maintenance',
        icon: 'Wrench',
      },
    ],
  },

  meal_prep: {
    welcome: "Welcome to your kitchen. This is where your recipes come together.",
    steps: [
      {
        id: 'recipe',
        title: 'Add your first recipe',
        description:
          'Start with a go-to recipe you know by heart. Name it, list the ingredients, and jot down the steps.',
        actionLabel: 'Go to Recipes',
        targetTab: 'recipes',
        icon: 'UtensilsCrossed',
      },
      {
        id: 'browse',
        title: 'Browse your recipe book',
        description:
          'As you add more recipes, search by meal type, filter by difficulty, and mark your favorites.',
        actionLabel: 'Go to Recipes',
        targetTab: 'recipes',
        icon: 'BookOpen',
      },
      {
        id: 'settings',
        title: 'Personalize your space',
        description:
          'Set your household size, dietary preferences, and favorite stores so your kitchen knows how you cook.',
        actionLabel: 'Go to Settings',
        targetTab: 'settings',
        icon: 'Settings',
      },
    ],
  },
};
