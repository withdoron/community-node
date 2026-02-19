export const ONBOARDING_CONFIG = {
  steps: [
    { id: 'archetype', label: 'Type', active: true },
    { id: 'details', label: 'Details', active: true },
    { id: 'goals', label: 'Goals', active: false },
    { id: 'plan', label: 'Plan', active: false },
    { id: 'review', label: 'Review', active: true },
  ],

  archetypes: [
    {
      value: 'location_venue',
      label: 'Location / Venue',
      description: 'I have a physical space for customers to visit.',
      icon: 'Store',
      active: true,
    },
    {
      value: 'event_organizer',
      label: 'Event Organizer',
      description: 'I host pop-ups, festivals, markets, or meetups.',
      icon: 'Ticket',
      active: true,
    },
    {
      value: 'community_nonprofit',
      label: 'Community / Non-Profit',
      description: 'I lead a group, cause, church, or congregation.',
      icon: 'Heart',
      active: true,
    },
    {
      value: 'micro_business',
      label: 'Micro Business',
      description: 'I run a small neighborhood business — selling goods, offering services, or creating products.',
      icon: 'Sprout',
      active: true,
    },
    {
      value: 'service_provider',
      label: 'Service Provider',
      description: 'I offer mobile services or professional skills.',
      icon: 'Briefcase',
      active: false,
    },
    {
      value: 'product_seller',
      label: 'Product Seller',
      description: 'I sell physical or digital products.',
      icon: 'Store',
      active: false,
    },
  ],

  defaults: {
    goals: ['host_events', 'list_in_directory'],
    tier: 'basic',
  },

  goals: [
    { value: 'host_events', label: 'Host Events', description: 'Create and manage community events', active: true },
    { value: 'list_in_directory', label: 'List in Directory', description: 'Appear in the business directory', active: true },
    { value: 'accept_joy_coins', label: 'Accept Joy Coins', description: 'Accept Joy Coins from Community Pass members', active: false, minTier: 'standard' },
    { value: 'manage_bookings', label: 'Manage Bookings', description: 'Accept appointments and reservations', active: false, minTier: 'standard' },
    { value: 'sell_products', label: 'Sell Products', description: 'List products for sale', active: false, minTier: 'standard' },
    { value: 'post_announcements', label: 'Post Announcements', description: 'Send updates to followers', active: false },
  ],

  goalsByArchetype: {
    location_venue: ['host_events', 'list_in_directory', 'accept_joy_coins', 'manage_bookings', 'post_announcements'],
    event_organizer: ['host_events', 'accept_joy_coins', 'post_announcements'],
    community_nonprofit: ['host_events', 'list_in_directory', 'post_announcements'],
    micro_business: ['list_in_directory', 'host_events'],
    service_provider: ['list_in_directory', 'manage_bookings'],
    product_seller: ['list_in_directory', 'sell_products'],
  },

  tiers: [
    { value: 'basic', label: 'Basic', price: 'Free', active: true },
    { value: 'standard', label: 'Standard', price: '$79/mo', active: false },
    { value: 'partner', label: 'Partner', price: 'By invitation', active: false },
  ],
};
