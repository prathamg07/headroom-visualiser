import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { PlusIcon, SearchIcon } from '../components/common/Icons.jsx';
import { DateTime } from 'luxon';

export function LedgerPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDirection, setSelectedDirection] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for new manual transaction
  const [form, setForm] = useState({
    account_id: '',
    amount: '',
    direction: 'debit',
    category_id: '',
    merchant: '',
    description: '',
    posted_at: DateTime.now().toISODate(),
  });

  // Query transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', searchTerm, selectedDirection],
    queryFn: () => {
      let url = '/transactions?';
      if (searchTerm) url += `q=${encodeURIComponent(searchTerm)}&`;
      if (selectedDirection) url += `direction=${selectedDirection}&`;
      return apiRequest(url);
    },
  });

  // Query accounts & categories for the dropdowns
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiRequest('/accounts'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiRequest('/categories'),
  });

  // Create transaction mutation
  const createMutation = useMutation({
    mutationFn: (newTx) =>
      apiRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify(newTx),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['projection'] });
      setShowAddModal(false);
      setForm({
        account_id: '',
        amount: '',
        direction: 'debit',
        category_id: '',
        merchant: '',
        description: '',
        posted_at: DateTime.now().toISODate(),
      });
    },
  });

  // Void transaction mutation
  const voidMutation = useMutation({
    mutationFn: (id) =>
      apiRequest(`/transactions/${id}/void`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['projection'] });
    },
  });

  // Group transactions by date
  const groupedByDate = transactions.reduce((groups, tx) => {
    const dateKey = DateTime.fromISO(tx.posted_at).toISODate();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(tx);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => (a < b ? 1 : -1));

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!form.account_id || !form.amount) return;
    const targetAccount = accounts.find((a) => a.id === parseInt(form.account_id, 10));

    createMutation.mutate({
      account_id: parseInt(form.account_id, 10),
      amount: parseFloat(form.amount),
      currency: targetAccount?.currency || 'INR',
      direction: form.direction,
      category_id: form.category_id ? parseInt(form.category_id, 10) : null,
      merchant: form.merchant,
      description: form.description,
      posted_at: new Date(form.posted_at).toISOString(),
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-black">
        <div>
          <h1 className="text-3xl font-bold tracking-tight lowercase">ledger</h1>
          <p className="text-sm text-ink-500 lowercase mt-1">
            all historical posted cash and card movements
          </p>
        </div>

        <Button variant="primary" size="large" onClick={() => setShowAddModal(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          add transaction
        </Button>
      </div>

      {/* Filter and Search Bar (Design System 10.3) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-surface border-2 border-black">
        <div className="flex-1 min-w-[240px] relative">
          <Input
            placeholder="search merchant, food, rent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <SearchIcon className="w-5 h-5 absolute left-3 top-3.5 text-ink-500" />
        </div>

        <div className="flex items-center gap-2">
          {['', 'debit', 'credit'].map((dir) => (
            <button
              key={dir}
              onClick={() => setSelectedDirection(dir)}
              className={`h-12 px-4 text-xs font-mono font-medium border-2 border-black lowercase transition-none cursor-pointer ${
                selectedDirection === dir ? 'bg-black text-white' : 'bg-white text-black hover:bg-ground'
              }`}
            >
              {dir === '' ? 'all directions' : dir}
            </button>
          ))}
        </div>
      </div>

      {/* Date-Grouped Transaction List (Design System 10.3 & 9.3) */}
      <div className="border-2 border-black bg-surface">
        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono lowercase text-ink-500">
            loading ledger...
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 border-2 border-black bg-ground" />
            <span className="text-sm font-medium lowercase">no transactions match your filters.</span>
          </div>
        ) : (
          sortedDates.map((dateKey) => {
            const txs = groupedByDate[dateKey];
            const netForDay = txs.reduce((sum, t) => {
              if (t.voided_at) return sum;
              const amt = Number(t.amount);
              return sum + (t.direction === 'credit' ? amt : -amt);
            }, 0);

            return (
              <div key={dateKey}>
                {/* 32px Date Bar */}
                <div className="h-8 bg-ground px-4 flex items-center justify-between border-b-2 border-black border-t-2 border-black first:border-t-0 text-xs font-medium lowercase text-ink-700">
                  <span>{DateTime.fromISO(dateKey).toFormat('cccc, d LLL yyyy').toLowerCase()}</span>
                  <span className="font-mono font-bold">
                    net: {netForDay >= 0 ? '+' : ''}₹{netForDay.toLocaleString()}
                  </span>
                </div>

                {/* Rows for that date (56px row per Design System 9.3) */}
                {txs.map((tx) => {
                  const isVoided = Boolean(tx.voided_at);
                  const isDebit = tx.direction === 'debit';
                  const symbol = tx.currency === 'INR' ? '₹' : '$';

                  return (
                    <div
                      key={tx.id}
                      className={`h-14 px-4 border-b border-ink-300 last:border-b-0 flex items-center justify-between hover:bg-ground transition-none ${
                        isVoided ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* 12px Category color circle */}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 border border-black"
                          style={{ backgroundColor: tx.category_color || '#888' }}
                        />
                        <div>
                          <span
                            className={`text-sm font-medium lowercase block ${
                              isVoided ? 'line-through' : ''
                            }`}
                          >
                            {tx.merchant || tx.description || 'Transaction'}
                          </span>
                          <span className="text-[10px] text-ink-500 lowercase block">
                            {tx.account_name} · {tx.category_name || 'Uncategorized'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span
                          className={`text-sm font-mono font-bold text-right tabular-nums ${
                            isVoided
                              ? 'line-through text-ink-500'
                              : isDebit
                              ? 'text-red-primary'
                              : 'text-blue-primary'
                          }`}
                        >
                          {isDebit ? '-' : '+'}
                          {symbol}
                          {Number(tx.amount).toLocaleString()}
                        </span>

                        {!isVoided && (
                          <button
                            onClick={() => voidMutation.mutate(tx.id)}
                            className="text-[10px] text-ink-500 hover:text-red-primary underline lowercase cursor-pointer"
                          >
                            void
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface border-2 border-black rounded-0 p-8 max-w-lg w-full">
            <h3 className="text-2xl font-bold lowercase mb-6 pb-2 border-b-2 border-black">
              add transaction
            </h3>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium lowercase">direction</label>
                  <select
                    className="h-12 px-3 border-2 border-black bg-white lowercase text-sm"
                    value={form.direction}
                    onChange={(e) => setForm({ ...form, direction: e.target.value })}
                  >
                    <option value="debit">debit (expense)</option>
                    <option value="credit">credit (income)</option>
                  </select>
                </div>

                <Input
                  label="amount"
                  isNumeric
                  required
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium lowercase">account</label>
                <select
                  required
                  className="h-12 px-3 border-2 border-black bg-white lowercase text-sm"
                  value={form.account_id}
                  onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                >
                  <option value="">select account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="merchant / payee"
                required
                placeholder="e.g. Swiggy, Uber, Campus Store"
                value={form.merchant}
                onChange={(e) => setForm({ ...form, merchant: e.target.value })}
              />

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium lowercase">category</label>
                <select
                  className="h-12 px-3 border-2 border-black bg-white lowercase text-sm"
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                  <option value="">select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.is_fixed ? '(fixed cost)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="date"
                type="date"
                value={form.posted_at}
                onChange={(e) => setForm({ ...form, posted_at: e.target.value })}
              />

              <div className="flex justify-end gap-3 pt-4 border-t-2 border-black mt-2">
                <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                  cancel
                </Button>
                <Button variant="primary" type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'saving...' : 'save transaction'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
