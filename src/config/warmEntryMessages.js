/**
 * Warm entry configuration — what Mylane says when a user taps a door button
 * for the first time in an empty workspace.
 *
 * The userMessage is sent automatically to the Mylane agent. She responds with
 * a contextual introduction. The wizardPage is the manual-path fallback.
 *
 * Philosophy: Mylane is the host. She introduces the space before asking you to commit.
 * The wizard is still there — it's the tool, not the experience.
 */

export const WARM_ENTRY = {
  team: {
    workspace: 'team',
    userMessage: "I just tapped 'Start a Team' — can you tell me what the Team space is for and what I can do here?",
    wizardPage: 'TeamOnboarding',
    wizardLabel: 'Set up a team manually',
  },
  business: {
    workspace: 'business',
    userMessage: "I just tapped 'List a Business' — can you tell me about listing a local business on LocalLane?",
    wizardPage: 'BusinessOnboarding',
    wizardLabel: 'List your business manually',
  },
  finance: {
    workspace: 'finance',
    userMessage: "I just tapped 'Track Finances' — can you tell me about the Finance space and what I can track here?",
    wizardPage: 'FinanceOnboarding',
    wizardLabel: 'Set up finance tracking manually',
  },
  fieldservice: {
    workspace: 'fieldservice',
    userMessage: "I just tapped 'Field Service' — can you tell me about the Field Service space and how it helps contractors in the field?",
    wizardPage: 'FieldServiceOnboarding',
    wizardLabel: 'Set up field service manually',
  },
  property_management: {
    workspace: 'property_management',
    userMessage: "I just tapped 'Property Management' — can you tell me about the Property Management space and what I can track here?",
    wizardPage: 'PropertyManagementOnboarding',
    wizardLabel: 'Set up property management manually',
  },
  meal_prep: {
    workspace: 'meal_prep',
    userMessage: "I just tapped 'Meal Prep' — can you tell me about the kitchen space? I'd love to start organizing my recipes.",
    wizardPage: 'MealPrepOnboarding',
    wizardLabel: 'Set up your kitchen manually',
  },
};
