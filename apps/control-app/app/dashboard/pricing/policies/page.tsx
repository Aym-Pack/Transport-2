'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition, Select, SelectOption } from '@samatransport/ui';

// Define the PolicyRule type based on your table structure and expected joined data
export interface PolicyRule {
  id: string; // BIGINT from DB, string in JS
  name: string;
  policy_type: 'CANCELLATION' | 'MODIFICATION' | 'REFUND';
  description?: string | null;
  applicable_route_id?: string | null;
  applicable_vehicle_type_id?: string | null;
  applicable_passenger_category?: string | null;
  min_hours_before_departure?: number | null;
  max_hours_before_departure?: number | null;
  fee_type: 'PERCENTAGE_OF_PRICE' | 'FIXED_AMOUNT' | 'NO_FEE';
  fee_value?: number | null;
  is_allowed: boolean;
  notes?: string | null;
  priority: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // Joined data (names)
  routes?: { name: string };
  vehicle_types?: { name: string };
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

const policyTypeFilterOptions: SelectOption[] = [
  { value: '', label: 'All Types' },
  { value: 'CANCELLATION', label: 'Cancellation' },
  { value: 'MODIFICATION', label: 'Modification' },
  { value: 'REFUND', label: 'Refund' },
];

export default function PolicyRulesPage() {
  const [policyRules, setPolicyRules] = useState<PolicyRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null); // For fetch errors
  const [deleteFeedback, setDeleteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const router = useRouter();
  const [filterPolicyType, setFilterPolicyType] = useState<string>('');

  const fetchPolicyRules = useCallback(async (policyType?: string) => {
    setLoading(true);
    setError(null);
    let url = `${SUPABASE_FUNCTIONS_BASE_URL}/crud-policy-rules`;
    const params = new URLSearchParams();
    if (policyType) {
      params.append('policy_type', policyType);
    }
    if (params.toString()) {
        url += `?${params.toString()}`;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch policy rules: ${response.status}`);
      }
      const data: PolicyRule[] = await response.json();
      setPolicyRules(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching policy rules:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicyRules(filterPolicyType);
  }, [fetchPolicyRules, filterPolicyType]);

  const handleDelete = async (ruleId: string) => {
    setDeleteFeedback(null); // Clear previous feedback
    if (window.confirm('Are you sure you want to delete this policy rule?')) {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-policy-rules?id=${ruleId}`, {
          method: 'DELETE',
        });
        const responseData = response.status === 204 ? { message: 'Policy rule deleted successfully!' } : await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || responseData.message || `Failed to delete policy rule: ${response.status}`);
        }

        setDeleteFeedback({ type: 'success', message: responseData.message || 'Policy rule deleted successfully!' });
        fetchPolicyRules(filterPolicyType); // Refresh the list with current filter
      } catch (err: any) {
        setDeleteFeedback({ type: 'error', message: `Error deleting policy rule: ${err.message}` });
        console.error("Error deleting policy rule:", err);
      }
    }
  };

  const columns: ColumnDefinition<PolicyRule>[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Type', accessor: 'policy_type' },
    { header: 'Route', accessor: (row) => row.routes?.name || 'General' },
    { header: 'Veh. Type', accessor: (row) => row.vehicle_types?.name || 'General' },
    { header: 'Fee', accessor: (row) => `${row.fee_type === 'NO_FEE' ? 'No Fee' : (row.fee_value || 0) + (row.fee_type === 'PERCENTAGE_OF_PRICE' ? '%' : '')}` },
    { header: 'Priority', accessor: 'priority' },
    { header: 'Allowed', accessor: (row) => (row.is_allowed ? 'Yes' : 'No') },
    { header: 'Active', accessor: (row) => (row.is_active ? 'Yes' : 'No') },
    {
      header: 'Actions',
      accessor: (row) => (
        <>
          <Button onClick={() => router.push(`/dashboard/pricing/policies/${row.id}/edit`)} style={{ marginRight: '5px' }}>
            Edit
          </Button>
          <Button onClick={() => handleDelete(row.id)} style={{ background: 'red' }}>
            Delete
          </Button>
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Policy Rules Management"
        actions={
          <Link href="/dashboard/pricing/policies/new" passHref>
            <Button>New Policy Rule</Button>
          </Link>
        }
      />
      {deleteFeedback && (
        <div style={{
          padding: '10px',
          margin: '10px 0',
          borderRadius: '4px',
          border: `1px solid ${deleteFeedback.type === 'success' ? 'green' : 'red'}`,
          background: deleteFeedback.type === 'success' ? '#e6fffa' : '#ffebeb',
          color: deleteFeedback.type === 'success' ? 'green' : 'red',
        }}>
          {deleteFeedback.message}
        </div>
      )}
      <div style={{ marginBottom: '1rem', maxWidth: '300px' }}>
        <Select
            label="Filter by Policy Type:"
            options={policyTypeFilterOptions}
            value={filterPolicyType}
            onChange={(e) => setFilterPolicyType(e.target.value)}
            name="filterPolicyType"
        />
      </div>
      {loading && <p>Loading policy rules...</p>}
      {error && <p style={{ color: 'red' }}>Error loading policy rules: {error}</p>}
      {!loading && !error && <DataTable data={policyRules} columns={columns} />}
    </>
  );
}
