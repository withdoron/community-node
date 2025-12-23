export const ARCHETYPE_CATEGORIES = {
  venue: [
    {
      label: "Food & Drink",
      subCategories: [
        { name: "American", keywords: ["burger", "fries", "wings", "diner", "bbq", "steak"] },
        { name: "Italian", keywords: ["pizza", "pasta", "spaghetti", "lasagna", "ravioli"] },
        { name: "Mexican", keywords: ["taco", "burrito", "quesadilla", "enchilada", "salsa"] },
        { name: "Asian/Sushi", keywords: ["chinese", "japanese", "thai", "ramen", "noodle", "pho", "sushi", "teriyaki"] },
        { name: "Cafe/Coffee", keywords: ["tea", "pastry", "breakfast", "espresso", "latte", "cappuccino"] },
        { name: "Bakery", keywords: ["bread", "pastry", "cake", "cookie", "donut", "muffin"] },
        { name: "Bar/Pub", keywords: ["drinks", "beer", "cocktails", "spirits", "wine", "taproom"] },
        { name: "Brewery/Winery", keywords: ["craft beer", "ale", "wine", "tasting", "vineyard"] },
        { name: "Fast Food", keywords: ["quick", "takeout", "drive-thru", "sandwich"] },
        { name: "Dessert/Ice Cream", keywords: ["sweets", "gelato", "frozen yogurt", "sorbet", "treats"] }
      ]
    },
    {
      label: "Retail",
      subCategories: [
        { name: "Clothing & Fashion", keywords: ["apparel", "boutique", "shoes", "fashion", "style", "dress"] },
        { name: "Electronics", keywords: ["tech", "computers", "phones", "gadgets", "devices"] },
        { name: "Home & Garden", keywords: ["furniture", "decor", "plants", "nursery", "patio"] },
        { name: "Florist", keywords: ["flowers", "bouquet", "arrangements", "roses"] },
        { name: "Jewelry", keywords: ["rings", "necklace", "bracelet", "gold", "silver", "diamonds"] },
        { name: "Sporting Goods", keywords: ["sports", "equipment", "fitness", "athletic", "gear"] },
        { name: "Thrift/Vintage", keywords: ["secondhand", "used", "consignment", "antique", "retro"] },
        { name: "Grocery/Market", keywords: ["food", "produce", "supermarket", "fresh", "organic"] },
        { name: "Pharmacy", keywords: ["medicine", "prescriptions", "drugstore", "health"] },
        { name: "Convenience Store", keywords: ["snacks", "drinks", "quick stop", "mini mart"] }
      ]
    },
    {
      label: "Health & Beauty",
      subCategories: [
        { name: "Gym/Fitness Center", keywords: ["yoga", "pilates", "crossfit", "trainer", "workout", "weights", "cardio"] },
        { name: "Hair Salon", keywords: ["haircut", "stylist", "color", "highlights", "blow dry"] },
        { name: "Nail Salon", keywords: ["manicure", "pedicure", "nails", "polish", "gel"] },
        { name: "Spa", keywords: ["massage", "facial", "relaxation", "wellness", "treatment"] },
        { name: "Barbershop", keywords: ["haircut", "shave", "beard", "fade", "trim"] },
        { name: "Yoga/Pilates", keywords: ["meditation", "stretching", "flexibility", "wellness", "mindfulness"] },
        { name: "Tattoo/Piercing", keywords: ["ink", "body art", "tattoos", "piercings", "custom"] }
      ]
    },
    {
      label: "Automotive",
      subCategories: [
        { name: "Auto Repair", keywords: ["mechanic", "fix", "maintenance", "oil change", "brake"] },
        { name: "Dealership", keywords: ["cars", "vehicles", "new", "used", "sales"] },
        { name: "Car Wash", keywords: ["detail", "clean", "wash", "wax"] },
        { name: "Gas Station", keywords: ["fuel", "gasoline", "petrol", "convenience"] },
        { name: "Auto Parts", keywords: ["parts", "accessories", "supplies", "components"] }
      ]
    },
    {
      label: "Entertainment",
      subCategories: [
        { name: "Art Gallery", keywords: ["paintings", "exhibits", "artists", "sculptures", "fine art"] },
        { name: "Museum", keywords: ["exhibits", "history", "culture", "artifacts", "collections"] },
        { name: "Movie Theater", keywords: ["cinema", "films", "movies", "screening", "popcorn"] },
        { name: "Bowling/Arcade", keywords: ["games", "fun", "entertainment", "family", "lanes"] },
        { name: "Nightclub", keywords: ["dancing", "DJ", "party", "drinks", "music"] },
        { name: "Music Venue", keywords: ["concerts", "live music", "bands", "shows", "performances"] }
      ]
    },
    {
      label: "Professional",
      subCategories: [
        { name: "Coworking Space", keywords: ["office", "workspace", "desk", "shared", "business"] },
        { name: "Office Building", keywords: ["commercial", "business", "corporate", "workspace"] },
        { name: "Event Hall", keywords: ["venue", "reception", "meetings", "conferences", "banquet"] },
        { name: "Hotel/Lodging", keywords: ["accommodation", "stay", "rooms", "inn", "motel"] }
      ]
    }
  ],
  
  location: [
    {
      label: "Food & Drink",
      subCategories: [
        { name: "American", keywords: ["burger", "fries", "wings", "diner", "bbq", "steak"] },
        { name: "Italian", keywords: ["pizza", "pasta", "spaghetti", "lasagna", "ravioli"] },
        { name: "Mexican", keywords: ["taco", "burrito", "quesadilla", "enchilada", "salsa"] },
        { name: "Asian/Sushi", keywords: ["chinese", "japanese", "thai", "ramen", "noodle", "pho", "sushi", "teriyaki"] },
        { name: "Cafe/Coffee", keywords: ["tea", "pastry", "breakfast", "espresso", "latte", "cappuccino"] },
        { name: "Bakery", keywords: ["bread", "pastry", "cake", "cookie", "donut", "muffin"] },
        { name: "Bar/Pub", keywords: ["drinks", "beer", "cocktails", "spirits", "wine", "taproom"] },
        { name: "Brewery/Winery", keywords: ["craft beer", "ale", "wine", "tasting", "vineyard"] },
        { name: "Fast Food", keywords: ["quick", "takeout", "drive-thru", "sandwich"] },
        { name: "Dessert/Ice Cream", keywords: ["sweets", "gelato", "frozen yogurt", "sorbet", "treats"] }
      ]
    },
    {
      label: "Retail",
      subCategories: [
        { name: "Clothing & Fashion", keywords: ["apparel", "boutique", "shoes", "fashion", "style", "dress"] },
        { name: "Electronics", keywords: ["tech", "computers", "phones", "gadgets", "devices"] },
        { name: "Home & Garden", keywords: ["furniture", "decor", "plants", "nursery", "patio"] },
        { name: "Florist", keywords: ["flowers", "bouquet", "arrangements", "roses"] },
        { name: "Jewelry", keywords: ["rings", "necklace", "bracelet", "gold", "silver", "diamonds"] },
        { name: "Sporting Goods", keywords: ["sports", "equipment", "fitness", "athletic", "gear"] },
        { name: "Thrift/Vintage", keywords: ["secondhand", "used", "consignment", "antique", "retro"] },
        { name: "Grocery/Market", keywords: ["food", "produce", "supermarket", "fresh", "organic"] },
        { name: "Pharmacy", keywords: ["medicine", "prescriptions", "drugstore", "health"] },
        { name: "Convenience Store", keywords: ["snacks", "drinks", "quick stop", "mini mart"] }
      ]
    },
    {
      label: "Health & Beauty",
      subCategories: [
        { name: "Gym/Fitness Center", keywords: ["yoga", "pilates", "crossfit", "trainer", "workout", "weights", "cardio"] },
        { name: "Hair Salon", keywords: ["haircut", "stylist", "color", "highlights", "blow dry"] },
        { name: "Nail Salon", keywords: ["manicure", "pedicure", "nails", "polish", "gel"] },
        { name: "Spa", keywords: ["massage", "facial", "relaxation", "wellness", "treatment"] },
        { name: "Barbershop", keywords: ["haircut", "shave", "beard", "fade", "trim"] },
        { name: "Yoga/Pilates", keywords: ["meditation", "stretching", "flexibility", "wellness", "mindfulness"] },
        { name: "Tattoo/Piercing", keywords: ["ink", "body art", "tattoos", "piercings", "custom"] }
      ]
    },
    {
      label: "Automotive",
      subCategories: [
        { name: "Auto Repair", keywords: ["mechanic", "fix", "maintenance", "oil change", "brake"] },
        { name: "Dealership", keywords: ["cars", "vehicles", "new", "used", "sales"] },
        { name: "Car Wash", keywords: ["detail", "clean", "wash", "wax"] },
        { name: "Gas Station", keywords: ["fuel", "gasoline", "petrol", "convenience"] },
        { name: "Auto Parts", keywords: ["parts", "accessories", "supplies", "components"] }
      ]
    },
    {
      label: "Entertainment",
      subCategories: [
        { name: "Art Gallery", keywords: ["paintings", "exhibits", "artists", "sculptures", "fine art"] },
        { name: "Museum", keywords: ["exhibits", "history", "culture", "artifacts", "collections"] },
        { name: "Movie Theater", keywords: ["cinema", "films", "movies", "screening", "popcorn"] },
        { name: "Bowling/Arcade", keywords: ["games", "fun", "entertainment", "family", "lanes"] },
        { name: "Nightclub", keywords: ["dancing", "DJ", "party", "drinks", "music"] },
        { name: "Music Venue", keywords: ["concerts", "live music", "bands", "shows", "performances"] }
      ]
    },
    {
      label: "Professional",
      subCategories: [
        { name: "Coworking Space", keywords: ["office", "workspace", "desk", "shared", "business"] },
        { name: "Office Building", keywords: ["commercial", "business", "corporate", "workspace"] },
        { name: "Event Hall", keywords: ["venue", "reception", "meetings", "conferences", "banquet"] },
        { name: "Hotel/Lodging", keywords: ["accommodation", "stay", "rooms", "inn", "motel"] }
      ]
    },
    {
      label: "Education & Care",
      subCategories: [
        { name: "Daycare Center", keywords: ["preschool", "childcare", "nursery", "kids"] },
        { name: "Private School", keywords: ["education", "academy", "learning"] },
        { name: "Tutoring Center", keywords: ["math", "reading", "sat", "prep"] },
        { name: "Music/Art School", keywords: ["piano", "lessons", "painting", "dance"] },
        { name: "Vocational School", keywords: ["trade", "technical", "training"] }
      ]
    },
    {
      label: "Local Services",
      subCategories: [
        { name: "Dry Cleaner", keywords: ["laundry", "wash", "clothes"] },
        { name: "Tailor/Alterations", keywords: ["sewing", "hem", "repair"] },
        { name: "Post Office/Shipping", keywords: ["mail", "fedex", "ups", "pack"] },
        { name: "Pet Grooming/Boarding", keywords: ["dog", "cat", "kennel", "wash"] },
        { name: "Veterinarian", keywords: ["animal", "doctor", "pet", "medical"] }
      ]
    }
    ],

    service: [
    {
      label: "Home Services",
      subCategories: [
        { name: "General Contractor", keywords: ["construction", "remodeling", "renovation", "building"] },
        { name: "Handyman", keywords: ["repairs", "fix", "maintenance", "odd jobs"] },
        { name: "Cleaning/Maid", keywords: ["housekeeping", "janitorial", "sanitize", "tidy"] },
        { name: "Landscaping/Lawn", keywords: ["yard", "garden", "mowing", "trimming", "mulch"] },
        { name: "Plumbing", keywords: ["pipes", "drains", "leaks", "faucets", "plumber"] },
        { name: "Electrical", keywords: ["wiring", "electrician", "outlets", "lighting", "circuits"] },
        { name: "HVAC", keywords: ["heating", "cooling", "air conditioning", "furnace", "ac"] },
        { name: "Roofing", keywords: ["shingles", "roof repair", "gutters", "leak"] },
        { name: "Pest Control", keywords: ["exterminator", "bugs", "insects", "rodents", "termites"] },
        { name: "Moving & Storage", keywords: ["movers", "relocation", "packing", "transport"] },
        { name: "Pool Service", keywords: ["pool cleaning", "maintenance", "chemicals", "filter"] }
      ]
    },
    {
      label: "Professional",
      subCategories: [
        { name: "Real Estate Agent", keywords: ["realtor", "property", "homes", "houses", "buying", "selling"] },
        { name: "Legal/Attorney", keywords: ["lawyer", "law", "legal advice", "court", "counsel"] },
        { name: "Accounting/Tax", keywords: ["accountant", "bookkeeping", "taxes", "cpa", "finance"] },
        { name: "Insurance", keywords: ["coverage", "policy", "agent", "life", "auto", "health"] },
        { name: "Financial Advisor", keywords: ["investment", "planning", "wealth", "retirement", "finance"] },
        { name: "Consulting", keywords: ["business", "strategy", "advisor", "expert", "guidance"] },
        { name: "Marketing/Web Design", keywords: ["digital", "seo", "website", "branding", "social media"] },
        { name: "Notary", keywords: ["documents", "signatures", "certification", "legal"] }
      ]
    },
    {
      label: "Health & Wellness",
      subCategories: [
        { name: "Personal Trainer", keywords: ["fitness", "workout", "exercise", "gym", "coaching"] },
        { name: "Massage Therapist", keywords: ["massage", "bodywork", "therapeutic", "relaxation"] },
        { name: "Nutritionist", keywords: ["diet", "nutrition", "meal planning", "health", "wellness"] },
        { name: "Mental Health/Therapy", keywords: ["counseling", "therapist", "psychologist", "therapy"] },
        { name: "Chiropractor", keywords: ["adjustment", "spine", "back pain", "alignment"] },
        { name: "Senior Care", keywords: ["elderly", "caregiver", "assisted living", "homecare"] }
      ]
    },
    {
      label: "Family & Education",
      subCategories: [
        { name: "Tutoring", keywords: ["tutor", "education", "learning", "homework", "teaching"] },
        { name: "Childcare/Nanny", keywords: ["babysitter", "daycare", "kids", "children", "caregiver"] },
        { name: "Music Lessons", keywords: ["piano", "guitar", "voice", "instrument", "teacher"] },
        { name: "Driving School", keywords: ["driving lessons", "instructor", "license", "learner"] }
      ]
    },
    {
      label: "Pets",
      subCategories: [
        { name: "Dog Walking", keywords: ["pet care", "dogs", "exercise", "walker"] },
        { name: "Pet Sitting", keywords: ["pet care", "boarding", "cats", "dogs", "animals"] },
        { name: "Mobile Grooming", keywords: ["pet grooming", "bathing", "trimming", "nails"] },
        { name: "Training", keywords: ["dog training", "obedience", "behavior", "puppy"] }
      ]
    },
    {
      label: "Events",
      subCategories: [
        { name: "Photographer", keywords: ["photography", "photos", "wedding", "portraits", "camera"] },
        { name: "DJ/Musician", keywords: ["music", "entertainment", "party", "wedding", "live"] },
        { name: "Caterer", keywords: ["catering", "food", "events", "menu", "party"] },
        { name: "Planner", keywords: ["event planning", "coordinator", "wedding", "party"] },
        { name: "Florist (Events)", keywords: ["flowers", "arrangements", "wedding", "decorations"] },
        { name: "Makeup Artist (Events)", keywords: ["makeup", "beauty", "wedding", "hair", "styling"] }
      ]
    },
    {
      label: "Automotive",
      subCategories: [
        { name: "Mobile Mechanic", keywords: ["car repair", "on-site", "service", "maintenance"] },
        { name: "Detailing", keywords: ["car cleaning", "polish", "wax", "interior"] },
        { name: "Towing", keywords: ["tow truck", "roadside", "emergency", "transport"] }
      ]
    }
  ],
  
  talent: [
    {
      label: "Home Services",
      subCategories: [
        { name: "General Contractor", keywords: ["construction", "remodeling", "renovation", "building"] },
        { name: "Handyman", keywords: ["repairs", "fix", "maintenance", "odd jobs"] },
        { name: "Cleaning/Maid", keywords: ["housekeeping", "janitorial", "sanitize", "tidy"] },
        { name: "Landscaping/Lawn", keywords: ["yard", "garden", "mowing", "trimming", "mulch"] },
        { name: "Plumbing", keywords: ["pipes", "drains", "leaks", "faucets", "plumber"] },
        { name: "Electrical", keywords: ["wiring", "electrician", "outlets", "lighting", "circuits"] },
        { name: "HVAC", keywords: ["heating", "cooling", "air conditioning", "furnace", "ac"] },
        { name: "Roofing", keywords: ["shingles", "roof repair", "gutters", "leak"] },
        { name: "Pest Control", keywords: ["exterminator", "bugs", "insects", "rodents", "termites"] },
        { name: "Moving & Storage", keywords: ["movers", "relocation", "packing", "transport"] },
        { name: "Pool Service", keywords: ["pool cleaning", "maintenance", "chemicals", "filter"] }
      ]
    },
    {
      label: "Professional",
      subCategories: [
        { name: "Real Estate Agent", keywords: ["realtor", "property", "homes", "houses", "buying", "selling"] },
        { name: "Legal/Attorney", keywords: ["lawyer", "law", "legal advice", "court", "counsel"] },
        { name: "Accounting/Tax", keywords: ["accountant", "bookkeeping", "taxes", "cpa", "finance"] },
        { name: "Insurance", keywords: ["coverage", "policy", "agent", "life", "auto", "health"] },
        { name: "Financial Advisor", keywords: ["investment", "planning", "wealth", "retirement", "finance"] },
        { name: "Consulting", keywords: ["business", "strategy", "advisor", "expert", "guidance"] },
        { name: "Marketing/Web Design", keywords: ["digital", "seo", "website", "branding", "social media"] },
        { name: "Notary", keywords: ["documents", "signatures", "certification", "legal"] }
      ]
    },
    {
      label: "Health & Wellness",
      subCategories: [
        { name: "Personal Trainer", keywords: ["fitness", "workout", "exercise", "gym", "coaching"] },
        { name: "Massage Therapist", keywords: ["massage", "bodywork", "therapeutic", "relaxation"] },
        { name: "Nutritionist", keywords: ["diet", "nutrition", "meal planning", "health", "wellness"] },
        { name: "Mental Health/Therapy", keywords: ["counseling", "therapist", "psychologist", "therapy"] },
        { name: "Chiropractor", keywords: ["adjustment", "spine", "back pain", "alignment"] },
        { name: "Senior Care", keywords: ["elderly", "caregiver", "assisted living", "homecare"] }
      ]
    },
    {
      label: "Family & Education",
      subCategories: [
        { name: "Tutoring", keywords: ["tutor", "education", "learning", "homework", "teaching"] },
        { name: "Childcare/Nanny", keywords: ["babysitter", "daycare", "kids", "children", "caregiver"] },
        { name: "Music Lessons", keywords: ["piano", "guitar", "voice", "instrument", "teacher"] },
        { name: "Driving School", keywords: ["driving lessons", "instructor", "license", "learner"] }
      ]
    },
    {
      label: "Pets",
      subCategories: [
        { name: "Dog Walking", keywords: ["pet care", "dogs", "exercise", "walker"] },
        { name: "Pet Sitting", keywords: ["pet care", "boarding", "cats", "dogs", "animals"] },
        { name: "Mobile Grooming", keywords: ["pet grooming", "bathing", "trimming", "nails"] },
        { name: "Training", keywords: ["dog training", "obedience", "behavior", "puppy"] }
      ]
    },
    {
      label: "Events",
      subCategories: [
        { name: "Photographer", keywords: ["photography", "photos", "wedding", "portraits", "camera"] },
        { name: "DJ/Musician", keywords: ["music", "entertainment", "party", "wedding", "live"] },
        { name: "Caterer", keywords: ["catering", "food", "events", "menu", "party"] },
        { name: "Planner", keywords: ["event planning", "coordinator", "wedding", "party"] },
        { name: "Florist (Events)", keywords: ["flowers", "arrangements", "wedding", "decorations"] },
        { name: "Makeup Artist (Events)", keywords: ["makeup", "beauty", "wedding", "hair", "styling"] }
      ]
    },
    {
      label: "Automotive",
      subCategories: [
        { name: "Mobile Mechanic", keywords: ["car repair", "on-site", "service", "maintenance"] },
        { name: "Detailing", keywords: ["car cleaning", "polish", "wax", "interior"] },
        { name: "Towing", keywords: ["tow truck", "roadside", "emergency", "transport"] }
      ]
    }
  ],
  
  community: [
    {
      label: "Interest Groups",
      subCategories: [
        { name: "Book Club", keywords: ["reading", "books", "literature", "discussion"] },
        { name: "Gaming/Hobby", keywords: ["games", "board games", "tabletop", "rpg", "hobby"] },
        { name: "Gardening", keywords: ["plants", "garden", "vegetables", "flowers", "growing"] },
        { name: "Hiking/Outdoors", keywords: ["trails", "nature", "outdoor", "adventure", "camping"] },
        { name: "Sports League", keywords: ["team sports", "recreational", "league", "athletics"] },
        { name: "Arts & Crafts", keywords: ["crafting", "art", "diy", "creative", "handmade"] }
      ]
    },
    {
      label: "Civic & Support",
      subCategories: [
        { name: "Non-Profit/Charity", keywords: ["charity", "nonprofit", "donations", "fundraising", "volunteer"] },
        { name: "Volunteer Group", keywords: ["volunteering", "community service", "helping", "giving back"] },
        { name: "HOA/Neighborhood", keywords: ["homeowners", "neighborhood", "community", "residents"] },
        { name: "Support Group", keywords: ["support", "help", "group therapy", "peer support"] },
        { name: "Youth Organization", keywords: ["youth", "kids", "teens", "mentoring", "development"] }
      ]
    },
    {
      label: "Spiritual",
      subCategories: [
        { name: "Church", keywords: ["worship", "christian", "service", "congregation", "faith"] },
        { name: "Mosque", keywords: ["islam", "muslim", "prayer", "worship"] },
        { name: "Synagogue", keywords: ["jewish", "temple", "worship", "faith"] },
        { name: "Meditation Center", keywords: ["meditation", "mindfulness", "zen", "spiritual"] },
        { name: "Bible Study", keywords: ["scripture", "christian", "faith", "study group"] }
      ]
    }
  ],
  
  organizer: [
    {
      label: "Nightlife",
      subCategories: [
        { name: "Club Promoter", keywords: ["nightclub", "events", "parties", "promotion", "entertainment"] },
        { name: "VIP Host", keywords: ["hospitality", "vip", "nightlife", "exclusive"] },
        { name: "Bar Crawl Organizer", keywords: ["pub crawl", "drinking", "social", "bars", "tour"] }
      ]
    },
    {
      label: "Public Events",
      subCategories: [
        { name: "Festival Host", keywords: ["festival", "fair", "community event", "celebration"] },
        { name: "Market Organizer", keywords: ["farmers market", "craft fair", "vendors", "marketplace"] },
        { name: "Parade/Street Fair", keywords: ["parade", "street fair", "community", "celebration"] }
      ]
    },
    {
      label: "Private Events",
      subCategories: [
        { name: "Wedding Planner", keywords: ["wedding", "bride", "groom", "ceremony", "reception"] },
        { name: "Corporate Event Planner", keywords: ["business", "corporate", "conference", "meetings"] },
        { name: "Party Planner", keywords: ["parties", "celebration", "birthday", "event planning"] }
      ]
    },
    {
      label: "Culture",
      subCategories: [
        { name: "Concert Promoter", keywords: ["concerts", "music", "shows", "live music", "bands"] },
        { name: "Art Fair Organizer", keywords: ["art", "gallery", "artists", "exhibition"] },
        { name: "Comedy Show Host", keywords: ["comedy", "comedians", "stand-up", "entertainment"] }
      ]
    }
  ]
};