import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api/client.js';
import { HeadroomTile } from '../components/common/HeadroomTile.jsx';
import { CollisionBanner } from '../components/common/CollisionBanner.jsx';
import { HeatmapGrid } from '../components/common/HeatmapGrid.jsx';
import { BurnRateChart } from '../components/common/BurnRateChart.jsx';
import { Card } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Button } from '../components/common/Button.jsx';
import { NavLink } from 'react-router-dom';

export function DashboardPage() {
  const [selectedCurrency, setSelectedCurrency] = useState('INR');

  // Load projection summary
  const { data: projection, isLoading: projLoading } = useQuery({
    queryKey: ['projection', selectedCurrency],
    queryFn: () => apiRequest(`/projection?currency=${selectedCurrency}`),
  });

  // Load accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiRequest('/accounts'),
  });

  // Load transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => apiRequest('/transactions'),
  });

  // Load recurrences
  const { data: recurrences = [] } = useQuery({
    queryKey: ['recurrences'],
    queryFn: () => apiRequest('/recurrences'),
  });

  if (projLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        {/* Bauhaus mechanical loading bar (Design System 8.14) */}
        <div className="w-40 h-1 border-2 border-black overflow-hidden relative bg-white">
          <div className="w-8 h-full bg-black animate-sliding-bar" />
        </div>
        <span className="text-xs font-mono mt-3 lowercase text-ink-500">
          projecting cash position...
        </span>
      </div>
    );
  }

  const currSymbol = selectedCurrency === 'INR' ? '₹' : '$';

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
      {/* Top Header / Currency Selector */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-black">
        <div>
          <h1 className="text-3xl font-bold tracking-tight lowercase">cash-flow overview</h1>
          <p className="text-sm text-ink-500 lowercase mt-1">
            forward forecast for the next 30 days
          </p>
        </div>
        <div className="flex items-center gap-2">
          {['INR', 'USD'].map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCurrency(c)}
              className={`px-3 py-1 text-xs font-mono font-bold border-2 border-black transition-none cursor-pointer ${
                selectedCurrency === c ? 'bg-black text-white' : 'bg-white text-black hover:bg-ground'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Collision Warning Banner */}
      <CollisionBanner collisions={projection?.collisions} />

      {/* Row 1: Headroom Hero Tile (spans 8 cols) + Account Cards (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <HeadroomTile
            headroomDays={projection?.headroomDays ?? 30}
            headroomDate={projection?.headroomDate}
            burnRate={projection?.burnRate ?? 0}
            currency={selectedCurrency}
            horizonDays={30}
          />

          {/* Cash-flow Heatmap */}
          <Card title="30-day cash-flow heatmap">
            <HeatmapGrid
              days={projection?.dailyBalances || []}
              currency={selectedCurrency}
              buffer={projection?.buffer || 2000}
            />
          </Card>
        </div>

        {/* Right Sidebar: Accounts & Actions */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card title="active accounts">
            <div className="flex flex-col gap-3">
              {accounts.length === 0 ? (
                <p className="text-xs text-ink-500">no accounts registered yet.</p>
              ) : (
                accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3 bg-ground border-2 border-black flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm lowercase">{acc.name}</span>
                        <Badge variant="default">{acc.kind}</Badge>
                      </div>
                      <span className="text-[10px] text-ink-500 lowercase">
                        opening: {acc.currency === 'INR' ? '₹' : '$'}{Number(acc.opening_balance).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-base font-mono font-bold text-right">
                      {acc.currency === 'INR' ? '₹' : '$'}
                      {Number(acc.current_balance || acc.opening_balance).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-4 border-t-2 border-black flex gap-2">
              <NavLink to="/import" className="flex-1">
                <Button variant="primary" size="small" className="w-full">
                  import sms/csv
                </Button>
              </NavLink>
              <NavLink to="/ledger" className="flex-1">
                <Button variant="secondary" size="small" className="w-full">
                  view ledger
                </Button>
              </NavLink>
            </div>
          </Card>

          {/* Upcoming Recurring debits */}
          <Card title="upcoming recurring">
            <div className="flex flex-col gap-2">
              {recurrences.length === 0 ? (
                <p className="text-xs text-ink-500">no recurring charges set up.</p>
              ) : (
                recurrences.slice(0, 5).map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between py-2 border-b border-ink-300 text-xs"
                  >
                    <div>
                      <span className="font-medium lowercase">{rec.label}</span>
                      <span className="text-[10px] text-ink-500 block lowercase">
                        {rec.cadence} · {rec.account_name}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        rec.direction === 'credit' ? 'text-blue-primary' : 'text-red-primary'
                      }`}
                    >
                      {rec.direction === 'credit' ? '+' : '-'}
                      {rec.currency === 'INR' ? '₹' : '$'}
                      {Number(rec.amount).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Row 4: Burn Rate Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card title="discretionary burn rate (14-day median)">
            <BurnRateChart
              transactions={transactions}
              medianBurn={projection?.burnRate || 340}
              currency={selectedCurrency}
            />
            <p className="text-xs text-ink-500 mt-4 lowercase">
              calculated as the median of non-fixed daily debits over the last 14 days. outliers
              like rent and bills are excluded.
            </p>
          </Card>
        </div>

        <div className="lg:col-span-4 flex flex-col justify-between p-6 bg-surface border-2 border-black">
          <div>
            <h3 className="text-lg font-medium lowercase mb-2">buffer configuration</h3>
            <p className="text-xs text-ink-500 lowercase mb-4">
              headroom alerts trigger when projected balance drops below your safety buffer.
            </p>
            <div className="p-4 bg-ground border-2 border-black text-center">
              <span className="text-xs text-ink-500 uppercase font-mono">safety buffer</span>
              <div className="text-3xl font-mono font-bold text-ink-900 mt-1">
                {currSymbol}{projection?.buffer?.toLocaleString() || '2,000'}
              </div>
            </div>
          </div>

          <div className="text-xs text-ink-500 pt-4 border-t-2 border-black lowercase">
            headroom status: <strong className="font-semibold text-black">{projection?.headroomDays} days remaining</strong> before buffer violation.
          </div>
        </div>
      </div>
    </div>
  );
}
