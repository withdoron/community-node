import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import VoiceInput from './VoiceInput';
import { DollarSign, Plus, X, Loader2, Save } from 'lucide-react';

const INPUT_CLASS =
  'w-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent';
const LABEL_CLASS = 'block text-foreground-soft text-sm font-medium mb-1';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d + (d.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return d; }
};

const TYPE_CONFIG = {
  deposit:      { label: 'Deposit',        color: 'bg-blue-500/20 text-blue-400' },
  progress:     { label: 'Progress',       color: 'bg-primary/20 text-primary-hover' },
  final:        { label: 'Final',          color: 'bg-emerald-500/20 text-emerald-400' },
  change_order: { label: 'Change Order',   color: 'bg-purple-500/20 text-purple-400' },
  refund:       { label: 'Refund',         color: 'bg-muted-foreground/20 text-muted-foreground' },
};

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: 'bg-primary/20 text-primary-hover' },
  received: { label: 'Received', color: 'bg-emerald-500/20 text-emerald-400' },
  cleared:  { label: 'Cleared',  color: 'bg-emerald-500/20 text-emerald-400' },
};

const EMPTY_PAYMENT = {
  amount: '', date: '', type: 'progress', method: 'check',
  check_number: '', notes: '', status: 'received',
};

export default function FieldServicePayments({ projectId, profileId, currentUser, estimateTotal, budgetTotal }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_PAYMENT);

  const referenceTotal = estimateTotal || budgetTotal || 0;

  // ─── Query: Payments ───────────────────────────
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['fs-payments', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const list = await base44.entities.FSPayment.filter({ project_id: projectId });
      return (Array.isArray(list) ? list : list ? [list] : [])
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },
    enabled: !!projectId,
  });

  const totalPaid = useMemo(
    () => payments
      .filter((p) => p.status === 'received' || p.status === 'cleared')
      .reduce((s, p) => s + (p.amount || 0), 0),
    [payments]
  );

  const balance = referenceTotal - totalPaid;
  const paidPct = referenceTotal > 0 ? Math.min(100, (totalPaid / referenceTotal) * 100) : 0;

  // ─── Mutation ──────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.FSPayment.create({
        project_id: projectId,
        profile_id: profileId,
        user_id: currentUser?.id,
        amount: parseFloat(formData.amount) || 0,
        date: formData.date || new Date().toISOString().split('T')[0],
        type: formData.type,
        method: formData.method,
        check_number: formData.method === 'check' ? formData.check_number : null,
        notes: formData.notes,
        status: formData.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fs-payments', projectId]);
      toast.success('Payment logged');
      setShowForm(false);
      setFormData({ ...EMPTY_PAYMENT, date: new Date().toISOString().split('T')[0] });
    },
    onError: (err) => toast.error(`Save failed: ${err.message}`),
  });

  const set = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  // Running balance calculation
  const paymentsWithBalance = useMemo(() => {
    let running = referenceTotal;
    const sorted = [...payments].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return sorted.map((p) => {
      if (p.status === 'received' || p.status === 'cleared') {
        running -= (p.amount || 0);
      }
      return { ...p, runningBalance: running };
    }).reverse();
  }, [payments, referenceTotal]);

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Payments</h3>
        </div>
        <button type="button" onClick={() => {
          setFormData({ ...EMPTY_PAYMENT, date: new Date().toISOString().split('T')[0] });
          setShowForm(true);
        }}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover min-h-[44px]">
          <Plus className="h-4 w-4" /> Log Payment
        </button>
      </div>

      {/* Summary */}
      {referenceTotal > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground/70">Total</p>
            <p className="text-sm font-bold text-foreground">{fmt(referenceTotal)}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground/70">Paid</p>
            <p className="text-sm font-bold text-emerald-400">{fmt(totalPaid)}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground/70">Balance</p>
            <p className="text-sm font-bold text-primary">{fmt(balance)}</p>
          </div>
        </div>
      )}

      {referenceTotal > 0 && (
        <div className="w-full bg-secondary rounded-full h-2">
          <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${paidPct}%` }} />
        </div>
      )}

      {/* Payment form */}
      {showForm && (
        <div className="bg-secondary/50 border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground-soft">Log Payment</p>
            <button type="button" onClick={() => setShowForm(false)}
              className="p-1 text-muted-foreground/70 hover:text-primary"><X className="h-4 w-4" /></button>
          </div>

          <div>
            <label className={LABEL_CLASS}>Amount *</label>
            <input type="number" className={`${INPUT_CLASS} text-lg font-bold`} value={formData.amount}
              onChange={(e) => set('amount', e.target.value)}
              onFocus={(e) => { if (parseFloat(e.target.value) === 0) set('amount', ''); }}
              onBlur={(e) => { if (e.target.value === '') set('amount', 0); }}
              min="0" step="0.01" placeholder="0.00" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Date</label>
              <input type="date" className={INPUT_CLASS} value={formData.date}
                onChange={(e) => set('date', e.target.value)} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Type</label>
              <select className={INPUT_CLASS} value={formData.type}
                onChange={(e) => set('type', e.target.value)}>
                <option value="deposit">Deposit</option>
                <option value="progress">Progress Payment</option>
                <option value="final">Final Payment</option>
                <option value="change_order">Change Order</option>
                <option value="refund">Refund</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Method</label>
              <select className={INPUT_CLASS} value={formData.method}
                onChange={(e) => set('method', e.target.value)}>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="card">Card</option>
                <option value="transfer">Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Status</label>
              <select className={INPUT_CLASS} value={formData.status}
                onChange={(e) => set('status', e.target.value)}>
                <option value="pending">Pending</option>
                <option value="received">Received</option>
                <option value="cleared">Cleared</option>
              </select>
            </div>
          </div>

          {formData.method === 'check' && (
            <div>
              <label className={LABEL_CLASS}>Check Number</label>
              <input type="text" className={INPUT_CLASS} value={formData.check_number}
                onChange={(e) => set('check_number', e.target.value)} placeholder="Check #" />
            </div>
          )}

          <div>
            <label className={LABEL_CLASS}>Notes</label>
            <div className="flex items-center gap-2">
              <input type="text" className={INPUT_CLASS} value={formData.notes}
                onChange={(e) => set('notes', e.target.value)} placeholder="Optional notes" />
              <VoiceInput onTranscript={(t) => set('notes', (formData.notes ? formData.notes + ' ' : '') + t)} />
            </div>
          </div>

          <button type="button"
            disabled={!formData.amount || saveMutation.isLoading}
            onClick={() => saveMutation.mutate()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold transition-colors text-sm min-h-[44px] disabled:opacity-50">
            {saveMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save Payment</>}
          </button>
        </div>
      )}

      {/* Payment list */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        </div>
      )}

      {!isLoading && payments.length === 0 && (
        <p className="text-sm text-muted-foreground/70 text-center py-2">No payments recorded yet.</p>
      )}

      {!isLoading && paymentsWithBalance.length > 0 && (
        <div className="space-y-2">
          {paymentsWithBalance.map((p) => {
            const tc = TYPE_CONFIG[p.type] || TYPE_CONFIG.progress;
            const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
            return (
              <div key={p.id} className="bg-secondary/50 rounded-lg p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tc.color}`}>{tc.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                    {p.method && <span className="text-xs text-muted-foreground/70 capitalize">{p.method}</span>}
                    {p.check_number && <span className="text-xs text-muted-foreground/70">#{p.check_number}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                    <span>{fmtDate(p.date)}</span>
                    {p.notes && <span className="truncate">{p.notes}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-foreground">{fmt(p.amount)}</p>
                  {referenceTotal > 0 && (
                    <p className="text-xs text-muted-foreground/70">Bal: {fmt(p.runningBalance)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
