'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition } from '@samatransport/ui';

// Define types (consider moving to a shared types file if used across many pages)
interface LoyaltyProgram {
  id: string;
  name: string;
}
export interface LoyaltyTier {
  id: string; // BIGINT from DB, string in JS
  loyalty_program_id: string;
  name: string;
  points_threshold: number;
  description?: string | null;
  tier_order: number;
  created_at?: string;
  updated_at?: string;
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function LoyaltyProgramTiersPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.programId as string;

  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!programId) return;
    setLoading(true);
    setFeedback(null);
    try {
      // Fetch Program Details
      const programRes = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-programs?id=${programId}`);
      if (!programRes.ok) {
        if (programRes.status === 404) throw new Error(`Loyalty Program with ID ${programId} not found.`);
        const errorData = await programRes.json();
        throw new Error(errorData.error || 'Failed to fetch loyalty program details');
      }
      const programData: LoyaltyProgram = await programRes.json();
      setProgram(programData);

      // Fetch Tiers for this Program
      const tiersRes = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-tiers?program_id=${programId}`);
      if (!tiersRes.ok) {
        const errorData = await tiersRes.json();
        throw new Error(errorData.error || 'Failed to fetch loyalty tiers');
      }
      const tiersData: LoyaltyTier[] = await tiersRes.json();
      setTiers(tiersData);

    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (tierId: string) => {
    setFeedback(null);
    if (window.confirm('Are you sure you want to delete this loyalty tier? All associated rewards will also be deleted.')) {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-tiers?id=${tierId}`, {
          method: 'DELETE',
        });
        const responseData = response.status === 204 ? { message: 'Loyalty tier deleted successfully!' } : await response.json();
        if (!response.ok && response.status !== 204) {
          throw new Error(responseData.error || responseData.message || `Failed to delete loyalty tier: ${response.status}`);
        }
        setFeedback({ type: 'success', message: responseData.message || 'Loyalty tier deleted successfully!' });
        fetchData(); // Refresh the list
      } catch (err: any) {
        setFeedback({ type: 'error', message: `Error deleting tier: ${err.message}` });
        console.error("Error deleting loyalty tier:", err);
      }
    }
  };

  const columns: ColumnDefinition<LoyaltyTier>[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Points Threshold', accessor: 'points_threshold' },
    { header: 'Order', accessor: 'tier_order' },
    { header: 'Description', accessor: (row) => row.description || '-' },
    {
      header: 'Actions',
      accessor: (row) => (
        <div style={{display: 'flex', gap: '5px'}}>
          <Button onClick={() => router.push(`/dashboard/pricing/loyalty/programs/${programId}/tiers/${row.id}/edit`)}>
            Edit
          </Button>
          <Button onClick={() => router.push(`/dashboard/pricing/loyalty/programs/${programId}/tiers/${row.id}/rewards`)}>
            Manage Rewards
          </Button>
          <Button onClick={() => handleDelete(row.id)} style={{ background: 'red' }}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <p>Loading loyalty program and tiers data...</p>;

  return (
    <>
      <PageHeader
        title={program ? `Manage Tiers for: ${program.name}` : 'Manage Tiers'}
        actions={
          <>
            <Button onClick={() => router.push(`/dashboard/pricing/loyalty/programs/${programId}/tiers/new`)} style={{ marginRight: '10px' }}>
              New Tier
            </Button>
            <Button onClick={() => router.push('/dashboard/pricing/loyalty/programs')} variant="outline">
              Back to Programs List
            </Button>
          </>
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
      {/* Display specific fetch error for tiers if program loaded but tiers failed */}
      {feedback?.type === 'error' && !tiers.length && <p style={{color: 'red'}}>{feedback.message}</p>}

      {!loading && program && <DataTable data={tiers} columns={columns} />}
      {!loading && !program && feedback?.type !== 'error' && <p>Loyalty program not found or could not be loaded.</p>}
    </>
  );
}
