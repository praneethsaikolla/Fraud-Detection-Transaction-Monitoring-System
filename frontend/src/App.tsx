import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { ShieldCheck, Activity, Users, AlertTriangle, CreditCard, Clock, Upload } from 'lucide-react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import {
  getAccountHistory,
  getAllAccounts,
  getAlerts,
  getDashboardSummary,
  getMyAccounts,
  getAllUsers,
  adminCreateAccount,
} from '@/services/api';
import ImportPage from '@/pages/ImportPage';



type SummaryData = {
  totalTransactions: number;
  totalAlerts: number;
  totalAccounts: number;
};

type UserItem = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
};

type AlertItem = {
  id: number;
  userId: number;
  transactionId: number;
  status: string;
  description: string;
  riskLevel: string;
  accountHolderName?: string;
  transactionAmount?: number;
};

type AccountItem = {
  id: number;
  accountNumber: string;
  balance: string;
  status: string;
  createdAt: string;
};

type TransactionItem = {
  id: number;
  accountId: number;
  type: string;
  amount: string;
  targetAccountId: number | null;
  status: string;
  timestamp: string;
};

function NotLoggedInPrompt({ message }: { message: string }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-10 text-center shadow-sm">
      <p className="text-xl font-semibold text-slate-900 dark:text-white">{message}</p>
      <p className="mt-4 text-slate-500 dark:text-slate-400">Sign in to access the protected dashboard, alerts, and transaction data.</p>
      <Button size="lg" className="mt-8" onClick={() => navigate('/login')}>
        Go to Login
      </Button>
    </div>
  );
}

