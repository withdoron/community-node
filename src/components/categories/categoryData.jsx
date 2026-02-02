import { 
  Home, Car, Tractor, Dumbbell, Stethoscope, Briefcase, Coins, 
  GraduationCap, Baby, PawPrint, PartyPopper, Sparkles, Smartphone, Truck,
  Hammer, Wrench, Droplets, Zap, Wind, CircleDot, Leaf, TreeDeciduous, SprayCan, Bug, HardHat,
  Cog, PaintBucket, Circle, Star, Scissors, Bike,
  Store, Apple, Beef, Croissant, UtensilsCrossed, ChefHat,
  Activity, Users, PersonStanding, Swords, Hand, Bone, Brain, Salad, HeartPulse,
  Building2, Eye, Baby as BabyIcon, UserCog,
  Calculator, PiggyBank, Scale, Shield, TrendingUp, Building, LayoutDashboard, Palette, Monitor,
  BookOpen, Music, Languages, Wrench as WrenchIcon,
  School, UserCheck, Tent,
  Syringe, Dog, Bath, Footprints, GraduationCap as GradCap,
  Camera, CalendarDays, Mic2, Gift, MapPin,
  ScissorsIcon, Paintbrush,
  Phone, Laptop, Tv, Lock,
  Package, Warehouse, Printer, Shirt, Key, WashingMachine, Trash2
} from "lucide-react";

