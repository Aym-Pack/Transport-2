'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition } from '@samatransport/ui';
import { LoyaltyRewardType } from './components/LoyaltyRewardForm'; // Import type

// Define types
interface LoyaltyProgram { id: string; name: string; }
interface LoyaltyTier { id: string; name: string; loyalty_program_id: string; }
export interface LoyaltyReward {
  id: string; // BIGINT from DB, string in JS
  loyalty_tier_id: string;
  name: string;
  description?: string | null;
  reward_type: LoyaltyRewardType;
  reward_value_percentage?: number | null;
  reward_value_fixed_amount?: number | null;
  reward_value_currency_code?: string | null;
  free_trip_route_id?: string | null;
  upgrade_to_vehicle_type_id?: string | null;
  complimentary_item_description?: string | null;
  points_to_redeem?: number | null;
  is_auto_applied_on_tier_achieve: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function LoyaltyTierRewardsPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.programId as string;
  const tierId = params.tierId as string;

  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [tier, setTier] = useState<LoyaltyTier | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!programId || !tierId) return;
    setLoading(true);
    setFeedback(null);
    try {
      // Fetch Program Details (optional, for breadcrumbs/context)
      const programRes = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-programs?id=${programId}`);
      if (programRes.ok) setProgram(await programRes.json());
      else console.warn("Could not fetch program details for breadcrumbs.");


      // Fetch Tier Details
      const tierRes = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-tiers?id=${tierId}`);
      if (!tierRes.ok) {
        if (tierRes.status === 404) throw new Error(`Loyalty Tier with ID ${tierId} not found.`);
        const errorData = await tierRes.json();
        throw new Error(errorData.error || 'Failed to fetch loyalty tier details');
      }
      const tierData: LoyaltyTier = await tierRes.json();
      if (tierData.loyalty_program_id.toString() !== programId) { // Ensure tier belongs to program
          throw new Error("Tier does not belong to the specified program.");
      }
      setTier(tierData);

      // Fetch Rewards for this Tier
      const rewardsRes = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-rewards?tier_id=${tierId}`);
      if (!rewardsRes.ok) {
        const errorData = await rewardsRes.json();
        throw new Error(errorData.error || 'Failed to fetch loyalty rewards');
      }
      const rewardsData: LoyaltyReward[] = await rewardsRes.json();
      setRewards(rewardsData);

    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [programId, tierId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (rewardId: string) => {
    setFeedback(null);
    if (window.confirm('Are you sure you want to delete this loyalty reward?')) {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-rewards?id=${rewardId}`, {
          method: 'DELETE',
        });
        const responseData = response.status === 204 ? { message: 'Loyalty reward deleted successfully!' } : await response.json();
        if (!response.ok && response.status !== 204) {
          throw new Error(responseData.error || responseData.message || `Failed to delete loyalty reward: ${response.status}`);
        }
        setFeedback({ type: 'success', message: responseData.message || 'Loyalty reward deleted successfully!' });
        fetchData(); // Refresh the list
      } catch (err: any) {
        setFeedback({ type: 'error', message: `Error deleting reward: ${err.message}` });
        console.error("Error deleting loyalty reward:", err);
      }
    }
  };

  const getRewardValueDisplay = (row: LoyaltyReward): string => {
    switch(row.reward_type) {
        case 'PERCENTAGE_DISCOUNT_ON_BOOKING': return `${row.reward_value_percentage}%`;
        case 'FIXED_AMOUNT_VOUCHER_ON_BOOKING': return `${row.reward_value_fixed_amount} ${row.reward_value_currency_code}`;
        case 'FREE_TRIP_VOUCHER': return `Route ID: ${row.free_trip_route_id}`; // Consider fetching route name
        case 'UPGRADE_TO_VEHICLE_TYPE': return `Veh. Type ID: ${row.upgrade_to_vehicle_type_id}`; // Consider fetching type name
        case 'COMPLIMENTARY_ITEM_OR_SERVICE': return row.complimentary_item_description || '-';
        default: return '-';
    }
  }

  const columns: ColumnDefinition<LoyaltyReward>[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Type', accessor: 'reward_type' },
    { header: 'Value', accessor: getRewardValueDisplay },
    { header: 'Points to Redeem', accessor: (row) => row.points_to_redeem?.toString() || '-' },
    { header: 'Auto-Applied', accessor: (row) => (row.is_auto_applied_on_tier_achieve ? 'Yes' : 'No') },
    { header: 'Active', accessor: (row) => (row.is_active ? 'Yes' : 'No') },
    {
      header: 'Actions',
      accessor: (row) => (
        <div style={{display: 'flex', gap: '5px'}}>
          <Button onClick={() => router.push(`/dashboard/pricing/loyalty/programs/${programId}/tiers/${tierId}/rewards/${row.id}/edit`)}>
            Edit
          </Button>
          <Button onClick={() => handleDelete(row.id)} style={{ background: 'red' }}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <p>Loading loyalty tier and rewards data...</p>;

  const pageTitle = `Manage Rewards for: ${tier?.name || `Tier ID ${tierId}`} ${program ? `(Program: ${program.name})` : ''}`;

  return (
    <>
      <PageHeader
        title={pageTitle}
        actions={
          <>
            <Button
              onClick={() => router.push(`/dashboard/pricing/loyalty/programs/${programId}/tiers/${tierId}/rewards/new`)}
              style={{ marginRight: '10px' }}
            >
              New Reward
            </Button>
            <Button
              onClick={() => router.push(`/dashboard/pricing/loyalty/programs/${programId}/tiers`)}
              variant="outline"
              style={{ marginRight: '10px' }}
            >
              Back to Tiers List
            </Button>
             <Button
              onClick={() => router.push(`/dashboard/pricing/loyalty/programs`)}
              variant="outline"
            >
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
      {feedback?.type === 'error' && !rewards.length && <p style={{color: 'red'}}>{feedback.message}</p>}

      {!loading && tier && <DataTable data={rewards} columns={columns} />}
      {!loading && !tier && feedback?.type !== 'error' && <p>Loyalty tier not found or could not be loaded.</p>}
    </>
  );
}
