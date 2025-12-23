import React from 'react';
import { CheckCircle2, Circle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const GOALS_BY_ARCHETYPE = {
  venue: [
    { id: 'events', label: 'Host Events', desc: 'List classes, workshops, or meetups' },
    { id: 'barter', label: 'Accept Local Barter', desc: 'Open to Silver, Gold, or commodity trade' },
    { id: 'instructors', label: 'Manage Instructors', desc: 'Highlight independent contractors & teachers' },
    { id: 'membership', label: 'Grow Membership', desc: 'Connect with partner networks (Recess, TCA)' }
  ],
  location: [
    { id: 'events', label: 'Host Events', desc: 'List classes, workshops, or meetups' },
    { id: 'barter', label: 'Accept Local Barter', desc: 'Open to Silver, Gold, or commodity trade' },
    { id: 'instructors', label: 'Manage Instructors', desc: 'Highlight independent contractors & teachers' },
    { id: 'membership', label: 'Grow Membership', desc: 'Connect with partner networks (Recess, TCA)' }
  ],
  service: [
    { id: 'leads', label: 'Get More Leads', desc: 'Receive inquiries from local clients' },
    { id: 'barter', label: 'Accept Local Barter', desc: 'Open to Silver, Gold, or commodity trade' },
    { id: 'instructors', label: 'Manage Instructors', desc: 'Highlight your team or contractors' }
  ],
  talent: [
    { id: 'leads', label: 'Get More Leads', desc: 'Receive inquiries from local clients' },
    { id: 'barter', label: 'Accept Local Barter', desc: 'Open to Silver, Gold, or commodity trade' },
    { id: 'instructors', label: 'Manage Instructors', desc: 'Highlight your team or contractors' }
  ],
  product: [
    { id: 'sell_beta', label: 'Sell Products (Beta)', desc: 'List physical goods in the Marketplace' },
    { id: 'barter', label: 'Accept Local Barter', desc: 'Open to Silver, Gold, or commodity trade' }
  ],
  community: [
    { id: 'events', label: 'Host Events', desc: 'List meetups, gatherings, or activities' },
    { id: 'membership', label: 'Grow Membership', desc: 'Build and engage your community' },
    { id: 'barter', label: 'Accept Local Barter', desc: 'Open to Silver, Gold, or commodity trade' }
  ],
  organizer: [
    { id: 'events', label: 'Promote Events', desc: 'List and market your events' },
    { id: 'ticketing', label: 'Sell Tickets', desc: 'Accept payments for events' },
    { id: 'barter', label: 'Accept Local Barter', desc: 'Open to Silver, Gold, or commodity trade' }
  ]
};

// Default fallback goals
const DEFAULT_GOALS = [
  { id: 'visibility', label: 'Get More Visibility', desc: 'Reach local customers' },
  { id: 'barter', label: 'Accept Local Barter', desc: 'Open to Silver, Gold, or commodity trade' }
];

export default function Step3Goals({ formData, setFormData }) {
  const availableGoals = GOALS_BY_ARCHETYPE[formData.archetype] || DEFAULT_GOALS;
  
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

      <div className="space-y-3">
        {availableGoals.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);
          
          return (
            <div
              key={goal.id}
              onClick={() => toggleGoal(goal.id)}
              className={`
                relative p-4 rounded-xl border-2 cursor-pointer transition-all
                ${isSelected
                  ? 'bg-slate-800 border-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.2)]'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-base">{goal.label}</p>
                  <p className={`text-sm mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                    {goal.desc}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  {isSelected ? (
                    <div className="h-6 w-6 rounded-full bg-teal-500 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-white" fill="currentColor" />
                    </div>
                  ) : (
                    <Circle className="h-6 w-6 text-slate-600" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}