export const mainCategories = [
  {
    id: 'home_services',
    label: 'Home Services',
    icon: Home,
    color: 'bg-slate-800 text-amber-500 hover:bg-slate-700',
    subcategories: [
      { id: 'all_home_services', label: 'All home services' },
      { id: 'carpenters_handymen', label: 'Carpenters & Handymen' },
      { id: 'plumbers', label: 'Plumbers' },
      { id: 'electricians', label: 'Electricians' },
      { id: 'hvac', label: 'HVAC' },
      { id: 'roofing', label: 'Roofing' },
      { id: 'landscaping', label: 'Landscaping & Lawn Care' },
      { id: 'tree_services', label: 'Tree Services' },
      { id: 'cleaning', label: 'Cleaning' },
      { id: 'pest_control', label: 'Pest Control' },
      { id: 'general_contractors', label: 'General Contractors' }
    ]
  },
  {
    id: 'auto_transportation',
    label: 'Auto & Transportation',
    icon: Car,
    color: 'bg-slate-800 text-amber-500 hover:bg-slate-700',
    subcategories: [
      { id: 'all_auto', label: 'All auto services' },
      { id: 'mechanics', label: 'Mechanics / Auto Repair' },
      { id: 'body_shops', label: 'Body Shops' },
      { id: 'tire_shops', label: 'Tire Shops' },
      { id: 'auto_detailing', label: 'Auto Detailing' },
      { id: 'towing', label: 'Towing' },
      { id: 'motorcycle_repair', label: 'Motorcycle / Small Engine Repair' }
    ]
  },
  {
    id: 'farms_food',
    label: 'Farms & Food',
    icon: Tractor,
    color: 'bg-slate-800 text-amber-500 hover:bg-slate-700',
    subcategories: [
      { id: 'all_farms_food', label: 'All farms & food' },
      { id: 'farms_ranches', label: 'Farms & Ranches' },
      { id: 'farm_stands', label: 'Farm Stands / CSAs' },
      { id: 'butchers', label: 'Butchers & Meat Processing' },
      { id: 'bakeries', label: 'Bakeries' },
      { id: 'specialty_foods', label: 'Specialty Foods' },
      { id: 'caterers', label: 'Caterers' }
    ]
  },
  {
    id: 'health_fitness',
    label: 'Health, Fitness & Wellness',
    icon: Dumbbell,
    color: 'bg-slate-800 text-amber-500 hover:bg-slate-700',
    subcategories: [
      { id: 'all_health_fitness', label: 'All health & fitness' },
      { id: 'gyms', label: 'Gyms & Fitness Centers' },
      { id: 'personal_trainers', label: 'Personal Trainers' },
      { id: 'yoga_pilates', label: 'Yoga & Pilates' },
      { id: 'martial_arts', label: 'Martial Arts' },
      { id: 'massage_therapy', label: 'Massage Therapy' },
      { id: 'chiropractors', label: 'Chiropractors' },
      { id: 'physical_therapy', label: 'Physical Therapy' },
      { id: 'nutritionists', label: 'Nutritionists' },
      { id: 'mental_health', label: 'Mental Health' }
    ]
  },
  {
    id: 'healthcare',
    label: 'Healthcare (Doctors & Dentists)',
    icon: Stethoscope,
    color: 'bg-slate-800 text-amber-500 hover:bg-slate-700',
    subcategories: [
      { id: 'all_healthcare', label: 'All healthcare' },
      { id: 'family_doctors', label: 'Family Doctors / Clinics' },
      { id: 'dentists', label: 'Dentists & Orthodontists' },
      { id: 'optometrists', label: 'Optometrists / Eye Care' },
      { id: 'pediatricians', label: 'Pediatricians' },
      { id: 'specialists', label: 'Specialists' }
    ]
  },
  {
    id: 'professional_services',
    label: 'Professional Services',
    icon: Briefcase,
    color: 'bg-slate-800 text-amber-500 hover:bg-slate-700',
    subcategories: [
      { id: 'all_professional', label: 'All professional services' },
      { id: 'accountants', label: 'Accountants & Bookkeepers' },
      { id: 'financial_advisors', label: 'Financial Advisors' },
      { id: 'lawyers', label: 'Lawyers & Legal Services' },
      { id: 'insurance_agents', label: 'Insurance Agents' },
      { id: 'business_consultants', label: 'Business Consultants' },
      { id: 'real_estate', label: 'Real Estate Agents & Brokers' },
      { id: 'property_management', label: 'Property Management' },
      { id: 'marketing_design', label: 'Marketing & Design' },
      { id: 'it_support', label: 'IT & Tech Support' }
    ]
  },
  {
    id: 'bullion_coins',
    label: 'Bullion Dealers & Coin Shops',
    icon: Coins,
    color: 'bg-slate-800 text-amber-500 hover:bg-slate-700',
    subcategories: [
      { id: 'all_bullion', label: 'All bullion & coins' },
      { id: 'bullion_dealers', label: 'Bullion Dealers' },
      { id: 'coin_shops', label: 'Coin Shops' }
    ]
  },
  {
    id: 'education_tutoring',
    label: 'Education & Tutoring',
    icon: GraduationCap,
    color: 'bg-slate-800 text-amber-500 hover:bg-slate-700',
    subcategories: [
      { id: 'all_education', label: 'All education' },
      { id: 'academic_tutors', label: 'Academic Tutors' },
      { id: 'test_prep', label: 'Test Prep' },
      { id: 'music_lessons', label: 'Music Lessons' },
      { id: 'language_tutors', label: 'Language Tutors' },
      { id: 'trade_skills', label: 'Trade Skills / Workshops' }
    ]
  },
  {
    id: 'childcare_family',
    label: 'Childcare & Family',
    icon: Baby,
    color: 'bg-slate-800 text-amber-500 hover:bg-slate-700',
    subcategories: [
      { id: 'all_childcare', label: 'All childcare & family' },
      { id: 'daycare', label: 'Daycare & Preschools' },
      { id: 'nannies', label: 'Nannies & Babysitters' },
      { id: 'after_school', label: 'After-School Programs' },
      { id: 'camps', label: 'Camps' }
    ]
  },
  {
    id: 'pets_animals',
    label: 'Pets & Animals',
    icon: PawPrint,
    color: 'bg-slate-800 text-amber-500 hover:bg-slate-700',
    subcategories: [
      { id: 'all_pets', label: 'All pet services' },
      { id: 'veterinarians', label: 'Veterinarians' },
      { id: 'groomers', label: 'Groomers' },
      { id: 'pet_boarding', label: 'Boarding & Daycare' },
      { id: 'dog_walkers', label: 'Dog Walkers & Pet Sitters' },
      { id: 'pet_trainers', label: 'Trainers' }
    ]
  },
  {
    id: 'events_entertainment',
    label: 'Events & Entertainment',
    icon: PartyPopper,
    color: 'bg-slate-800 text-amber-500 hover:bg-slate-700',
    subcategories: [
      { id: 'all_events', label: 'All events' },
      { id: 'photographers', label: 'Photographers & Videographers' },
      { id: 'event_planners', label: 'Event Planners' },
      { id: 'djs_bands', label: 'DJs & Bands' },
      { id: 'party_rentals', label: 'Party Rentals' },
      { id: 'venues', label: 'Venues' }
    ]
  },
  {
    id: 'beauty_personal_care',
    label: 'Beauty & Personal Care',
    icon: Sparkles,
    color: 'bg-slate-800 text-amber-500 hover:bg-slate-700',
    subcategories: [
      { id: 'all_beauty', label: 'All beauty & personal care' },
      { id: 'hair_salons', label: 'Hair Salons & Barbers' },
      { id: 'nail_salons', label: 'Nail Salons' },
      { id: 'spas', label: 'Spas & Estheticians' },
      { id: 'makeup_artists', label: 'Makeup Artists' }
    ]
  },
  {
    id: 'tech_electronics',
    label: 'Tech & Electronics',
    icon: Smartphone,
    color: 'bg-slate-800 text-amber-500 hover:bg-slate-700',
    subcategories: [
      { id: 'all_tech', label: 'All tech services' },
      { id: 'phone_repair', label: 'Phone & Tablet Repair' },
      { id: 'computer_repair', label: 'Computer Repair & IT Help' },
      { id: 'home_theater', label: 'Home Theater & Smart Home' },
      { id: 'security_systems', label: 'Security Systems' }
    ]
  },
  {
    id: 'moving_misc',
    label: 'Moving & Misc. Local Services',
    icon: Truck,
    color: 'bg-slate-800 text-amber-500 hover:bg-slate-700',
    subcategories: [
      { id: 'all_local', label: 'All local services' },
      { id: 'movers', label: 'Movers' },
      { id: 'storage', label: 'Storage' },
      { id: 'print_copy', label: 'Print & Copy' },
      { id: 'tailors', label: 'Tailors & Alterations' },
      { id: 'locksmiths', label: 'Locksmiths' },
      { id: 'laundry', label: 'Laundry & Dry Cleaning' },
      { id: 'junk_removal', label: 'Junk Removal' }
    ]
  }
];

