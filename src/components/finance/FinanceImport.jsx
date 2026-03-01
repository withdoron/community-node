import React, { useState, useMemo, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Upload, FileSpreadsheet, FileText, ArrowRight, ArrowLeft, CheckCircle, Loader2, AlertTriangle, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { parseSelcoStatement, cleanVendorName, extractTransactionType } from '@/utils/statementParser';
import { extractTextFromPdf } from '@/utils/pdfExtractor';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

// ─── CSV Parser (no PapaParse dependency) ──────────
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseCSVString(text) {
  const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const rows = [];
  for (const line of rawLines) {
    if (line.trim() === '') continue;
    rows.push(parseCsvLine(line).map((f) => f.trim()));
  }
  return rows;
}

// ─── Column Mapping Logic ──────────────────────────
const MAPPING_OPTIONS = [
  { id: 'skip', label: 'Skip' },
  { id: 'date', label: 'Date' },
  { id: 'description', label: 'Description' },
  { id: 'amount', label: 'Amount' },
  { id: 'debit', label: 'Debit' },
  { id: 'credit', label: 'Credit' },
  { id: 'category', label: 'Category' },
];

function autoDetectMapping(header) {
  const h = header.toLowerCase().trim();
  if (/date|posted|trans.*date/.test(h)) return 'date';
  if (/desc|memo|payee|narration|particulars/.test(h)) return 'description';
  if (/^amount$|^total$/.test(h)) return 'amount';
  if (/debit|withdrawal|out/.test(h)) return 'debit';
  if (/credit|deposit|in/.test(h)) return 'credit';
  if (/category|type|class/.test(h)) return 'category';
  return 'skip';
}

const DEFAULT_INCOME_CATS = ['Salary/Wages', 'Client Payment', 'Reimbursement', 'Gift', 'Other Income'];

function resolveCategories(profile, context, type) {
  const contextCats = profile?.categories?.[context];
  if (!contextCats) return [];
  if (contextCats.income || contextCats.expense) return contextCats[type] || [];
  if (Array.isArray(contextCats)) return type === 'expense' ? contextCats : DEFAULT_INCOME_CATS;
  return [];
}

// ─── Transaction Type Labels ───────────────────────
const TXN_TYPE_LABELS = {
  recurring: 'Recurring',
  debit: 'Debit',
  transfer_in: 'Transfer',
  check_deposit: 'Check',
  cash_withdrawal: 'Cash',
  bill_pay: 'Bill Pay',
  refund: 'Refund',
  other: 'Other',
};

// Format statement month "YYYY-MM" to "Month Year"
function formatStatementMonth(monthStr) {
  if (!monthStr) return '';
  const [year, mm] = monthStr.split('-');
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const idx = parseInt(mm, 10) - 1;
  return `${monthNames[idx] || mm} ${year}`;
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function FinanceImport({ profile, currentUser, onNavigateTab }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  // Mode: null (selector) | 'csv' | 'pdf'
  const [mode, setMode] = useState(null);

  // ─── CSV State ───
  const [step, setStep] = useState('upload');
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [columnMap, setColumnMap] = useState({});
  const [importContext, setImportContext] = useState('');
  const [amountConvention, setAmountConvention] = useState('negative_expense');
  const [parsedRows, setParsedRows] = useState([]);
  const [importingCount, setImportingCount] = useState(0);

  // ─── PDF State ───
  const [pdfStep, setPdfStep] = useState('upload'); // 'upload' | 'review' | 'done'
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfParsedTxns, setPdfParsedTxns] = useState([]);
  const [pdfStatementMonth, setPdfStatementMonth] = useState('');
  const [pdfContext, setPdfContext] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [pdfImportingCount, setPdfImportingCount] = useState(0);
  const [pdfDragging, setPdfDragging] = useState(false);

  // ─── Existing Transactions (for dupe detection + auto-categorize) ──
  const { data: existingTxns = [] } = useQuery({
    queryKey: ['finance-transactions', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.Transaction.filter(
        { profile_id: profile.id }, '-date', 2000
      );
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  const activeContexts = Object.entries(profile?.contexts || {})
    .filter(([, ctx]) => ctx.is_active)
    .map(([id, ctx]) => ({ id, label: ctx.label }));

  const getCategoriesForType = (type) => resolveCategories(profile, mode === 'pdf' ? pdfContext : importContext, type);

  // ═══════════════════════════════════════════════════
  // CSV FLOW (existing logic, unchanged)
  // ═══════════════════════════════════════════════════

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a .csv file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const rows = parseCSVString(text);
        if (rows.length < 2) {
          toast.error('CSV file appears empty or has only headers');
          return;
        }
        const hdrs = rows[0];
        setFileName(file.name);
        setRawRows(rows);
        setHeaders(hdrs);

        const autoMap = {};
        hdrs.forEach((h, i) => {
          autoMap[i] = autoDetectMapping(h);
        });
        setColumnMap(autoMap);

        const defaultCtx = Object.keys(profile?.contexts || {})[0] || 'personal';
        setImportContext(defaultCtx);

        setStep('map');
      } catch {
        toast.error('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
  }, [profile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // ─── Map Columns ──────────────────────────────────
  const hasSingleAmount = useMemo(() => Object.values(columnMap).includes('amount'), [columnMap]);
  const hasDebitCredit = useMemo(() => Object.values(columnMap).includes('debit') || Object.values(columnMap).includes('credit'), [columnMap]);

  const mappingValid = useMemo(() => {
    const vals = Object.values(columnMap);
    const hasDate = vals.includes('date');
    const hasDesc = vals.includes('description');
    const hasAmount = vals.includes('amount') || (vals.includes('debit') || vals.includes('credit'));
    return hasDate && hasDesc && hasAmount;
  }, [columnMap]);

  const proceedToReview = useCallback(() => {
    const dataRows = rawRows.slice(1);
    const dateIdx = Object.entries(columnMap).find(([, v]) => v === 'date')?.[0];
    const descIdx = Object.entries(columnMap).find(([, v]) => v === 'description')?.[0];
    const amtIdx = Object.entries(columnMap).find(([, v]) => v === 'amount')?.[0];
    const debitIdx = Object.entries(columnMap).find(([, v]) => v === 'debit')?.[0];
    const creditIdx = Object.entries(columnMap).find(([, v]) => v === 'credit')?.[0];
    const catIdx = Object.entries(columnMap).find(([, v]) => v === 'category')?.[0];

    const descCatMap = {};
    existingTxns.forEach((t) => {
      if (t.description && t.category) {
        descCatMap[t.description.toLowerCase().trim()] = t.category;
      }
    });

    const parsed = dataRows
      .filter((row) => row.some((c) => c.trim() !== ''))
      .map((row) => {
        const rawDate = dateIdx != null ? row[dateIdx] : '';
        const description = descIdx != null ? (row[descIdx] || '').trim() : '';

        let amount = 0;
        let type = 'expense';

        if (amtIdx != null) {
          const rawAmt = (row[amtIdx] || '').replace(/[$,\s]/g, '');
          amount = parseFloat(rawAmt) || 0;
          if (amountConvention === 'negative_expense') {
            type = amount < 0 ? 'expense' : 'income';
          } else {
            type = amount > 0 ? 'expense' : 'income';
          }
          amount = Math.abs(amount);
        } else {
          const debitAmt = debitIdx != null ? parseFloat((row[debitIdx] || '').replace(/[$,\s]/g, '')) || 0 : 0;
          const creditAmt = creditIdx != null ? parseFloat((row[creditIdx] || '').replace(/[$,\s]/g, '')) || 0 : 0;
          if (creditAmt > 0) {
            type = 'income';
            amount = creditAmt;
          } else {
            type = 'expense';
            amount = Math.abs(debitAmt) || 0;
          }
        }

        let date = '';
        if (rawDate) {
          try {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
              date = d.toISOString().split('T')[0];
            }
          } catch {
            // leave empty
          }
        }

        let category = catIdx != null ? (row[catIdx] || '').trim() : '';
        if (!category) {
          category = descCatMap[description.toLowerCase().trim()] || '';
        }

        const isDuplicate = existingTxns.some((t) => {
          const tDate = (t.date || '').split('T')[0];
          return tDate === date && Math.abs((t.amount || 0) - amount) < 0.01 &&
            (t.description || '').toLowerCase().trim() === description.toLowerCase().trim();
        });

        return {
          date,
          description,
          amount,
          type,
          category,
          included: !isDuplicate && amount > 0 && date !== '',
          duplicate: isDuplicate,
          valid: amount > 0 && date !== '' && description !== '',
        };
      })
      .filter((r) => r.valid || r.amount > 0);

    setParsedRows(parsed);
    setStep('review');
  }, [rawRows, columnMap, amountConvention, existingTxns]);

  // ─── CSV Review ───────────────────────────────────
  const selectedRows = useMemo(() => parsedRows.filter((r) => r.included), [parsedRows]);
  const selectedIncome = useMemo(() => selectedRows.filter((r) => r.type === 'income'), [selectedRows]);
  const selectedExpenses = useMemo(() => selectedRows.filter((r) => r.type === 'expense'), [selectedRows]);

  const toggleRow = (idx) => {
    setParsedRows((prev) => prev.map((r, i) => i === idx ? { ...r, included: !r.included } : r));
  };

  const toggleAll = (val) => {
    setParsedRows((prev) => prev.map((r) => ({ ...r, included: val })));
  };

  const updateCategory = (idx, cat) => {
    setParsedRows((prev) => prev.map((r, i) => i === idx ? { ...r, category: cat } : r));
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const toImport = parsedRows.filter((r) => r.included);
      setImportingCount(toImport.length);

      for (const row of toImport) {
        await base44.entities.Transaction.create({
          profile_id: profile.id,
          user_id: currentUser.id,
          type: row.type,
          amount: row.amount,
          date: row.date,
          description: row.description,
          category: row.category || null,
          context: importContext,
          notes: null,
          source_node: 'csv_import',
          is_recurring_instance: false,
        });
      }
      return toImport.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      toast.success(`Imported ${count} transactions`);
      setStep('done');
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to import transactions');
    },
  });

  const resetCsvImport = () => {
    setStep('upload');
    setFileName('');
    setRawRows([]);
    setHeaders([]);
    setColumnMap({});
    setParsedRows([]);
    setImportingCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ═══════════════════════════════════════════════════
  // PDF FLOW
  // ═══════════════════════════════════════════════════

  const handlePdfFile = useCallback(async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a .pdf file');
      return;
    }

    setPdfLoading(true);
    setPdfError('');
    setPdfFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractTextFromPdf(arrayBuffer);
      const { month, transactions } = parseSelcoStatement(text);

      if (transactions.length === 0) {
        setPdfError('No transactions detected. Make sure this is a SELCO Credit Union statement.');
        setPdfLoading(false);
        return;
      }

      // Build description → category map from existing transactions for auto-categorize
      const descCatMap = {};
      existingTxns.forEach((t) => {
        if (t.description && t.category) {
          descCatMap[t.description.toLowerCase().trim()] = t.category;
        }
      });

      // Enrich transactions with include/exclude, duplicate detection, auto-category
      const enriched = transactions.map((txn) => {
        const type = txn.amount > 0 ? 'income' : 'expense';
        const absAmount = Math.abs(txn.amount);

        // Duplicate detection: check date + amount
        const isDuplicate = existingTxns.some((t) => {
          const tDate = (t.date || '').split('T')[0];
          return tDate === txn.date && Math.abs(Math.abs(t.amount || 0) - absAmount) < 0.01;
        });

        // Auto-categorize from existing transactions
        const cleanDesc = txn.cleaned_description || '';
        let category = descCatMap[cleanDesc.toLowerCase().trim()] || '';

        return {
          ...txn,
          type,
          absAmount,
          category,
          included: !isDuplicate,
          duplicate: isDuplicate,
        };
      });

      setPdfParsedTxns(enriched);
      setPdfStatementMonth(month);

      const defaultCtx = Object.keys(profile?.contexts || {})[0] || 'personal';
      setPdfContext(defaultCtx);

      setPdfStep('review');
    } catch (err) {
      console.error('PDF processing error:', err);
      setPdfError(err.message || 'Failed to process PDF');
    } finally {
      setPdfLoading(false);
    }
  }, [existingTxns, profile]);

  const handlePdfDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setPdfDragging(false);
    const file = e.dataTransfer?.files?.[0];
    handlePdfFile(file);
  }, [handlePdfFile]);

  const handlePdfDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setPdfDragging(true);
  }, []);

  const handlePdfDragLeave = useCallback(() => {
    setPdfDragging(false);
  }, []);

  // PDF Review helpers
  const pdfSelectedRows = useMemo(() => pdfParsedTxns.filter((r) => r.included), [pdfParsedTxns]);
  const pdfSelectedDeposits = useMemo(() => pdfSelectedRows.filter((r) => r.type === 'income'), [pdfSelectedRows]);
  const pdfSelectedWithdrawals = useMemo(() => pdfSelectedRows.filter((r) => r.type === 'expense'), [pdfSelectedRows]);

  const togglePdfRow = (idx) => {
    setPdfParsedTxns((prev) => prev.map((r, i) => i === idx ? { ...r, included: !r.included } : r));
  };

  const toggleAllPdf = (val) => {
    setPdfParsedTxns((prev) => prev.map((r) => ({ ...r, included: val })));
  };

  const updatePdfCategory = (idx, cat) => {
    setPdfParsedTxns((prev) => prev.map((r, i) => i === idx ? { ...r, category: cat } : r));
  };

  const pdfImportMutation = useMutation({
    mutationFn: async () => {
      const toImport = pdfParsedTxns.filter((r) => r.included);
      setPdfImportingCount(toImport.length);

      for (const row of toImport) {
        await base44.entities.Transaction.create({
          profile_id: profile.id,
          user_id: currentUser.id,
          type: row.type,
          amount: row.absAmount,
          date: row.date,
          description: row.cleaned_description || row.description,
          category: row.category || null,
          context: pdfContext,
          notes: row.raw_description || null,
          source_node: 'selco_pdf',
          is_recurring_instance: false,
        });
      }
      return toImport.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      toast.success(`Imported ${count} transactions`);
      setPdfStep('done');
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to import transactions');
    },
  });

  const resetPdfImport = () => {
    setPdfStep('upload');
    setPdfFileName('');
    setPdfParsedTxns([]);
    setPdfStatementMonth('');
    setPdfContext('');
    setPdfError('');
    setPdfLoading(false);
    setPdfImportingCount(0);
    setPdfDragging(false);
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const resetToModeSelector = () => {
    resetCsvImport();
    resetPdfImport();
    setMode(null);
  };

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════

  // ─── Mode Selector ───
  if (mode === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Upload className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">Import Transactions</h2>
        </div>
        <p className="text-sm text-slate-400">
          Choose an import method to add transactions to your financial profile.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* CSV Card */}
          <button
            type="button"
            onClick={() => setMode('csv')}
            className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-6 text-left transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
              <FileSpreadsheet className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-100 mb-1">CSV File</h3>
            <p className="text-sm text-slate-400">Import from any bank</p>
          </button>

          {/* PDF Card */}
          <button
            type="button"
            onClick={() => {
              setMode('pdf');
              const defaultCtx = Object.keys(profile?.contexts || {})[0] || 'personal';
              setPdfContext(defaultCtx);
            }}
            className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-6 text-left transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
              <FileText className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-100 mb-1">PDF Statement</h3>
            <p className="text-sm text-slate-400">SELCO Credit Union</p>
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // CSV MODE
  // ═══════════════════════════════════════════════════
  if (mode === 'csv') {
    // ─── Step 1: Upload ───
    if (step === 'upload') {
      return (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-100">Import Bank Statement</h2>
              </div>
              <button type="button" onClick={resetToModeSelector} className="text-sm text-slate-400 hover:text-amber-500 transition-colors flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Upload a CSV file from your bank to quickly add transactions. You'll map columns, review, and categorize before importing.
            </p>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl p-10 text-center transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-sm text-slate-300 mb-2">
                Drag & drop a CSV file here
              </p>
              <p className="text-xs text-slate-500 mb-4">or</p>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors min-h-[44px]"
              >
                <Upload className="h-4 w-4" />
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
            <p className="text-xs text-slate-500 mt-3">Accepts .csv files. All processing is done locally in your browser.</p>
          </div>
        </div>
      );
    }

    // ─── Step 2: Map Columns ───
    if (step === 'map') {
      const previewRows = rawRows.slice(1, 6);

      return (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-100">Map Columns</h2>
              </div>
              <span className="text-xs text-slate-500">{fileName} — {rawRows.length - 1} rows</span>
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} className="text-left p-2 text-slate-400 border-b border-slate-800 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="p-2 text-slate-300 border-b border-slate-800/50 whitespace-nowrap max-w-[200px] truncate">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-slate-300 font-medium">Map each column to a field:</p>
              {headers.map((h, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-slate-400 w-32 truncate flex-shrink-0">{h}</span>
                  <span className="text-slate-600">→</span>
                  <select
                    value={columnMap[i] || 'skip'}
                    onChange={(e) => setColumnMap((prev) => ({ ...prev, [i]: e.target.value }))}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 min-h-[36px]"
                  >
                    {MAPPING_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {hasSingleAmount && !hasDebitCredit && (
              <div className="mb-6">
                <Label className="text-slate-400 text-sm">Amount convention</Label>
                <div className="flex gap-2 mt-2">
                  <button type="button"
                    onClick={() => setAmountConvention('negative_expense')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
                      amountConvention === 'negative_expense'
                        ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                    Negative = Expense
                  </button>
                  <button type="button"
                    onClick={() => setAmountConvention('positive_expense')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
                      amountConvention === 'positive_expense'
                        ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                    Positive = Expense
                  </button>
                </div>
              </div>
            )}

            <div className="mb-6">
              <Label className="text-slate-400 text-sm">Which account is this from?</Label>
              <select
                value={importContext}
                onChange={(e) => setImportContext(e.target.value)}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 min-h-[36px]"
              >
                {activeContexts.map((ctx) => (
                  <option key={ctx.id} value={ctx.id}>{ctx.label}</option>
                ))}
              </select>
            </div>

            {!mappingValid && (
              <div className="flex items-center gap-2 text-amber-500 text-sm mb-4">
                <AlertTriangle className="h-4 w-4" />
                <span>Map at least Date, Description, and Amount (or Debit/Credit) to continue</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="outline"
                onClick={resetCsvImport}
                className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 min-h-[44px]">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="flex-1" />
              <Button type="button"
                onClick={proceedToReview}
                disabled={!mappingValid}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px] disabled:opacity-50">
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // ─── Step 3: Review & Categorize ───
    if (step === 'review') {
      const allIncluded = parsedRows.every((r) => r.included);
      const noneIncluded = parsedRows.every((r) => !r.included);

      return (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="text-sm text-slate-300">
                <span className="font-semibold text-amber-500">{selectedRows.length}</span> transactions selected
                <span className="text-slate-500 ml-2">
                  ({selectedIncome.length} income, {selectedExpenses.length} expenses)
                </span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => toggleAll(true)}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${allIncluded ? 'text-slate-600' : 'text-amber-500 hover:text-amber-400'}`}>
                  Select all
                </button>
                <button type="button" onClick={() => toggleAll(false)}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${noneIncluded ? 'text-slate-600' : 'text-amber-500 hover:text-amber-400'}`}>
                  Deselect all
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {parsedRows.map((row, idx) => {
              const cats = getCategoriesForType(row.type);
              return (
                <div key={idx}
                  className={`bg-slate-900 border rounded-xl p-3 transition-colors ${
                    row.duplicate ? 'border-amber-500/40' :
                    !row.category ? 'border-amber-500/20' :
                    'border-slate-800'
                  } ${!row.included ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => toggleRow(idx)}
                      className={`flex-shrink-0 h-5 w-5 rounded border flex items-center justify-center ${
                        row.included ? 'bg-amber-500 border-amber-500' : 'border-slate-600 bg-transparent'
                      }`}>
                      {row.included && (
                        <svg className="h-3 w-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                    <span className="text-xs text-slate-500 w-16 flex-shrink-0">{row.date}</span>
                    <span className="text-sm text-slate-200 flex-1 min-w-0 truncate">{row.description}</span>
                    <span className={`text-sm font-semibold flex-shrink-0 ${
                      row.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {row.type === 'income' ? '+' : '-'}{fmt(row.amount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 ml-8">
                    <select
                      value={row.category}
                      onChange={(e) => updateCategory(idx, e.target.value)}
                      className={`bg-slate-800 border rounded-lg px-2 py-1 text-xs text-white focus:border-amber-500 min-h-[28px] ${
                        !row.category ? 'border-amber-500/50' : 'border-slate-700'
                      }`}
                    >
                      <option value="">Uncategorized</option>
                      {cats.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {row.duplicate && (
                      <span className="text-xs text-amber-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Possible duplicate
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline"
              onClick={() => setStep('map')}
              className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 min-h-[44px]">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex-1" />
            <Button type="button"
              onClick={() => importMutation.mutate()}
              disabled={selectedRows.length === 0 || importMutation.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px] disabled:opacity-50">
              {importMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Importing...</>
              ) : (
                <>Import {selectedRows.length} Transactions</>
              )}
            </Button>
          </div>
        </div>
      );
    }

    // ─── Step 4: Done ───
    if (step === 'done') {
      return (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-100 mb-2">Import Complete</h2>
            <p className="text-sm text-slate-400 mb-6">
              Successfully imported {importingCount} transactions from {fileName}
            </p>
            <div className="flex gap-3 justify-center">
              <button type="button" onClick={() => onNavigateTab?.('transactions')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors min-h-[44px]">
                View Transactions
              </button>
              <button type="button" onClick={resetToModeSelector}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 transition-colors min-h-[44px]">
                Import Another
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // ═══════════════════════════════════════════════════
  // PDF MODE
  // ═══════════════════════════════════════════════════
  if (mode === 'pdf') {
    // ─── PDF Step 1: Upload ───
    if (pdfStep === 'upload') {
      return (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-100">Import SELCO Statement</h2>
              </div>
              <button type="button" onClick={resetToModeSelector} className="text-sm text-slate-400 hover:text-amber-500 transition-colors flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Upload a SELCO Credit Union PDF statement. Transactions will be automatically extracted and parsed.
            </p>

            <div
              onDrop={handlePdfDrop}
              onDragOver={handlePdfDragOver}
              onDragLeave={handlePdfDragLeave}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                pdfDragging ? 'border-amber-500 bg-amber-500/5' : 'border-slate-700 hover:border-amber-500/50'
              }`}
              onClick={() => !pdfLoading && pdfInputRef.current?.click()}
            >
              {pdfLoading ? (
                <>
                  <Loader2 className="h-12 w-12 text-amber-500 animate-spin mx-auto mb-4" />
                  <p className="text-sm text-slate-300">Processing PDF...</p>
                  <p className="text-xs text-slate-500 mt-1">Extracting text and parsing transactions</p>
                </>
              ) : (
                <>
                  <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-sm text-slate-300 mb-2">
                    Drag & drop a PDF statement here
                  </p>
                  <p className="text-xs text-slate-500 mb-4">or</p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors min-h-[44px]"
                  >
                    <Upload className="h-4 w-4" />
                    Browse Files
                  </button>
                </>
              )}
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  handlePdfFile(e.target.files?.[0]);
                  if (e.target) e.target.value = '';
                }}
                disabled={pdfLoading}
              />
            </div>
            <p className="text-xs text-slate-500 mt-3">Accepts .pdf files only. SELCO Credit Union statements. All processing is done locally in your browser.</p>

            {pdfError && (
              <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-400 font-medium">Parse Error</p>
                  <p className="text-xs text-red-400/80 mt-1">{pdfError}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ─── PDF Step 2: Review & Categorize ───
    if (pdfStep === 'review') {
      const allIncluded = pdfParsedTxns.every((r) => r.included);
      const noneIncluded = pdfParsedTxns.every((r) => !r.included);

      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" />
                <h2 className="text-base font-bold text-slate-100">
                  Review Transactions
                </h2>
              </div>
              <span className="text-xs text-slate-500">{pdfFileName} — {formatStatementMonth(pdfStatementMonth)}</span>
            </div>

            {/* Context selector */}
            <div className="mb-3">
              <Label className="text-slate-400 text-xs">Which account is this from?</Label>
              <select
                value={pdfContext}
                onChange={(e) => setPdfContext(e.target.value)}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 min-h-[36px]"
              >
                {activeContexts.map((ctx) => (
                  <option key={ctx.id} value={ctx.id}>{ctx.label}</option>
                ))}
              </select>
            </div>

            {/* Summary bar */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="text-sm text-slate-300">
                <span className="font-semibold text-amber-500">{pdfSelectedRows.length}</span> transactions selected
                <span className="text-slate-500 ml-2">
                  ({pdfSelectedDeposits.length} deposits, {pdfSelectedWithdrawals.length} withdrawals)
                </span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => toggleAllPdf(true)}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${allIncluded ? 'text-slate-600' : 'text-amber-500 hover:text-amber-400'}`}>
                  Select all
                </button>
                <button type="button" onClick={() => toggleAllPdf(false)}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${noneIncluded ? 'text-slate-600' : 'text-amber-500 hover:text-amber-400'}`}>
                  Deselect all
                </button>
              </div>
            </div>
          </div>

          {/* Transaction rows */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {pdfParsedTxns.map((row, idx) => {
              const cats = getCategoriesForType(row.type);
              return (
                <div key={idx}
                  className={`bg-slate-900 border rounded-xl p-3 transition-colors ${
                    row.duplicate ? 'border-amber-500/40' :
                    !row.category ? 'border-amber-500/20' :
                    'border-slate-800'
                  } ${!row.included ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <button type="button" onClick={() => togglePdfRow(idx)}
                      className={`flex-shrink-0 h-5 w-5 rounded border flex items-center justify-center ${
                        row.included ? 'bg-amber-500 border-amber-500' : 'border-slate-600 bg-transparent'
                      }`}>
                      {row.included && (
                        <svg className="h-3 w-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>

                    {/* Date */}
                    <span className="text-xs text-slate-500 w-16 flex-shrink-0">{row.date}</span>

                    {/* Description */}
                    <span className="text-sm text-slate-200 flex-1 min-w-0 truncate">
                      {row.cleaned_description || row.description}
                    </span>

                    {/* Transaction type badge */}
                    {row.transaction_type && row.transaction_type !== 'other' && (
                      <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded flex-shrink-0">
                        {TXN_TYPE_LABELS[row.transaction_type] || row.transaction_type}
                      </span>
                    )}

                    {/* Amount */}
                    <span className={`text-sm font-semibold flex-shrink-0 ${
                      row.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {row.type === 'income' ? '+' : '-'}{fmt(row.absAmount)}
                    </span>
                  </div>

                  {/* Category + duplicate warning */}
                  <div className="flex items-center gap-2 mt-2 ml-8">
                    <select
                      value={row.category}
                      onChange={(e) => updatePdfCategory(idx, e.target.value)}
                      className={`bg-slate-800 border rounded-lg px-2 py-1 text-xs text-white focus:border-amber-500 min-h-[28px] ${
                        !row.category ? 'border-amber-500/50' : 'border-slate-700'
                      }`}
                    >
                      <option value="">Uncategorized</option>
                      {cats.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {row.duplicate && (
                      <span className="text-xs text-amber-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Possible duplicate
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nav */}
          <div className="flex gap-3">
            <Button type="button" variant="outline"
              onClick={() => {
                resetPdfImport();
              }}
              className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 min-h-[44px]">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex-1" />
            <Button type="button"
              onClick={() => pdfImportMutation.mutate()}
              disabled={pdfSelectedRows.length === 0 || pdfImportMutation.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px] disabled:opacity-50">
              {pdfImportMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Importing...</>
              ) : (
                <>Import {pdfSelectedRows.length} Transactions</>
              )}
            </Button>
          </div>
        </div>
      );
    }

    // ─── PDF Step 3: Done ───
    if (pdfStep === 'done') {
      return (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-100 mb-2">Import Complete</h2>
            <p className="text-sm text-slate-400 mb-6">
              Imported {pdfImportingCount} transactions from {formatStatementMonth(pdfStatementMonth)}
            </p>
            <div className="flex gap-3 justify-center">
              <button type="button" onClick={() => onNavigateTab?.('transactions')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors min-h-[44px]">
                View Transactions
              </button>
              <button type="button" onClick={resetToModeSelector}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 transition-colors min-h-[44px]">
                Import Another
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
}
