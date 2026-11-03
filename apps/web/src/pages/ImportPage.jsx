import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { useNavigate } from 'react-router-dom';

export function ImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiRequest('/accounts'),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiRequest('/categories'),
  });
  const [pasteText, setPasteText] = useState(
    'Alert: Rs. 1,499.00 debited from HDFC Bank A/C ending 4321 to Netflix. Ref: HDFC998877. Avl bal: Rs. 24,000\n\n' +
    'Paid Rs. 350 to Starbucks Coffee successfully via PhonePe. Txn ID: P24110499\n\n' +
    'Dear SBI User, your A/C 9876 has been debited by Rs 850.00 by transfer to Swiggy Ref No SBI123456.'
  );

  const [importId, setImportId] = useState(null);
  const [redactedText, setRedactedText] = useState('');
  const [extractedItems, setExtractedItems] = useState([]);

  // Paste parse mutation
  const parseMutation = useMutation({
    mutationFn: (text) =>
      apiRequest('/imports/paste', {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
    onSuccess: (data) => {
      setImportId(data.import_id);
      setRedactedText(data.redactedText);
      setExtractedItems(data.items);
    },
  });

  // CSV upload mutation
  const uploadCsvMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('headroom_token');
      const res = await fetch('/api/imports/csv', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error('CSV upload failed');
      return res.json();
    },
    onSuccess: (data) => {
      setImportId(data.import_id);
      setExtractedItems(data.items);
    },
  });

  // Confirm mutation
  const confirmMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/imports/${importId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          items: extractedItems,
          idempotency_key: `confirm_${importId}_${Date.now()}`,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['projection'] });
      navigate('/ledger');
    },
  });

  const handleActionChange = (index, newAction) => {
    const updated = [...extractedItems];
    updated[index].action = newAction;
    setExtractedItems(updated);
  };

  const handleFieldChange = (index, field, value) => {
    const updated = [...extractedItems];
    updated[index][field] = value;
    setExtractedItems(updated);
  };

  const activeCount = extractedItems.filter(
    (i) => i.action === 'create' || i.action === 'update'
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-black">
        <div>
          <h1 className="text-3xl font-bold tracking-tight lowercase">smart import</h1>
          <p className="text-sm text-ink-500 lowercase mt-1">
            paste sms or upload bank statements — review items before ledger confirmation
          </p>
        </div>
      </div>

      {/* Two-Column Review Layout (Design System 9.8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Raw Input & Monospace Redacted Text */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Card title="paste bank or upi sms">
            <textarea
              className="w-full h-44 p-3 bg-ground border-2 border-black text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-primary"
              placeholder="Paste one or several SMS messages here..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />

            <div className="flex items-center justify-between mt-3">
              <label className="text-xs font-medium underline cursor-pointer lowercase">
                <span>or upload csv</span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadCsvMutation.mutate(e.target.files[0])}
                />
              </label>

              <Button
                variant="primary"
                size="small"
                onClick={() => parseMutation.mutate(pasteText)}
                disabled={parseMutation.isPending}
              >
                {parseMutation.isPending ? 'extracting...' : 'extract transactions'}
              </Button>
            </div>
          </Card>

          {/* Monospace Redacted Preview (Design System 9.8) */}
          {redactedText && (
            <Card title="pii-redacted preview (sent to parser)">
              <div className="bg-black text-white p-3 font-mono text-[11px] whitespace-pre-wrap max-h-60 overflow-y-auto border-2 border-black">
                {redactedText}
              </div>
              <p className="text-[10px] text-ink-500 mt-2 lowercase">
                phone numbers, card numbers, and otps are visibly masked before processing.
              </p>
            </Card>
          )}
        </div>

        {/* Right Column: Stacked Extracted Cards */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-black">
            <h3 className="text-xl font-bold lowercase">
              extracted candidates ({extractedItems.length})
            </h3>
            <span className="text-xs text-ink-500 lowercase font-mono">
              {activeCount} marked to apply
            </span>
          </div>

          {extractedItems.length === 0 ? (
            <div className="p-12 border-2 border-black bg-surface text-center flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 border-2 border-black bg-ground" />
              <span className="text-sm font-medium lowercase">
                paste bank text on the left and tap extract transactions.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {extractedItems.map((item, idx) => {
                const isLowConfidence = item.confidence < 0.6;
                const isDebit = item.direction === 'debit';

                return (
                  <div
                    key={idx}
                    className={`p-4 bg-surface border-2 border-black rounded-0 flex flex-col gap-3 relative ${
                      isLowConfidence ? 'border-l-8 border-l-yellow-primary' : ''
                    } ${item.action === 'skip' || item.action === 'discard' ? 'opacity-50' : ''}`}
                  >
                    {/* Top Row: Merchant, Amount, Action Tag */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            item.action === 'create'
                              ? 'blue'
                              : item.action === 'update'
                              ? 'yellow'
                              : 'default'
                          }
                        >
                          {item.action}
                        </Badge>
                        <span className="text-sm font-semibold lowercase">
                          {item.merchant || 'Unknown Merchant'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-base font-mono font-bold ${
                            isDebit ? 'text-red-primary' : 'text-blue-primary'
                          }`}
                        >
                          {isDebit ? '-' : '+'}₹{Number(item.amount).toLocaleString()}
                        </span>

                        {/* Action selector */}
                        <select
                          className="h-8 px-2 text-xs border-2 border-black bg-white lowercase cursor-pointer"
                          value={item.action}
                          onChange={(e) => handleActionChange(idx, e.target.value)}
                        >
                          <option value="create">create</option>
                          <option value="update">update</option>
                          <option value="skip">skip (duplicate)</option>
                          <option value="discard">discard</option>
                        </select>
                      </div>
                    </div>

                    {/* Editable Details */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-ink-500 lowercase block">merchant</span>
                        <input
                          type="text"
                          className="w-full h-8 px-2 border border-black bg-ground text-xs font-medium"
                          value={item.merchant || ''}
                          onChange={(e) => handleFieldChange(idx, 'merchant', e.target.value)}
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-ink-500 lowercase block">amount</span>
                        <input
                          type="number"
                          className="w-full h-8 px-2 border border-black bg-ground text-xs font-mono font-bold text-right"
                          value={item.amount || ''}
                          onChange={(e) => handleFieldChange(idx, 'amount', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-ink-500 lowercase block">ref / upi</span>
                        <span className="font-mono text-xs text-ink-700 block truncate mt-1">
                          {item.bank_reference || 'none'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-ink-500 lowercase block">account</span>
                        <select
                          required
                          className="w-full h-8 px-2 border border-black bg-ground text-xs"
                          value={item.account_id || ''}
                          onChange={(e) => {
                            const account = accounts.find((a) => String(a.id) === e.target.value);
                            handleFieldChange(idx, 'account_id', account ? account.id : null);
                            handleFieldChange(idx, 'currency', account?.currency || item.currency);
                          }}
                        >
                          <option value="">select account</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>{account.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="text-[10px] text-ink-500 lowercase block">category</span>
                        <select
                          className="w-full h-8 px-2 border border-black bg-ground text-xs"
                          value={item.category_id || ''}
                          onChange={(e) => handleFieldChange(idx, 'category_id', e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">uncategorized</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {item.reason && (
                      <span className="text-[10px] text-ink-500 lowercase italic">
                        {item.reason}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Action Bar (Design System 9.8) */}
      {extractedItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t-2 border-black px-6 md:px-12 flex items-center justify-between z-40">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold lowercase">
              {activeCount} of {extractedItems.length} items ready to commit
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="default"
              onClick={() => setExtractedItems([])}
            >
              discard all
            </Button>
            <Button
              variant="primary"
              size="default"
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending || activeCount === 0}
            >
              {confirmMutation.isPending ? 'confirming...' : `confirm ${activeCount} items`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