function LoadingPanel({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-10 text-center shadow-sm">
      <p className="text-xl font-semibold text-slate-900 dark:text-white">{message}</p>
      <p className="mt-3 text-slate-500 dark:text-slate-400">Loading data from the backend...</p>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="mt-16 text-center animate-in fade-in zoom-in duration-500">
      <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-indigo-100 text-indigo-800 mb-6">
        Enterprise Grade Security v2.0
      </div>
      <h2 className="text-6xl font-extrabold mb-6 tracking-tight text-slate-900 dark:text-white">
        Real-time Transaction <br /> Monitoring System
      </h2>
      <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
        Advanced fraud detection and alert response platform. Fully integrated with Spring Boot, Redis, and PostgreSQL.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Button size="lg" className="h-12 px-8 text-lg" onClick={() => navigate('/dashboard')}>
          Open Dashboard
        </Button>
        <Button size="lg" variant="outline" className="h-12 px-8 text-lg" onClick={() => navigate('/transactions')}>
          View Transactions
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
          <Activity className="w-10 h-10 text-indigo-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Live Monitoring</h3>
          <p className="text-slate-500">Monitor transaction velocity and fraud alerts across accounts in real time.</p>
        </div>
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
          <ShieldCheck className="w-10 h-10 text-rose-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Security-first Workflows</h3>
          <p className="text-slate-500">Manage alert reviews, analyst approvals, and risk scoring from one place.</p>
        </div>
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
          <Users className="w-10 h-10 text-emerald-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Role-based Access</h3>
          <p className="text-slate-500">Configure admin, analyst, and user access to sensitive fraud response data.</p>
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { authState, isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [initialDeposit, setInitialDeposit] = useState<string>('');
  const [createAccountLoading, setCreateAccountLoading] = useState(false);
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);

  const token = authState?.token;
  const roles = authState?.user.roles || [];
  const isAnalystOrAdmin = roles.some((role) => role.includes('ADMIN') || role.includes('ANALYST'));

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    if (isAnalystOrAdmin) {
      Promise.all([getDashboardSummary(token), getAlerts(token)])
        .then(([summaryResponse, alertsResponse]) => {
          setSummary(summaryResponse.data);
          setAlerts(alertsResponse.data);
        })
        .catch((err) => setError(err.message || 'Unable to load dashboard data.'))
        .finally(() => setLoading(false));
    } else {
      getMyAccounts(token)
        .then((accountsResponse) => {
          const accountList = accountsResponse.data;
          setAccounts(accountList);
          if (accountList.length > 0) {
            return getAccountHistory(token, accountList[0].id);
          }
          return null;
        })
        .then((historyResponse) => {
          if (historyResponse) {
            setTransactions(historyResponse.data);
          }
        })
        .catch((err) => setError(err.message || 'Unable to load dashboard data.'))
        .finally(() => setLoading(false));
    }
  }, [token, isAnalystOrAdmin]);

  useEffect(() => {
    if (showCreateAccount && isAnalystOrAdmin && token) {
      getAllUsers(token).then((res) => setUsers(res.data)).catch(console.error);
    }
  }, [showCreateAccount, isAnalystOrAdmin, token]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedUserId || !initialDeposit) return;
    setCreateAccountLoading(true);
    setCreateAccountError(null);
    try {
      await adminCreateAccount(token, Number(selectedUserId), Number(initialDeposit));
      setShowCreateAccount(false);
      setSelectedUserId('');
      setInitialDeposit('');
      // Refresh summary
      const summaryRes = await getDashboardSummary(token);
      setSummary(summaryRes.data);
    } catch (err: any) {
      setCreateAccountError(err.message || 'Failed to create account');
    } finally {
      setCreateAccountLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <NotLoggedInPrompt message="Sign in to access your fraud operations dashboard." />;
  }

  if (loading) {
    return <LoadingPanel message="Loading dashboard" />;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950 p-8 text-center text-rose-900 dark:text-rose-200">
        <p className="text-xl font-semibold">Dashboard error</p>
        <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>
      </div>
    );
  }

  if (isAnalystOrAdmin) {
    return (
      <div className="space-y-10">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-[0.2em]">Dashboard</p>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Fraud Operations Overview</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={() => setShowCreateAccount(true)}>
                Create Account
              </Button>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <Clock className="w-4 h-4" />
                Updated just now
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Transactions</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{summary?.totalTransactions ?? 0}</p>
                </div>
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Open Alerts</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{summary?.totalAlerts ?? 0}</p>
                </div>
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Accounts</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{summary?.totalAccounts ?? 0}</p>
                </div>
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Alerts</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Latest suspicious activity requiring your review.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => {}}>
              Refresh
            </Button>
          </div>
          <div className="space-y-4">
            {alerts.slice(0, 4).map((alert) => (
              <div key={alert.id} className="rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{alert.description}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Alert ID {alert.id} · Transaction {alert.transactionId}</p>
                  </div>
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">{alert.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Admin Create Account Modal */}
        {showCreateAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-950 p-8 shadow-xl">
              <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Create New Account</h2>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Select User</span>
                  <select
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(Number(e.target.value))}
                    className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="" disabled>Select a user...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Initial Deposit (₹)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={initialDeposit}
                    onChange={(e) => setInitialDeposit(e.target.value)}
                    className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    placeholder="e.g. 5000"
                  />
                </label>
                {createAccountError && <p className="text-sm text-rose-500">{createAccountError}</p>}
                <div className="mt-8 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowCreateAccount(false)}>Cancel</Button>
                  <Button type="submit" disabled={createAccountLoading}>
                    {createAccountLoading ? 'Creating...' : 'Create Account'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  } else {
    return (
      <div className="space-y-10">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-[0.2em]">Dashboard</p>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Your Accounts</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Clock className="w-4 h-4" />
            Updated just now
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Accounts</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Accounts linked to your user profile.</p>
            </div>
          </div>
          {accounts.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No accounts found. Create an account in the backend or sign in as a user with existing accounts.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {accounts.map((account) => (
                <div key={account.id} className="rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 p-5">
                  <p className="text-sm text-slate-500">{account.accountNumber}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">${account.balance}</p>
                  <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span>{account.status}</span>
                    <span>{new Date(account.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Transactions</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Transaction history for your primary account.</p>
            </div>
          </div>
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No transaction history available for your account yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600 dark:divide-slate-800 dark:text-slate-300">
                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Txn ID</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                      <td className="px-4 py-4 font-medium text-slate-900 dark:text-slate-100">TXN-{txn.id}</td>
                      <td className="px-4 py-4">{txn.type}</td>
                      <td className="px-4 py-4">${txn.amount}</td>
                      <td className="px-4 py-4">{txn.status}</td>
                      <td className="px-4 py-4">{new Date(txn.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
    );
  }
}

function TransactionsPage() {
  const { authState, isAuthenticated } = useAuth();
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = authState?.token;
  const roles = authState?.user.roles || [];
  const isAdminOrAnalyst = roles.some((role) => role.includes('ADMIN') || role.includes('ANALYST'));

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const accountsPromise = isAdminOrAnalyst ? getAllAccounts(token) : getMyAccounts(token);
    accountsPromise
      .then((accountsResponse) => {
        setAccounts(accountsResponse.data);
        if (accountsResponse.data.length > 0) {
          setSelectedAccountId(accountsResponse.data[0].id);
          return getAccountHistory(token, accountsResponse.data[0].id);
        }
        return null;
      })
      .then((txnResponse) => {
        if (txnResponse) {
          setTransactions(txnResponse.data);
        }
      })
      .catch((err) => setError(err.message || 'Unable to load transactions.'))
      .finally(() => setLoading(false));
  }, [token, isAdminOrAnalyst]);

  useEffect(() => {
    if (!token || selectedAccountId === null) return;
    getAccountHistory(token, selectedAccountId)
      .then((response) => setTransactions(response.data))
      .catch((err) => setError(err.message || 'Unable to load transaction history.'));
  }, [token, selectedAccountId]);

  if (!isAuthenticated) {
    return <NotLoggedInPrompt message="Sign in to review transactions." />;
  }

  if (loading) {
    return <LoadingPanel message="Loading transactions" />;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950 p-8 text-center text-rose-900 dark:text-rose-200">
        <p className="text-xl font-semibold">Transactions error</p>
        <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-500 uppercase tracking-[0.2em]">Transactions</p>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Transaction history</h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <CreditCard className="w-4 h-4" />
          Showing transactions for account {selectedAccountId ?? '–'}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Account selection</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Switch between accounts to inspect their transaction history.</p>
          </div>
          <select
            className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            value={selectedAccountId ?? ''}
            onChange={(event) => setSelectedAccountId(Number(event.target.value))}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.accountNumber} — ${account.balance}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600 dark:divide-slate-800 dark:text-slate-300">
            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Txn ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                  <td className="px-4 py-4 font-medium text-slate-900 dark:text-slate-100">TXN-{txn.id}</td>
                  <td className="px-4 py-4">{txn.type}</td>
                  <td className="px-4 py-4">${txn.amount}</td>
                  <td className="px-4 py-4">{txn.status}</td>
                  <td className="px-4 py-4">{new Date(txn.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AlertsPage() {
  const { authState, isAuthenticated } = useAuth();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = authState?.token;
  const roles = authState?.user.roles || [];
  const isAnalystOrAdmin = roles.some((role) => role.includes('ADMIN') || role.includes('ANALYST'));

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    getAlerts(token)
      .then((response) => setAlerts(response.data))
      .catch((err) => setError(err.message || 'Unable to load alerts.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (!isAuthenticated) {
    return <NotLoggedInPrompt message="Sign in to access fraud alerts." />;
  }

  if (!isAnalystOrAdmin) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-10 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Restricted access</h2>
        <p className="mt-3 text-slate-500 dark:text-slate-400">Alerts are only available to analyst and admin users.</p>
      </div>
    );
  }

  if (loading) return <LoadingPanel message="Loading alerts" />;

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950 p-8 text-center text-rose-900 dark:text-rose-200">
        <p className="text-xl font-semibold">Alerts error</p>
        <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>
      </div>
    );
  }

  const riskConfig: Record<string, { bg: string; text: string; border: string; dot: string; icon: string }> = {
    CRITICAL: { bg: 'bg-red-50 dark:bg-red-950/40',   text: 'text-red-700 dark:text-red-300',   border: 'border-red-200 dark:border-red-800',    dot: 'bg-red-500',    icon: '🔴' },
    HIGH:     { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800',  dot: 'bg-rose-500',  icon: '🟠' },
    MEDIUM:   { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500', icon: '🟡' },
    LOW:      { bg: 'bg-blue-50 dark:bg-blue-950/40',  text: 'text-blue-700 dark:text-blue-300',  border: 'border-blue-200 dark:border-blue-800',   dot: 'bg-blue-400',  icon: '🔵' },
  };

  const statusConfig: Record<string, { bg: string; text: string }> = {
    OPEN:           { bg: 'bg-red-100 dark:bg-red-900/40',    text: 'text-red-700 dark:text-red-200' },
    REVIEWING:      { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-200' },
    RESOLVED:       { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-200' },
    FALSE_POSITIVE: { bg: 'bg-slate-100 dark:bg-slate-800',   text: 'text-slate-600 dark:text-slate-300' },
  };

  const countBy = (key: string, val: string) =>
    alerts.filter((a) => (a as Record<string, unknown>)[key] === val).length;

  const openCount     = countBy('status', 'OPEN');
  const reviewCount   = countBy('status', 'REVIEWING');
  const criticalCount = countBy('riskLevel', 'CRITICAL');
  const highCount     = countBy('riskLevel', 'HIGH');

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-slate-500 uppercase tracking-[0.2em]">Security Operations</p>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Fraud Alerts</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Real-time suspicious activity flagged by the fraud detection engine.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-red-100 dark:bg-red-900/30 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
          Live monitoring active
        </div>
      </div>

      {/* ── Summary stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Alerts',   value: alerts.length, color: 'text-slate-900 dark:text-white',          sub: 'all time' },
          { label: 'Open',           value: openCount,     color: 'text-red-600 dark:text-red-400',          sub: 'need action' },
          { label: 'Under Review',   value: reviewCount,   color: 'text-amber-600 dark:text-amber-400',      sub: 'in progress' },
          { label: 'Critical / High',value: criticalCount + highCount, color: 'text-rose-600 dark:text-rose-400', sub: 'high priority' },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-5 shadow-sm">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Alert cards ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {alerts.map((alert) => {
          const a = alert as AlertItem & { ruleTriggered?: string; createdAt?: string };
          const risk   = riskConfig[a.riskLevel]   ?? riskConfig['LOW'];
          const status = statusConfig[a.status] ?? statusConfig['OPEN'];

          // rule_triggered comes as ruleTriggered from Jackson camelCase
          const ruleLine: string = a.ruleTriggered ?? a.description ?? 'Rule details unavailable';
          // Split "RULE_CODE: explanation" into title + body
          const colonIdx  = ruleLine.indexOf(':');
          const ruleCode  = colonIdx > 0 ? ruleLine.slice(0, colonIdx).trim() : 'RULE_TRIGGERED';
          const ruleBody  = colonIdx > 0 ? ruleLine.slice(colonIdx + 1).trim() : ruleLine;

          return (
            <div key={alert.id} className={`rounded-3xl border ${risk.border} ${risk.bg} p-5 shadow-sm`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Left: rule info */}
                <div className="flex gap-4 items-start flex-1 min-w-0">
                  <div className={`mt-1 w-3 h-3 rounded-full shrink-0 ${risk.dot} shadow-lg`}></div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`font-mono text-xs font-bold tracking-widest uppercase ${risk.text}`}>
                        {ruleCode}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${status.bg} ${status.text}`}>
                        {a.status.replace('_', ' ')}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${risk.bg} ${risk.text} border ${risk.border}`}>
                        {risk.icon} {a.riskLevel}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {ruleBody}
                    </p>
                    <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                      Alert #{alert.id} · Transaction #{a.transactionId}
                      {a.createdAt ? ` · ${new Date(a.createdAt).toLocaleString('en-IN')}` : ''}
                      {a.accountHolderName ? ` · User: ${a.accountHolderName}` : ''}
                      {a.transactionAmount ? ` · Amount: ₹${a.transactionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : ''}
                    </p>
                  </div>
                </div>

                {/* Right: action button */}
                <div className="flex gap-2 sm:flex-col sm:items-end shrink-0">
                  {a.status === 'OPEN' && (
                    <Button size="sm" variant="default">
                      Investigate
                    </Button>
                  )}
                  {a.status === 'REVIEWING' && (
                    <Button size="sm" variant="secondary">
                      In Review
                    </Button>
                  )}
                  {a.status === 'RESOLVED' && (
                    <Button size="sm" variant="outline">
                      Resolved ✓
                    </Button>
                  )}
                  {a.status === 'FALSE_POSITIVE' && (
                    <Button size="sm" variant="ghost">
                      False Positive
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {alerts.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-12 text-center shadow-sm">
            <p className="text-xl font-semibold text-slate-900 dark:text-white">No alerts</p>
            <p className="mt-2 text-slate-500 dark:text-slate-400">The fraud engine has not flagged any suspicious activity.</p>
          </div>
        )}
      </div>
    </div>
  );
}


function LoginPage() {
  const { authState, isAuthenticated, login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-10 shadow-sm">
      <div className="mb-8 text-center">
        <p className="text-sm text-slate-500 uppercase tracking-[0.2em]">Secure access</p>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Sign in to FraudGuard</h1>
      </div>

      {isAuthenticated && authState ? (
        <div className="space-y-4">
          <p className="text-slate-500 dark:text-slate-400">Logged in as {authState.user.email}.</p>
          <div className="flex gap-3 flex-col sm:flex-row">
            <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
            <Button variant="outline" onClick={logout}>Logout</Button>
          </div>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm text-slate-600 dark:text-slate-400">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600 dark:text-slate-400">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
            <Button variant="outline" type="button" className="w-full h-12 text-lg" onClick={() => navigate('/')}>Back to Home</Button>
          </div>
        </form>
      )}
    </div>
  );
}

function App() {
  const { authState, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const userLabel = useMemo(() => {
    if (!authState) return 'Guest';
    return authState.user.firstName || authState.user.email;
  }, [authState]);

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans">
      <header className="p-4 px-8 flex flex-col gap-4 md:flex-row md:justify-between md:items-center bg-white dark:bg-slate-900 border-b shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">FraudGuard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isAuthenticated ? `Signed in as ${userLabel}` : 'Not signed in'}
            </p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-2 items-center">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>Dashboard</Button>
          <Button variant="ghost" onClick={() => navigate('/transactions')}>Transactions</Button>
          <Button variant="ghost" onClick={() => navigate('/alerts')}>Alerts</Button>
          <Button variant="ghost" onClick={() => navigate('/import')}><Upload className="w-4 h-4 mr-1" />Import PDF</Button>
          {isAuthenticated ? (
            <Button
              variant="destructive"
              className="ml-0 md:ml-4"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          ) : (
            <Button
              variant="default"
              className="ml-0 md:ml-4"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
          )}
        </nav>
      </header>

      <main className="p-8 max-w-6xl mx-auto">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/import" element={<ImportPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <AuthProvider>
      <Router>
        <App />
      </Router>
    </AuthProvider>
  );
}