// Default popular categories shown on home page
export const defaultPopularCategoryIds = [
  'home_services',
  'auto_transportation',
  'farms_food',
  'health_fitness',
  'professional_services',
  'bullion_coins',
  'beauty_personal_care',
  'pets_animals'
];

// Helper to get main category by ID
export const getMainCategory = (id) => mainCategories.find(c => c.id === id);

// Helper to get subcategory label
export const getSubcategoryLabel = (mainCategoryId, subcategoryId) => {
  const main = getMainCategory(mainCategoryId);
  if (!main) return subcategoryId;
  const sub = main.subcategories.find(s => s.id === subcategoryId);
  return sub?.label || subcategoryId;
};

// Get all subcategory IDs for a main category (excluding "all" option)
export const getSubcategoryIds = (mainCategoryId) => {
  const main = getMainCategory(mainCategoryId);
  if (!main) return [];
  return main.subcategories.filter(s => !s.id.startsWith('all_')).map(s => s.id);
};

// Legacy category mapping for migration
export const legacyCategoryMapping = {
  'carpenter': { main: 'home_services', sub: 'carpenters_handymen' },
  'mechanic': { main: 'auto_transportation', sub: 'mechanics' },
  'landscaper': { main: 'home_services', sub: 'landscaping' },
  'farm': { main: 'farms_food', sub: 'farms_ranches' },
  'bullion_dealer': { main: 'bullion_coins', sub: 'bullion_dealers' },
  'electrician': { main: 'home_services', sub: 'electricians' },
  'plumber': { main: 'home_services', sub: 'plumbers' },
  'handyman': { main: 'home_services', sub: 'carpenters_handymen' },
  'cleaning': { main: 'home_services', sub: 'cleaning' },
  'other': { main: 'moving_misc', sub: 'all_local' }
};