import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';

// ── types ──────────────────────────────────────────────────────────────────
type ParsedTransaction = {
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  amount: number;
  description: string;
  date: string;
};

type ImportResult = {
  success: boolean;
  description: string;
  amount: number;
  error?: string;
};

// ── helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract raw text from every page of a PDF file using pdf.js.
 * We load pdf.js dynamically so it doesn't bloat the initial bundle.
 */
async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');

  // Use the locally bundled worker (copied to /public during build)
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    // Group text items by their Y coordinate to reconstruct true lines
    const lineMap = new Map<number, { str: string, x: number }[]>();
    
    for (const item of content.items as any[]) {
      if (!item.str || !item.transform) continue;
      
      const y = Math.round(item.transform[5]);
      const x = Math.round(item.transform[4]);
      
      // Group items on the same horizontal line (with 2px tolerance)
      let foundY = y;
      for (const existingY of lineMap.keys()) {
        if (Math.abs(existingY - y) <= 2) {
          foundY = existingY;
          break;
        }
      }
      
      if (!lineMap.has(foundY)) {
        lineMap.set(foundY, []);
      }
      lineMap.get(foundY)!.push({ str: item.str, x });
    }
    
    // Sort Y descending (PDFs usually render bottom-up, so highest Y is top of page)
    const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
    
    for (const y of sortedY) {
      // Sort text on this line from left to right
      const lineItems = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      
      // Join with space, and clean up excessive spaces
      const lineText = lineItems.map(i => i.str).join(' ').replace(/\s{2,}/g, ' ');
      fullText += lineText.trim() + '\n';
    }
  }
  return fullText;
}

/**
 * Heuristic parser: scan lines for common bank-statement patterns.
 * Recognises rows like:
 *   01/05/2025  CREDIT  Salary payment        50,000.00
 *   2025-05-10  DR      ATM withdrawal          1,500.00
 *   May 15      debit   Amazon.in                 899.00
 */
function parseBankStatementText(text: string): ParsedTransaction[] {
  const results: ParsedTransaction[] = [];

  // Amount pattern: numbers with optional commas and a decimal part
  const amountRe = /[\d,]+\.\d{2}/g;

  // Keywords to classify direction
  const creditKeywords = /\b(credit|cr|deposit|salary|received|refund|cashback|inward|neft cr|imps cr|upi cr)\b/i;
  const debitKeywords  = /\b(debit|dr|withdrawal|atm|purchase|payment|paid|outward|neft dr|imps dr|upi dr|transfer)\b/i;
  const transferKeys   = /\b(transfer|neft|rtgs|imps|upi)\b/i;

  // Date pattern variations: dd/mm/yyyy, yyyy-mm-dd, "Jan 01 2025", "01 Jan"
  const dateRe = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2}|[A-Za-z]{3,9}\s+\d{1,2}(?:,?\s*\d{4})?|\d{1,2}\s+[A-Za-z]{3,9}(?:,?\s*\d{4})?)/;

  const lines = text.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Filter out non-transaction lines like Opening/Closing balances
    if (line.toLowerCase().includes('opening balance') || line.toLowerCase().includes('closing balance')) continue;

    // A transaction row MUST have a date. If no date, skip.
    const dateMatch = line.match(dateRe);
    if (!dateMatch) continue;
    const date = dateMatch[0];

    // Must contain at least one monetary amount
    const amounts = line.match(amountRe);
    if (!amounts) continue;

    // Usually bank statements print the transaction amount followed by the running balance.
    // So if there are multiple amounts, the transaction amount is the second to last.
    // If there is only one amount, it is the transaction amount.
    const amountStr = amounts.length > 1 
      ? amounts[amounts.length - 2].replace(/,/g, '') 
      : amounts[0].replace(/,/g, '');
      
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) continue;

    // Determine type
    let type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' = 'WITHDRAWAL';
    if (creditKeywords.test(line)) {
      type = 'DEPOSIT';
    } else if (transferKeys.test(line) && !creditKeywords.test(line)) {
      type = 'TRANSFER';
    } else if (debitKeywords.test(line)) {
      type = 'WITHDRAWAL';
    }

    // Build a description from the line (strip all amounts & dates)
    let description = line
      .replace(amountRe, '')
      .replace(new RegExp(dateRe.source, 'g'), '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 80);
      
    if (!description) description = `${type} transaction`;

    results.push({ type, amount, description, date });
  }

  return results;
}

// ── component ───────────────────────────────────────────────────────────────

