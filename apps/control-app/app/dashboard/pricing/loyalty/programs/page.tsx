'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition } from '@samatransport/ui';

// Define the LoyaltyProgram type based on your table structure and expected joined data
export interface LoyaltyProgram {
  id: string; // BIGINT from DB, string in JS
  name: string;
  description?: string | null;
  points_per_currency_unit_spent?: number | null;
  base_currency_code_for_points?: string | null; // This will be just the code or the joined object
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  earning_rule_type?: 'PER_CURRENCY_UNIT_SPENT' | 'PER_TRANSACTION' | 'PER_ITEM_QUANTITY';
  fixed_points_per_transaction?: number | null;
  points_per_item?: number | null;
  item_unit_description?: string | null;
  // Joined data for currency - assuming it might still be nested under base_currency_code_for_points
  // if the earning rule is PER_CURRENCY_UNIT_SPENT and the Supabase query returns it as an object.
  // Or, it could be directly `currencies` if that's how the query is structured.
  // For flexibility, we'll primarily rely on base_currency_code_for_points being either string or object.
  // It seems the query returns the joined currency object directly replacing the FK field:
  // `base_currency_code_for_points:currencies(code, name, symbol)`
  // So, `base_currency_code_for_points` can be `string` (if not joined/null) or an object.
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function LoyaltyProgramsPage() {
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const router = useRouter();

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    setFeedback(null); // Clear previous feedback on new fetch
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-programs`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch loyalty programs: ${response.status}`);
      }
      const data: LoyaltyProgram[] = await response.json();
      // The join alias in the Edge Function is base_currency_code_for_points:currencies(...)
      // So, data will have an object at programs.base_currency_code_for_points if join is successful, not programs.currencies
      // Let's adjust the interface or ensure the backend returns it as `currencies` if preferred.
      // For now, assuming the backend returns it as specified in the Edge Function:
      // `base_currency_code_for_points:currencies(code, name, symbol)`
      // So, the data structure will be like: { ..., base_currency_code_for_points: {code: 'USD', name: 'US Dollar', symbol: '$'}, ...}
      // Or if the FK field itself is replaced by the object: { ..., base_currency_code_for_points: 'USD', currencies: {code: 'USD', ...} }
      // The current Edge function (as per task 11) returns:
      // `select('*, base_currency_code_for_points:currencies(code, name, symbol)')`
      // This means the `base_currency_code_for_points` field itself becomes the object.
      setPrograms(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
      console.error("Error fetching loyalty programs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const handleDelete = async (programId: string) => {
    setFeedback(null);
    if (window.confirm('Are you sure you want to delete this loyalty program? All associated tiers and rewards will also be deleted.')) {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-programs?id=${programId}`, {
          method: 'DELETE',
        });
        const responseData = response.status === 204 ? { message: 'Loyalty program deleted successfully!' } : await response.json();
        if (!response.ok && response.status !== 204) {
          throw new Error(responseData.error || responseData.message || `Failed to delete loyalty program: ${response.status}`);
        }
        setFeedback({ type: 'success', message: responseData.message || 'Loyalty program deleted successfully!' });
        fetchPrograms(); // Refresh the list
      } catch (err: any) {
        setFeedback({ type: 'error', message: `Error deleting program: ${err.message}` });
        console.error("Error deleting loyalty program:", err);
      }
    }
  };

  const columns: ColumnDefinition<LoyaltyProgram>[] = [
    { header: 'Name', accessor: 'name' },
    {
      header: 'Points Rule',
      accessor: (row) => {
        const ruleType = row.earning_rule_type || 'PER_CURRENCY_UNIT_SPENT'; // Default for older data
        if (ruleType === 'PER_CURRENCY_UNIT_SPENT') {
          const currencyData = typeof row.base_currency_code_for_points === 'object'
            ? row.base_currency_code_for_points
            : { code: row.base_currency_code_for_points }; // Handle case where it's just a string code
          return `${row.points_per_currency_unit_spent || 0} pts / ${currencyData?.code || 'N/A'}`;
        }
        if (ruleType === 'PER_TRANSACTION') {
          return `${row.fixed_points_per_transaction || 0} pts / transaction`;
        }
        if (ruleType === 'PER_ITEM_QUANTITY') {
          return `${row.points_per_item || 0} pts / ${row.item_unit_description || 'item'}`;
        }
        return 'N/A';
      }
    },
    {
      header: 'Rule Details', // Changed from 'Base Currency' to be more generic
      accessor: (row) => {
        const ruleType = row.earning_rule_type || 'PER_CURRENCY_UNIT_SPENT';
        if (ruleType === 'PER_CURRENCY_UNIT_SPENT') {
           const currencyData = typeof row.base_currency_code_for_points === 'object'
            ? row.base_currency_code_for_points
            : null; // If it's just a string, we might not have name/symbol here.
          return currencyData
            ? `${currencyData.name} (${currencyData.symbol || currencyData.code})`
            : (typeof row.base_currency_code_for_points === 'string' ? row.base_currency_code_for_points : 'N/A');
        }
        if (ruleType === 'PER_ITEM_QUANTITY' && row.item_unit_description) {
          return `Unit: ${row.item_unit_description}`;
        }
        return 'N/A';
      }
    },
    { header: 'Active', accessor: (row) => (row.is_active ? 'Yes' : 'No') },
    {
      header: 'Actions',
      accessor: (row) => (
        <div style={{display: 'flex', gap: '5px'}}>
          <Button onClick={() => router.push(`/dashboard/pricing/loyalty/programs/${row.id}/edit`)} >
            Edit
          </Button>
          <Button onClick={() => router.push(`/dashboard/pricing/loyalty/programs/${row.id}/tiers`)} >
            Manage Tiers
          </Button>
          <Button onClick={() => handleDelete(row.id)} style={{ background: 'red' }}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <p>Loading loyalty programs...</p>;

  return (
    <>
      <PageHeader
        title="Loyalty Programs"
        actions={
          <Link href="/dashboard/pricing/loyalty/programs/new" passHref>
            <Button>New Loyalty Program</Button>
          </Link>
        }
      />
      {feedback && (
        <div style={{
          padding: '10px', margin: '10px 0', borderRadius: '4px',
          border: `1px solid ${feedback.type === 'success' ? 'green' : 'red'}`,
          background: feedback.type === 'success' ? '#e6fffa' : '#ffebeb',
          color: feedback.type === 'success' ? 'green' : 'red',
        }}>
          {feedback.message}
        </div>
      )}
      {error && !loading && <p style={{ color: 'red' }}>Error loading loyalty programs: {error}</p>}
      {!loading && !error && <DataTable data={programs} columns={columns} />}
    </>
  );
}
