import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { PlusIcon } from '../components/common/Icons.jsx';

export function BudgetsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    category_id: '',
    amount: '',
    rollover: false,
  });

  const { data: budgetStatus = [], isLoading } = useQuery({
    queryKey: ['budgets-status'],
    queryFn: () => apiRequest('/budgets/status'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiRequest('/categories'),
  });

  const setBudgetMutation = useMutation({
    mutationFn: (payload) =>
      apiRequest(`/budgets/${payload.category_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          amount: parseFloat(payload.amount),
          currency: 'INR',
          rollover: payload.rollover,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets-status'] });
      setShowModal(false);
      setForm({ category_id: '', amount: '', rollover: false });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.category_id || !form.amount) return;
    setBudgetMutation.mutate(form);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-black">
        <div>
          <h1 className="text-3xl font-bold tracking-tight lowercase">category budgets & pace</h1>
          <p className="text-sm text-ink-500 lowercase mt-1">
            track monthly spending against targets and avoid late-month burn spikes
          </p>
        </div>

        <Button variant="primary" size="default" onClick={() => setShowModal(true)}>
          <PlusIcon className="w-5 h-5 mr-1" />
          set budget
        </Button>
      </div>

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-2 p-12 text-center text-xs font-mono lowercase text-ink-500">
            loading budgets...
          </div>
        ) : budgetStatus.length === 0 ? (
          <div className="col-span-2 p-12 border-2 border-black bg-surface text-center flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-2 border-black bg-ground" />
            <span className="text-sm font-medium lowercase">
              no category budgets configured. click set budget above to start.
            </span>
          </div>
        ) : (
          budgetStatus.map((b) => {
            const isOver = b.pct_used >= 100;
            const isCaution = b.pct_used >= 75 && !isOver;

            // Progress bar fill (Design System 8.15)
            let fillClass = 'bg-blue-primary';
            if (isOver) fillClass = 'bg-red-primary';
            else if (isCaution) fillClass = 'bg-yellow-primary';

            return (
              <Card key={b.category_id}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border border-black"
                      style={{ backgroundColor: b.category_color || '#888' }}
                    />
                    <h4 className="font-bold text-base lowercase">{b.category_name}</h4>
                  </div>
                  <span className="text-xs font-mono text-ink-500 lowercase">
                    {b.days_remaining} days left in month
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <div className="text-2xl font-mono font-bold">
                    ₹{b.spent.toLocaleString()}
                    <span className="text-xs text-ink-500 font-normal ml-1">
                      / ₹{b.budget_amount.toLocaleString()}
                    </span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${isOver ? 'text-red-primary' : 'text-black'}`}>
                    {b.pct_used}% used
                  </span>
                </div>

                {/* Bauhaus 8px Progress Bar (Design System 8.15) */}
                <div className="w-full h-2 border-2 border-black bg-ground overflow-hidden relative">
                  <div
                    className={`h-full ${fillClass} transition-none`}
                    style={{ width: `${Math.min(b.pct_used, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-3 text-xs text-ink-700 lowercase">
                  <span>
                    pace: <strong>{b.pace_ratio}x</strong> {b.pace_ratio > 1 ? '(burning fast)' : '(on track)'}
                  </span>
                  <span>
                    remaining: <strong>₹{Math.max(b.remaining, 0).toLocaleString()}</strong>
                  </span>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Set Budget Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface border-2 border-black rounded-0 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold lowercase mb-4 pb-2 border-b-2 border-black">
              set category budget
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium lowercase">category</label>
                <select
                  required
                  className="h-12 px-3 border-2 border-black bg-white lowercase text-sm"
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                  <option value="">select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="monthly target amount"
                type="number"
                step="100"
                isNumeric
                required
                placeholder="5000"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rollover"
                  checked={form.rollover}
                  onChange={(e) => setForm({ ...form, rollover: e.target.checked })}
                  className="w-5 h-5 border-2 border-black rounded-0"
                />
                <label htmlFor="rollover" className="text-xs lowercase cursor-pointer">
                  enable rollover (unused balance adds to next month)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t-2 border-black">
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  cancel
                </Button>
                <Button variant="primary" type="submit">
                  save budget
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