export default function ImportPage() {
  const { authState, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedTransaction[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);

  // ── fetch the user's first account id ────────────────────────────────────
  const token = authState?.token;

  const loadAccountId = async (): Promise<number | null> => {
    if (!token) return null;
    try {
      const res = await fetch('/api/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      const accounts: { id: number }[] = json.data ?? [];
      return accounts[0]?.id ?? null;
    } catch {
      return null;
    }
  };

  // ── file handling ─────────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      setParseError('Please upload a PDF file.');
      return;
    }
    setFileName(file.name);
    setParsed([]);
    setResults(null);
    setParseError(null);
    setParsing(true);

    try {
      const text = await extractPdfText(file);
      const txns = parseBankStatementText(text);
      if (txns.length === 0) {
        setParseError(
          'No transactions could be detected in this PDF. Make sure it is a text-based bank statement (not a scanned image).'
        );
      } else {
        setParsed(txns);
      }
    } catch (err) {
      setParseError(`Failed to parse PDF: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setParsing(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // ── import to backend ─────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!token || parsed.length === 0) return;
    setImporting(true);

    let acId = accountId;
    if (!acId) {
      acId = await loadAccountId();
      setAccountId(acId);
    }

    if (!acId) {
      setParseError('No bank account found. Please create an account first.');
      setImporting(false);
      return;
    }

    const importResults: ImportResult[] = [];

    for (const txn of parsed) {
      try {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: acId,
            type: txn.type,
            amount: txn.amount,
          }),
        });

        if (res.ok) {
          importResults.push({ success: true, description: txn.description, amount: txn.amount });
        } else {
          const json = await res.json().catch(() => ({}));
          importResults.push({
            success: false,
            description: txn.description,
            amount: txn.amount,
            error: json.message ?? `HTTP ${res.status}`,
          });
        }
      } catch (err) {
        importResults.push({
          success: false,
          description: txn.description,
          amount: txn.amount,
          error: err instanceof Error ? err.message : 'Network error',
        });
      }
    }

    setResults(importResults);
    setImporting(false);
  };

  const reset = () => {
    setFileName(null);
    setParsed([]);
    setResults(null);
    setParseError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── not logged in guard ───────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-10 text-center shadow-sm">
        <p className="text-xl font-semibold text-slate-900 dark:text-white">Sign in required</p>
        <p className="mt-3 text-slate-500 dark:text-slate-400">You must be signed in to import transactions.</p>
        <Button className="mt-6" onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    );
  }

  const successCount = results?.filter(r => r.success).length ?? 0;
  const failCount    = results?.filter(r => !r.success).length ?? 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-sm text-slate-500 uppercase tracking-[0.2em]">Import</p>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Bank Statement Import</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Upload a PDF bank statement and we'll automatically detect and import your transactions.
        </p>
      </div>

      {/* ── Step 1 — Upload ──────────────────────────────────────────────── */}
      {!results && (
        <section className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Step 1 — Upload your PDF
          </h2>

          {/* Drop zone */}
          <div
            className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all p-10 cursor-pointer
              ${dragging
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="sr-only"
              onChange={onInputChange}
            />
            {parsing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">Parsing PDF…</p>
              </div>
            ) : fileName ? (
              <div className="flex flex-col items-center gap-3">
                <FileText className="w-10 h-10 text-indigo-500" />
                <p className="font-medium text-slate-800 dark:text-slate-100">{fileName}</p>
                <p className="text-sm text-slate-500">{parsed.length} transactions detected — click to change file</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 pointer-events-none">
                <Upload className="w-10 h-10 text-slate-400" />
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  Drag &amp; drop your bank statement PDF here
                </p>
                <p className="text-sm text-slate-400">or click to browse — PDF files only</p>
              </div>
            )}
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="mt-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-4 flex gap-3 items-start">
              <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700 dark:text-rose-300">{parseError}</p>
            </div>
          )}
        </section>
      )}

      {/* ── Step 2 — Preview ─────────────────────────────────────────────── */}
      {parsed.length > 0 && !results && (
        <section className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Step 2 — Review detected transactions
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {parsed.length} transactions found. Review before importing.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RefreshCw className="w-4 h-4 mr-1" /> Reset
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="min-w-full text-sm text-left text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {parsed.map((txn, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                    <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{txn.date}</td>
                    <td className="px-4 py-3 max-w-xs truncate">{txn.description}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
                        ${txn.type === 'DEPOSIT'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : txn.type === 'TRANSFER'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                        }`}>
                        {txn.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</>
                : <><ArrowRight className="w-4 h-4 mr-2" />Import {parsed.length} Transactions</>
              }
            </Button>
          </div>
        </section>
      )}

      {/* ── Step 3 — Results ─────────────────────────────────────────────── */}
      {results && (
        <section className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Import Results</h2>
            <Button variant="outline" size="sm" onClick={reset}>
              <RefreshCw className="w-4 h-4 mr-1" /> Import another
            </Button>
          </div>

          {/* Summary badges */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">{successCount} imported</span>
            </div>
            {failCount > 0 && (
              <div className="flex items-center gap-2 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 px-4 py-3">
                <XCircle className="w-5 h-5 text-rose-500" />
                <span className="font-semibold text-rose-700 dark:text-rose-300">{failCount} failed</span>
              </div>
            )}
          </div>

          {/* Row-by-row results */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {results.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm
                  ${r.success
                    ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900'
                    : 'bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900'
                  }`}
              >
                {r.success
                  ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-800 dark:text-slate-100 truncate block">
                    {r.description}
                  </span>
                  {!r.success && r.error && (
                    <span className="text-rose-600 dark:text-rose-400 text-xs">{r.error}</span>
                  )}
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                  ₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>

          {failCount > 0 && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Some transactions failed — this usually means your account permissions are set to USER role only.
                Only accounts with ROLE_USER can create transactions via the API.
              </p>
            </div>
          )}

          <Button className="w-full" onClick={() => navigate('/transactions')}>
            View Transactions <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </section>
      )}

      {/* ── Tips ─────────────────────────────────────────────────────────── */}
      {!results && (
        <section className="rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 p-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
            Supported formats
          </h2>
          <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400 list-disc list-inside">
            <li>SBI, HDFC, ICICI, Axis, Kotak, Yes Bank digital statements</li>
            <li>Any PDF containing rows with <strong>date · description · amount</strong></li>
            <li>Must be a <strong>text-based PDF</strong> (not a scanned image/photo)</li>
            <li>Amounts are detected automatically — credit/debit is inferred from keywords</li>
          </ul>
        </section>
      )}
    </div>
  );
}
