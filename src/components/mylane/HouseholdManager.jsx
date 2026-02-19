import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Pencil, Trash2, Baby, User, UserCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const CATEGORY_CONFIG = {
  adult: { label: 'Adult', icon: User, color: 'text-slate-400' },
  child: { label: 'Child', icon: UserCircle, color: 'text-amber-500' },
  infant: { label: 'Infant', icon: Baby, color: 'text-slate-300' },
};

function MemberRow({ member, onEdit, onDelete }) {
  const config = CATEGORY_CONFIG[member.category] || CATEGORY_CONFIG.adult;
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-800 rounded-lg">
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-100">{member.name}</p>
          <p className="text-xs text-slate-500">
            {config.label}
            {member.age != null && ` · ${member.age} years old`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(member)}
          className="p-2.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(member)}
          className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function MemberForm({ member, onSave, onCancel, isLoading }) {
  const [name, setName] = useState(member?.name || '');
  const [category, setCategory] = useState(member?.category || 'adult');
  const [age, setAge] = useState(member?.age != null ? String(member.age) : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    onSave({
      name: name.trim(),
      category,
      age: age ? parseInt(age, 10) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-slate-800/50 rounded-lg">
      <div>
        <label className="block text-sm text-slate-400 mb-1">Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name"
          className="bg-slate-800 border-slate-700 text-slate-100"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-2">Category</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  category === key
                    ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">Age (optional)</label>
        <Input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Enter age"
          min="0"
          max="120"
          className="bg-slate-800 border-slate-700 text-slate-100 w-24"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
          className="text-slate-400 hover:text-slate-200"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="bg-amber-500 hover:bg-amber-400 text-black"
        >
          {isLoading ? 'Saving...' : member ? 'Save Changes' : 'Add Member'}
        </Button>
      </div>
    </form>
  );
}

export function HouseholdManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  const userId = user?.id;

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['householdMembers', userId],
    queryFn: async () => {
      if (!userId) return [];
      const records = await base44.entities.HouseholdMembers.filter({ user_id: userId });
      return records.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    },
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.HouseholdMembers.create({
        ...data,
        user_id: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['householdMembers', userId] });
      setShowForm(false);
      toast.success('Household member added');
    },
    onError: () => {
      toast.error('Failed to add member');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.HouseholdMembers.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['householdMembers', userId] });
      setEditingMember(null);
      toast.success('Member updated');
    },
    onError: () => {
      toast.error('Failed to update member');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.HouseholdMembers.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['householdMembers', userId] });
      toast.success('Member removed');
    },
    onError: () => {
      toast.error('Failed to remove member');
    },
  });

  const handleSave = (data) => {
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setShowForm(false);
  };

  const handleDelete = (member) => {
    if (confirm(`Remove ${member.name} from your household?`)) {
      deleteMutation.mutate(member.id);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMember(null);
  };

  const displayMembers = editingMember
    ? members.filter((m) => m.id !== editingMember.id)
    : members;

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-lg font-semibold text-slate-100">
            My Household
          </CardTitle>
        </div>
        {!showForm && !editingMember && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4">
            <MemberForm
              onSave={handleSave}
              onCancel={handleCancel}
              isLoading={createMutation.isPending}
            />
          </div>
        )}

        {editingMember && (
          <div className="mb-4">
            <MemberForm
              member={editingMember}
              onSave={handleSave}
              onCancel={handleCancel}
              isLoading={updateMutation.isPending}
            />
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500 py-4 text-center">Loading...</p>
        ) : displayMembers.length === 0 && !showForm ? (
          <div className="py-6 text-center">
            <Users className="h-10 w-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No household members yet.</p>
            <p className="text-xs text-slate-600 mt-1">
              Add family members to quickly select them when RSVPing.
            </p>
          </div>
        ) : (
          <div>
            {displayMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
