import React from 'react';
import { CheckCircle2, Circle, Eye, Calendar, Handshake, Coins, Briefcase } from "lucide-react";

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

      <div className="flex flex-col gap-3">
        {GOALS.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);
          const Icon = goal.icon;
          
          return (
            <div
              key={goal.id}
              onClick={() => toggleGoal(goal.id)}
              className={`
                flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                ${isSelected
                  ? 'bg-slate-800 border-teal-500 shadow-lg'
                  : 'bg-slate-800 border-slate-700 hover:bg-slate-800/80 hover:border-slate-600'
                }
              `}
            >
              {/* Icon */}
              <div className={`
                h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0
                ${isSelected ? 'bg-teal-500/20' : 'bg-slate-700'}
              `}>
                <Icon className={`h-5 w-5 ${isSelected ? 'text-teal-400' : 'text-slate-400'}`} />
              </div>
              
              {/* Title & Subtitle */}
              <div className="flex-1">
                <h3 className={`font-semibold text-base mb-0.5 ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                  {goal.label}
                </h3>
                <p className="text-sm text-slate-400">
                  {goal.subtitle}
                </p>
              </div>
              
              {/* Checkmark */}
              <div className="flex-shrink-0">
                {isSelected ? (
                  <CheckCircle2 className="h-6 w-6 text-teal-500" />
                ) : (
                  <Circle className="h-6 w-6 text-slate-600" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}