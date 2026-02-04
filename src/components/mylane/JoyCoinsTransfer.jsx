import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, Send, User, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useJoyCoins } from '@/hooks/useJoyCoins';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
function RecipientRow({ user, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(user)}
      className="w-full flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg transition-colors text-left"
    >
      <div className="p-2 bg-slate-800 rounded-full">
        <User className="h-4 w-4 text-slate-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-100">{user.full_name || user.data?.display_name || user.email}</p>
        <p className="text-xs text-slate-500">{user.email}</p>
      </div>
    </button>
  );
}

export function JoyCoinsTransfer() {
  const { user: currentUser } = useAuth();
  const { balance, transferCoins, transferPending, refetchAll } = useJoyCoins();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('search'); // 'search' | 'confirm' | 'success'

  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ['userSearch', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const users = await base44.entities.User.list('-created_date', 200);
      const query = searchQuery.toLowerCase();
      return (users || [])
        .filter(
          (u) =>
            u.id !== currentUser?.id &&
            (u.full_name?.toLowerCase().includes(query) ||
              u.data?.display_name?.toLowerCase().includes(query) ||
              u.email?.toLowerCase().includes(query))
        )
        .slice(0, 10);
    },
    enabled: searchQuery.length >= 2
  });

  const handleSelectRecipient = (user) => {
    setSelectedRecipient(user);
    setStep('confirm');
    setSearchQuery('');
  };

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setAmount(value);
  };

  const handleTransfer = async () => {
    const transferAmount = parseInt(amount, 10);

    if (!transferAmount || transferAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    if (transferAmount > balance) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      await transferCoins({
        recipientUserId: selectedRecipient.id,
        recipientName: selectedRecipient.full_name || selectedRecipient.data?.display_name || selectedRecipient.email,
        amount: transferAmount
      });
      setStep('success');
      refetchAll();
    } catch (error) {
      if (error?.message === 'INSUFFICIENT_BALANCE') {
        toast.error('Insufficient balance');
      } else {
        toast.error('Transfer failed. Please try again.');
      }
    }
  };

  const handleReset = () => {
    setSelectedRecipient(null);
    setAmount('');
    setStep('search');
    setSearchQuery('');
  };

  const recipientDisplayName = selectedRecipient?.full_name || selectedRecipient?.data?.display_name || selectedRecipient?.email;

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/my-lane/transactions"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Send Joy Coins</h1>
              <p className="text-sm text-slate-400">Your balance: {balance} coins</p>
            </div>
          </div>
        </div>

        {step === 'search' && (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <label className="block text-sm text-slate-400 mb-2">Search for a member</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter name or email..."
                  className="pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                  autoFocus
                />
              </div>

              {searching && <p className="text-sm text-slate-500 mt-4 text-center">Searching...</p>}

              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-sm text-slate-500 mt-4 text-center">No members found</p>
              )}

              {searchResults.length > 0 && (
                <div className="mt-4 space-y-1">
                  {searchResults.map((user) => (
                    <RecipientRow key={user.id} user={user} onSelect={handleSelectRecipient} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 'confirm' && selectedRecipient && (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Sending to</label>
                <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                  <div className="p-2 bg-slate-700 rounded-full">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-100">{recipientDisplayName}</p>
                    <p className="text-xs text-slate-500">{selectedRecipient.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-amber-500 hover:text-amber-400 mt-2"
                >
                  Change recipient
                </button>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Amount</label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0"
                    className="pl-10 bg-slate-800 border-slate-700 text-slate-100 text-lg placeholder:text-slate-500"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Available: {balance} coins</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[1, 5, 10]
                  .filter((n) => n <= balance)
                  .map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAmount(n.toString())}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300"
                    >
                      {n}
                    </button>
                  ))}
                {balance > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(balance.toString())}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300"
                  >
                    All ({balance})
                  </button>
                )}
              </div>

              <Button
                onClick={handleTransfer}
                disabled={!amount || parseInt(amount, 10) <= 0 || parseInt(amount, 10) > balance || transferPending}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black"
              >
                <Send className="h-4 w-4 mr-2" />
                {transferPending ? 'Sending...' : `Send ${amount || 0} coins`}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coins className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-100 mb-1">Coins Sent!</h2>
              <p className="text-sm text-slate-400 mb-4">
                You sent {amount} coins to {recipientDisplayName}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Send More
                </Button>
                <Link to="/my-lane/transactions" className="flex-1">
                  <Button className="w-full bg-amber-500 hover:bg-amber-400 text-black">
                    View History
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
