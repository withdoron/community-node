import React from 'react';
import { CheckCircle2, Eye, Calendar, Handshake, Coins, Briefcase } from "lucide-react";

const GOALS = [
  { 
    id: 'visibility', 
    label: 'Increase Visibility', 
    subtitle: 'Get discovered by locals on the map.',
    icon: Eye
  },
  { 
    id: 'events', 
    label: 'Promote Events', 
    subtitle: 'Boost attendance for classes & workshops.',
    icon: Calendar
  },
  { 
    id: 'partners', 
    label: 'Find Local Partners', 
    subtitle: 'Connect with other businesses for supply chain.',
    icon: Handshake
  },
  { 
    id: 'currency', 
    label: 'Accept Local Assets', 
    subtitle: 'Enable barter, silver, and local currency.',
    icon: Coins
  },
  { 
    id: 'hiring', 
    label: 'Hire Staff', 
    subtitle: 'List open positions to the community.',
    icon: Briefcase
  }
];

export default function Step3Goals({ formData, setFormData }) {
  const selectedGoals = formData.goals || [];

  const toggleGoal = (goalId) => {
    const isSelected = selectedGoals.includes(goalId);
    const newGoals = isSelected
      ? selectedGoals.filter(id => id !== goalId)
      : [...selectedGoals, goalId];
    
    setFormData({ ...formData, goals: newGoals });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">What are your goals?</h2>
        <p className="text-slate-400 mt-1">Select all that apply (choose at least one)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {GOALS.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);
          const Icon = goal.icon;
          
          return (
            <div
              key={goal.id}
              onClick={() => toggleGoal(goal.id)}
              className={`
                relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-200
                ${isSelected
                  ? 'bg-teal-500/10 border-teal-500 shadow-lg'
                  : 'bg-white border-slate-300 hover:border-teal-400'
                }
              `}
            >
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="h-5 w-5 text-teal-500" />
                </div>
              )}
              
              <div className="mb-3">
                <div className={`
                  h-12 w-12 rounded-lg flex items-center justify-center
                  ${isSelected ? 'bg-teal-500/20' : 'bg-slate-100'}
                `}>
                  <Icon className={`h-6 w-6 ${isSelected ? 'text-teal-600' : 'text-slate-600'}`} />
                </div>
              </div>
              
              <h3 className={`font-semibold text-base mb-1 ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                {goal.label}
              </h3>
              <p className="text-sm text-slate-500">
                {goal.subtitle}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}