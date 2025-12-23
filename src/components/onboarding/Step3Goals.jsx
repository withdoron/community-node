import React from 'react';
import { CheckCircle2, Circle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const GOALS_BY_ARCHETYPE = {
  venue: [
    { id: 'visibility', label: 'Increase Visibility', desc: 'Create a public listing so locals can find you' },
    { id: 'events', label: 'Host Events', desc: 'List classes, workshops, or meetups' },
    { id: 'barter', label: 'Accept Local Barter', desc: 'Open to Silver, Gold, or commodity trade' },
    { id: 'instructors', label: 'Manage Instructors', desc: 'Highlight independent contractors & teachers' },
    { id: 'membership', label: 'Grow Membership', desc: 'Connect with partner networks (Recess, TCA)' }
  ],
  location: [
    { id: 'visibility', label: 'Increase Visibility', desc: 'Create a public listing so locals can find you' },
    { id: 'events', label: 'Host Events', desc: 'List classes, workshops, or meetups' },
    { id: 'barter', label: 'Accept Local Barter', desc: 'Open to Silver, Gold, or commodity trade' },
    { id: 'instructors', label: 'Manage Instructors', desc: 'Highlight independent contractors & teachers' },
    { id: 'membership', label: 'Grow Membership', desc: 'Connect with partner networks (Recess, TCA)' }
  ],
  service: [
    { id: 'visibility', label: 'Increase Visibility', desc: 'Create a public profile for potential clients' },
    { id: 'leads', label: 'Get Inquiries', desc: 'Receive messages and quote requests' },
    { id: 'barter', label: 'Accept Local Barter', desc: 'Open to Silver, Gold, or commodity trade' },
    { id: 'instructors', label: 'Manage Instructors', desc: 'Highlight your team or contractors' }
  ],
  talent: [
    { id: 'visibility', label: 'Increase Visibility', desc: 'Create a public profile for potential clients' },
    { id: 'leads', label: 'Get Inquiries', desc: 'Receive messages and quote requests' },
    { id: 'barter', label: 'Accept Local Barter', desc: 'Open to Silver, Gold, or commodity trade' },
    { id: 'instructors', label: 'Manage Instructors', desc: 'Highlight your team or contractors' }
  ],
  product: [
    { id: 'visibility', label: 'Increase Visibility', desc: 'Create a public profile for your brand' },
    { id: 'sell_beta', label: 'Sell Products (Beta)', desc: 'List physical goods in the Marketplace' },
    { id: 'barter', label: 'Accept Local Barter', desc: 'Open to Silver, Gold, or commodity trade' }
  ],
  community: [
    { id: 'visibility', label: 'Increase Visibility', desc: 'Create a public listing so locals can find you' },
    { id: 'events', label: 'Host Events', desc: 'List meetups, gatherings, or activities' },
    { id: 'membership', label: 'Grow Membership', desc: 'Build and engage your community' },
    { id: 'barter', label: 'Accept Local Barter', desc: 'Open to Silver, Gold, or commodity trade' }
  ],
  organizer: [
    { id: 'visibility', label: 'Increase Visibility', desc: 'Create a public listing so locals can find you' },
    { id: 'events', label: 'Promote Events', desc: 'List and market your events' },
    { id: 'ticketing', label: 'Sell Tickets', desc: 'Accept payments for events' },
    { id: 'barter', label: 'Accept Local Barter', desc: 'Open to Silver, Gold, or commodity trade' }
  ]
};

// Default fallback goals
const DEFAULT_GOALS = [
  { id: 'visibility', label: 'Increase Visibility', desc: 'Create a public profile' },
  { id: 'barter', label: 'Accept Local Barter', desc: 'Open to Silver, Gold, or commodity trade' }
];

export default function Step3Goals({ formData, setFormData }) {
  const availableGoals = GOALS_BY_ARCHETYPE[formData.archetype || 'venue'] || DEFAULT_GOALS;
  
  const selectedGoals = formData.selected_goals || [];

  const toggleGoal = (goalId) => {
    const isSelected = selectedGoals.includes(goalId);
    const newGoals = isSelected
      ? selectedGoals.filter(id => id !== goalId)
      : [...selectedGoals, goalId];
    
    setFormData({ ...formData, selected_goals: newGoals });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">What are you looking to do?</h2>
        <p className="text-slate-400 mt-1">Select all that apply</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableGoals.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);
          
          return (
            <div
              key={goal.id}
              onClick={() => toggleGoal(goal.id)}
              className={`
                relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-200
                ${isSelected
                  ? 'bg-slate-800 border-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.15)]'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                }
              `}
            >
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <CheckCircle2 className="h-6 w-6 text-teal-500" />
                </div>
              )}
              <div className="pr-8">
                <p className={`font-semibold text-lg mb-2 ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {goal.label}
                </p>
                <p className={`text-sm ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                  {goal.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}