import React, { useState } from 'react';
import { getFriendlyErrorMessage } from '@/lib/errorMessages';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Key, History, ShoppingCart, Heart, Loader2, Check, Calendar, MapPin } from "lucide-react";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function PunchPass() {
  const [pin, setPin] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: punchPassData, isLoading: passLoading } = useQuery({
    queryKey: ['punchPass', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return null;
      const passes = await base44.entities.PunchPass.filter({ user_id: currentUser.id });
      return passes[0] || null;
    },
    enabled: !!currentUser
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['punchPassTransactions', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      return base44.entities.PunchPassTransaction.filter({ user_id: currentUser.id }, '-created_date', 100);
    },
    enabled: !!currentUser
  });

  const { data: usageHistory = [], isLoading: usageLoading } = useQuery({
    queryKey: ['punchPassUsage', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      return base44.entities.PunchPassUsage.filter({ user_id: currentUser.id }, '-created_date', 100);
    },
    enabled: !!currentUser
  });

  const setPinMutation = useMutation({
    mutationFn: async (newPin) => {
      const response = await base44.functions.invoke('setPunchPassPin', { pin: newPin });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punchPass'] });
      toast.success('PIN set successfully!');
      setPin('');
      setIsSettingPin(false);
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error, 'Failed to set PIN. Please try again.'));
    }
  });

  const handleSetPin = () => {
    if (!/^\d{4}$/.test(pin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }
    setPinMutation.mutate(pin);
  };

  const handlePurchase = () => {
    toast.info('Punch pass purchase coming soon!');
  };

  const handleDonate = () => {
    toast.info('Donate punch passes coming soon!');
  };

  if (userLoading || passLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const hasPunchPass = !!punchPassData;
  const hasPin = hasPunchPass && !!punchPassData.pin_hash;

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 bg-amber-500 rounded-lg flex items-center justify-center">
              <Ticket className="h-6 w-6 text-slate-900" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Punch Pass Network</h1>
              <p className="text-slate-400">Recess & The Creative Alliance</p>
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-0 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-950 text-sm font-medium mb-1">Current Balance</p>
              <p className="text-4xl font-bold text-slate-900">
                {punchPassData?.current_balance || 0}
              </p>
              <p className="text-amber-950 text-sm mt-1">punch passes</p>
            </div>
            <div className="text-right">
              <Ticket className="h-16 w-16 text-amber-950 opacity-20 mb-2" />
              {hasPin ? (
                <Badge className="bg-slate-900 text-amber-400 border-0">
                  <Check className="h-3 w-3 mr-1" />
                  PIN Active
                </Badge>
              ) : (
                <Badge className="bg-red-900 text-red-200 border-0">
                  No PIN Set
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {/* PIN Management Section */}
        {!hasPin && (
          <Card className="bg-slate-800 border-slate-700 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Key className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Set Your Punch Pass PIN</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Create a 4-digit PIN to use when checking in at events. Keep this private!
                </p>
                {isSettingPin ? (
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="Enter 4-digit PIN"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      className="max-w-xs bg-slate-900 border-slate-700 text-white"
                    />
                    <Button 
                      onClick={handleSetPin}
                      disabled={setPinMutation.isPending}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-900"
                    >
                      {setPinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set PIN'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setIsSettingPin(false);
                        setPin('');
                      }}
                      className="border-slate-700 text-slate-300"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={() => setIsSettingPin(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-900"
                  >
                    Set PIN Now
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700 p-4 hover:border-amber-500/50 transition-all cursor-pointer" onClick={handlePurchase}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Buy More Punches</h3>
                <p className="text-sm text-slate-400">10 for $50 or 20 for $90</p>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-800 border-slate-700 p-4 hover:border-amber-500/50 transition-all cursor-pointer" onClick={handleDonate}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-pink-500/20 rounded-lg flex items-center justify-center">
                <Heart className="h-6 w-6 text-pink-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Donate a Punch</h3>
                <p className="text-sm text-slate-400">Support underserved youth</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs for History */}
        <Card className="bg-slate-800 border-slate-700">
          <Tabs defaultValue="usage" className="w-full">
            <TabsList className="w-full bg-slate-900 border-b border-slate-700">
              <TabsTrigger value="usage" className="flex-1">
                <History className="h-4 w-4 mr-2" />
                Usage History
              </TabsTrigger>
              <TabsTrigger value="purchases" className="flex-1">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Purchase History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="usage" className="p-6">
              {usageLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : usageHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No punch passes used yet</p>
                  <p className="text-sm text-slate-500 mt-1">Your check-ins will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {usageHistory.map((usage) => (
                    <div key={usage.id} className="flex items-start gap-4 p-4 bg-slate-900 rounded-lg">
                      <div className="h-10 w-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Ticket className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white">{usage.event_title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(usage.created_date), 'MMM d, yyyy')}
                          </span>
                          {usage.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {usage.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-slate-700 text-slate-300 border-0">
                        -{usage.punches_deducted} punch{usage.punches_deducted !== 1 ? 'es' : ''}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="purchases" className="p-6">
              {txLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No purchases yet</p>
                  <p className="text-sm text-slate-500 mt-1">Buy your first punch pass to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-start gap-4 p-4 bg-slate-900 rounded-lg">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        tx.transaction_type === 'donation' ? 'bg-pink-500/20' : 'bg-emerald-500/20'
                      }`}>
                        {tx.transaction_type === 'donation' ? (
                          <Heart className="h-5 w-5 text-pink-400" />
                        ) : (
                          <ShoppingCart className="h-5 w-5 text-emerald-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white">
                          {tx.transaction_type === 'donation' ? 'Donation' : 'Purchase'}
                        </h4>
                        <p className="text-sm text-slate-400">
                          {format(new Date(tx.created_date), 'MMM d, yyyy • h:mm a')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">+{tx.quantity} punches</p>
                        <p className="text-sm text-slate-400">${tx.amount_paid?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        {/* Stats Card */}
        {hasPunchPass && (
          <Card className="bg-slate-800 border-slate-700 p-6 mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Lifetime Stats</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold text-amber-400">
                  {punchPassData.total_purchased || 0}
                </p>
                <p className="text-sm text-slate-400">Purchased</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">
                  {punchPassData.total_used || 0}
                </p>
                <p className="text-sm text-slate-400">Used</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-pink-400">
                  {punchPassData.total_donated || 0}
                </p>
                <p className="text-sm text-slate-400">Donated</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}