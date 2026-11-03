import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { PlusIcon, SettleIcon } from '../components/common/Icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function GroupsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddSplit, setShowAddSplit] = useState(false);

  const [newGroupName, setNewGroupName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Split form
  const [splitForm, setSplitForm] = useState({
    label: '',
    total: '',
    notes: '',
  });

  // Query groups
  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => apiRequest('/groups'),
  });

  const activeGroupId = selectedGroupId || (groups[0] ? groups[0].group_id : null);

  // Query single group details
  const { data: groupDetail } = useQuery({
    queryKey: ['group', activeGroupId],
    queryFn: () => apiRequest(`/groups/${activeGroupId}`),
    enabled: Boolean(activeGroupId),
  });

  // Query splits
  const { data: splits = [] } = useQuery({
    queryKey: ['splits', activeGroupId],
    queryFn: () => apiRequest(`/groups/${activeGroupId}/splits`),
    enabled: Boolean(activeGroupId),
  });

  // Query settle-up suggestions
  const { data: settleUp } = useQuery({
    queryKey: ['settle-up', activeGroupId],
    queryFn: () => apiRequest(`/groups/${activeGroupId}/settle-up`),
    enabled: Boolean(activeGroupId),
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: (name) =>
      apiRequest('/groups', {
        method: 'POST',
        body: JSON.stringify({ name, base_currency: user?.base_currency || 'INR' }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setSelectedGroupId(data.id);
      setShowCreateGroup(false);
      setNewGroupName('');
    },
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: (join_code) =>
      apiRequest('/groups/join', {
        method: 'POST',
        body: JSON.stringify({ join_code }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setJoinCodeInput('');
    },
  });

  // Add split mutation
  const addSplitMutation = useMutation({
    mutationFn: (payload) =>
      apiRequest(`/groups/${activeGroupId}/splits`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splits', activeGroupId] });
      queryClient.invalidateQueries({ queryKey: ['settle-up', activeGroupId] });
      setShowAddSplit(false);
      setSplitForm({ label: '', total: '', notes: '' });
    },
  });

  // Record settlement mutation
  const recordSettlementMutation = useMutation({
    mutationFn: (transfer) =>
      apiRequest(`/groups/${activeGroupId}/settlements`, {
        method: 'POST',
        body: JSON.stringify({
          from_user: parseInt(transfer.from_user, 10),
          to_user: parseInt(transfer.to_user, 10),
          amount: transfer.amount,
          currency: groupDetail?.base_currency || 'INR',
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settle-up', activeGroupId] });
      queryClient.invalidateQueries({ queryKey: ['splits', activeGroupId] });
    },
  });

  const handleSplitSubmit = (e) => {
    e.preventDefault();
    if (!splitForm.label || !splitForm.total || !groupDetail?.members?.length) return;

    const totalAmt = parseFloat(splitForm.total);
    const members = groupDetail.members;
    const equalShare = parseFloat((totalAmt / members.length).toFixed(2));

    const shares = members.map((m, idx) => ({
      user_id: m.user_id,
      // Adjust last share for rounding
      share:
        idx === members.length - 1
          ? parseFloat((totalAmt - equalShare * (members.length - 1)).toFixed(2))
          : equalShare,
    }));

    addSplitMutation.mutate({
      paid_by: user.id,
      label: splitForm.label,
      total: totalAmt,
      currency: groupDetail.base_currency || 'INR',
      posted_at: new Date().toISOString(),
      shares,
      notes: splitForm.notes,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-black">
        <div>
          <h1 className="text-3xl font-bold tracking-tight lowercase">shared expenses & settle-up</h1>
          <p className="text-sm text-ink-500 lowercase mt-1">
            split trip and roommate expenses — settle in the minimum number of transfers
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="default" onClick={() => setShowCreateGroup(true)}>
            new group
          </Button>
        </div>
      </div>

      {/* Main Grid: Groups Sidebar (4 cols) & Detail View (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Groups List */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <Card title="your groups">
            {groups.length === 0 ? (
              <p className="text-xs text-ink-500 lowercase">no shared groups yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {groups.map((g) => (
                  <button
                    key={g.group_id}
                    onClick={() => setSelectedGroupId(g.group_id)}
                    className={`p-3 text-left border-2 border-black rounded-0 transition-none cursor-pointer flex items-center justify-between ${
                      activeGroupId === g.group_id ? 'bg-black text-white' : 'bg-surface hover:bg-ground text-black'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-sm lowercase block">{g.group_name}</span>
                      <span className="text-[10px] opacity-75 font-mono lowercase block">
                        code: {g.join_code}
                      </span>
                    </div>
                    <span className="text-xs font-mono lowercase opacity-75">{g.role}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Join with code box */}
            <div className="mt-4 pt-4 border-t-2 border-black flex flex-col gap-2">
              <span className="text-xs font-medium lowercase">join existing group</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="join code"
                  className="h-10 px-2 border-2 border-black text-xs font-mono uppercase flex-1"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                />
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => joinGroupMutation.mutate(joinCodeInput)}
                  disabled={!joinCodeInput.trim() || joinGroupMutation.isPending}
                >
                  join
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Group Detail & Settle Up */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {groupDetail ? (
            <>
              {/* Top Banner */}
              <div className="p-6 bg-surface border-2 border-black flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold lowercase">{groupDetail.name}</h2>
                  <p className="text-xs text-ink-500 lowercase mt-1 font-mono">
                    invite code: <strong className="text-black font-bold">{groupDetail.join_code}</strong> · {groupDetail.members?.length} members
                  </p>
                </div>

                <Button variant="primary" size="default" onClick={() => setShowAddSplit(true)}>
                  <PlusIcon className="w-5 h-5 mr-1" />
                  add expense
                </Button>
              </div>

              {/* Settle-up Card (Design System 9.9) */}
              <Card title="settle-up (minimum transfers)">
                {settleUp?.transfers?.length === 0 ? (
                  <p className="text-xs text-ink-500 lowercase">
                    all balances are settled up. nobody owes money!
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-ink-500 lowercase">
                      {settleUp?.count} transfers will zero out all group balances:
                    </p>

                    {settleUp?.transfers?.map((t, idx) => (
                      <div
                        key={idx}
                        className="h-14 px-4 bg-ground border-2 border-black flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <SettleIcon className="w-5 h-5 text-blue-primary" />
                          <span className="font-medium lowercase">
                            <strong className="font-semibold text-black">{t.from_name}</strong> pays{' '}
                            <strong className="font-semibold text-black">{t.to_name}</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-sm">
                            ₹{t.amount.toLocaleString()}
                          </span>

                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => recordSettlementMutation.mutate(t)}
                          >
                            record
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Split History (Design System 9.7) */}
              <Card title="expense history">
                {splits.length === 0 ? (
                  <p className="text-xs text-ink-500 lowercase">no expenses logged yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {splits.map((s) => (
                      <div
                        key={s.id}
                        className="h-14 px-4 border-b border-ink-300 last:border-b-0 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          {/* 32px Circle avatar */}
                          <div className="w-8 h-8 rounded-full bg-black text-white text-[11px] font-bold flex items-center justify-center uppercase">
                            {s.label.slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-semibold lowercase block">{s.label}</span>
                            <span className="text-[10px] text-ink-500 lowercase block">
                              split across {s.shares?.length} members
                            </span>
                          </div>
                        </div>

                        <span className="font-mono font-bold text-sm">
                          ₹{Number(s.total).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          ) : (
            <div className="p-12 border-2 border-black bg-surface text-center">
              <span className="text-sm font-medium lowercase">select or create a group to view balances.</span>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface border-2 border-black rounded-0 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold lowercase mb-4 pb-2 border-b-2 border-black">
              create new group
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createGroupMutation.mutate(newGroupName);
              }}
              className="flex flex-col gap-4"
            >
              <Input
                label="group name"
                required
                placeholder="e.g. Goa Trip, Apartment 4B"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-4 border-t-2 border-black">
                <Button variant="secondary" onClick={() => setShowCreateGroup(false)}>
                  cancel
                </Button>
                <Button variant="primary" type="submit" disabled={!newGroupName.trim()}>
                  create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Split Modal */}
      {showAddSplit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface border-2 border-black rounded-0 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold lowercase mb-4 pb-2 border-b-2 border-black">
              add group expense
            </h3>
            <form onSubmit={handleSplitSubmit} className="flex flex-col gap-4">
              <Input
                label="description"
                required
                placeholder="e.g. Dinner at Cafe, Grocery run"
                value={splitForm.label}
                onChange={(e) => setSplitForm({ ...splitForm, label: e.target.value })}
              />
              <Input
                label="total amount"
                type="number"
                step="0.01"
                isNumeric
                required
                placeholder="0.00"
                value={splitForm.total}
                onChange={(e) => setSplitForm({ ...splitForm, total: e.target.value })}
              />
              <p className="text-xs text-ink-500 lowercase">
                this expense will be split equally across all {groupDetail?.members?.length} members.
              </p>
              <div className="flex justify-end gap-2 pt-4 border-t-2 border-black">
                <Button variant="secondary" onClick={() => setShowAddSplit(false)}>
                  cancel
                </Button>
                <Button variant="primary" type="submit">
                  record split
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
