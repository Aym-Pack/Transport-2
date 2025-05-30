'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, SelectOption, Button } from '@samatransport/ui';
import { LoyaltyRewardForm, LoyaltyRewardFormData } from '../components/LoyaltyRewardForm';
import Link from 'next/link';

// Define types for related data
interface Program { id: string; name: string; }
interface Tier { id: string; name: string; loyalty_program_id: string; }
interface Currency { code: string; name: string; symbol?: string | null; }
interface RouteInfo { id: string; name: string; } // Renamed to avoid conflict with NextRouter.Route
interface VehicleTypeInfo { id: string; name: string; } // Renamed

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function NewLoyaltyRewardPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.programId as string;
  const tierId = params.tierId as string;

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | string[] | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error'; message: string | string[] } | null>(null);

  const [programName, setProgramName] = useState<string>('');
  const [tierName, setTierName] = useState<string>('');
  const [currenciesList, setCurrenciesList] = useState<SelectOption[]>([]);
  const [routesList, setRoutesList] = useState<SelectOption[]>([]);
  const [vehicleTypesList, setVehicleTypesList] = useState<SelectOption[]>([]);
  const [loadingRelatedData, setLoadingRelatedData] = useState(true);
  const [parentDataError, setParentDataError] = useState<string|null>(null);


  const fetchRelatedData = useCallback(async () => {
    if (!programId || !tierId) return;
    setLoadingRelatedData(true);
    setFormError(null);
    setSubmissionStatus(null);
    setParentDataError(null);

    try {
      const [programRes, tierRes, currenciesRes, routeRes, vehicleTypeRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-programs?id=${programId}`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-tiers?id=${tierId}`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-currencies`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-routes`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicle-types`),
      ]);

      if (!programRes.ok) throw new Error('Failed to fetch program details.');
      const programData: Program = await programRes.json();
      setProgramName(programData.name);

      if (!tierRes.ok) throw new Error('Failed to fetch tier details.');
      const tierData: Tier = await tierRes.json();
      if (tierData.loyalty_program_id.toString() !== programId) throw new Error('Tier does not belong to this program.');
      setTierName(tierData.name);

      if (!currenciesRes.ok) throw new Error('Failed to fetch currencies');
      const currenciesData: Currency[] = await currenciesRes.json();
      setCurrenciesList(currenciesData.map(c => ({ value: c.code, label: `${c.name} (${c.symbol || c.code})` })));

      if (!routeRes.ok) throw new Error('Failed to fetch routes');
      const routesData: RouteInfo[] = await routeRes.json();
      setRoutesList(routesData.map(r => ({ value: r.id, label: r.name })));

      if (!vehicleTypeRes.ok) throw new Error('Failed to fetch vehicle types');
      const vehicleTypesData: VehicleTypeInfo[] = await vehicleTypeRes.json();
      setVehicleTypesList(vehicleTypesData.map(vt => ({ value: vt.id, label: vt.name })));

    } catch (error: any) {
      console.error("Error fetching related data:", error);
      setParentDataError('Failed to load required data for the form: ' + error.message);
    } finally {
      setLoadingRelatedData(false);
    }
  }, [programId, tierId]);

  useEffect(() => {
    fetchRelatedData();
  }, [fetchRelatedData]);

  const handleCreateReward = async (data: Omit<LoyaltyRewardFormData, 'id' | 'loyalty_tier_id'>) => {
    setIsSaving(true);
    setFormError(null);
    setSubmissionStatus(null);

    const payload = {
      ...data,
      loyalty_tier_id: BigInt(tierId), // Add tierId and convert to BigInt
    };

    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-rewards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();
      if (!response.ok) {
        const message = Array.isArray(responseData.errors) ? responseData.errors : (responseData.error || 'Failed to create loyalty reward');
        throw { type: 'validation', messages: message };
      }
      setSubmissionStatus({ type: 'success', message: 'Loyalty reward created successfully! Redirecting...' });
      setTimeout(() => router.push(`/dashboard/pricing/loyalty/programs/${programId}/tiers/${tierId}/rewards`), 2000);
    } catch (error: any) {
      console.error("Error creating loyalty reward:", error);
      if (error.type === 'validation') {
        setFormError(error.messages);
        setSubmissionStatus({ type: 'error', message: error.messages });
      } else {
        const errorMessage = error.message || 'An unexpected error occurred.';
        setFormError(errorMessage);
        setSubmissionStatus({ type: 'error', message: errorMessage });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/pricing/loyalty/programs/${programId}/tiers/${tierId}/rewards`);
  };

  if (loadingRelatedData) return <p>Loading form dependencies...</p>;
  if (parentDataError) return (
     <>
      <PageHeader title="Create New Reward" />
      <p style={{ color: 'red' }}>{parentDataError}</p>
      <Link href={`/dashboard/pricing/loyalty/programs/${programId}/tiers/${tierId}/rewards`} passHref>
        <Button variant="outline">Back to Rewards List</Button>
      </Link>
    </>
  );


  return (
    <>
      <PageHeader title={tierName ? `Create New Reward for Tier: ${tierName}` : 'Create New Reward'} />
      {submissionStatus && (
        <div style={{
          padding: '10px', marginBottom: '15px', borderRadius: '4px',
          border: `1px solid ${submissionStatus.type === 'success' ? 'green' : 'red'}`,
          background: submissionStatus.type === 'success' ? '#e6fffa' : '#ffebeb',
          color: submissionStatus.type === 'success' ? 'green' : 'red',
        }}>
          {typeof submissionStatus.message === 'string' ? submissionStatus.message : (
             submissionStatus.message.map((msg, idx) => <p key={idx}>{typeof msg === 'object' ? msg.message : msg}</p>)
          )}
        </div>
      )}
      <LoyaltyRewardForm
        onSubmit={handleCreateReward}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        // tierId={tierId} // Pass for context if needed by form, though not directly submitted
        currenciesList={currenciesList}
        routesList={routesList}
        vehicleTypesList={vehicleTypesList}
      />
    </>
  );
}
