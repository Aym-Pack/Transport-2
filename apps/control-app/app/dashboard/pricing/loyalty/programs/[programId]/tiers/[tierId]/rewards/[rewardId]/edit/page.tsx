'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, SelectOption, Button } from '@samatransport/ui';
import { LoyaltyRewardForm, LoyaltyRewardFormData } from '../components/LoyaltyRewardForm';
import Link from 'next/link';

// Define types for related data
interface Program { id: string; name: string; }
interface Tier { id: string; name: string; loyalty_program_id: string;}
interface Currency { code: string; name: string; symbol?: string | null; }
interface RouteInfo { id: string; name: string; }
interface VehicleTypeInfo { id: string; name: string; }

// Reward data as returned by API for editing
interface LoyaltyRewardAPIResponse extends LoyaltyRewardFormData {
  id: string;
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function EditLoyaltyRewardPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.programId as string;
  const tierId = params.tierId as string;
  const rewardId = params.rewardId as string;

  const [initialData, setInitialData] = useState<Partial<LoyaltyRewardFormData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | string[] | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error'; message: string | string[] } | null>(null);

  const [programName, setProgramName] = useState<string>('');
  const [tierName, setTierName] = useState<string>('');
  const [currenciesList, setCurrenciesList] = useState<SelectOption[]>([]);
  const [routesList, setRoutesList] = useState<SelectOption[]>([]);
  const [vehicleTypesList, setVehicleTypesList] = useState<SelectOption[]>([]);

  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [parentDataError, setParentDataError] = useState<string|null>(null);


  const fetchRewardAndRelatedData = useCallback(async () => {
    if (!programId || !tierId || !rewardId) return;
    setLoadingData(true);
    setFormError(null);
    setSubmissionStatus(null);
    setNotFound(false);
    setParentDataError(null);

    try {
      const [rewardRes, programRes, tierRes, currenciesRes, routeRes, vehicleTypeRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-rewards?id=${rewardId}`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-programs?id=${programId}`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-tiers?id=${tierId}`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-currencies`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-routes`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicle-types`),
      ]);

      if (!rewardRes.ok) {
        if (rewardRes.status === 404) { setNotFound(true); throw new Error('Loyalty Reward not found.'); }
        const errorData = await rewardRes.json();
        throw new Error(errorData.error || 'Failed to fetch loyalty reward data');
      }
      const rewardData: LoyaltyRewardAPIResponse = await rewardRes.json();
      if (rewardData.loyalty_tier_id.toString() !== tierId) {
          setNotFound(true); // Or a different error indicating mismatch
          throw new Error('Reward does not belong to the specified tier.');
      }
      // Form expects dates as YYYY-MM-DDTHH:mm and other fields as is or string versions
      setInitialData({
        ...rewardData,
        // valid_from and valid_until are handled by form's useEffect via initialData.valid_from.slice(0,16)
      });

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
      console.error("Error fetching data:", error);
       if (!notFound) { // Only set formError if it's not a "not found" error that's handled by the notFound state
        setFormError(error.message);
        setSubmissionStatus({ type: 'error', message: error.message });
      }
    } finally {
      setLoadingData(false);
    }
  }, [programId, tierId, rewardId, notFound]);

  useEffect(() => {
    fetchRewardAndRelatedData();
  }, [fetchRewardAndRelatedData]);

  const handleUpdateReward = async (data: Omit<LoyaltyRewardFormData, 'id' | 'loyalty_tier_id'>) => {
    setIsSaving(true);
    setFormError(null);
    setSubmissionStatus(null);
    try {
      // loyalty_tier_id is not part of the payload for update
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-rewards?id=${rewardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const responseData = await response.json();
      if (!response.ok) {
        const message = Array.isArray(responseData.errors) ? responseData.errors : (responseData.error || 'Failed to update loyalty reward');
        throw { type: 'validation', messages: message };
      }
      setSubmissionStatus({ type: 'success', message: 'Loyalty reward updated successfully!' });
      // Optionally update initialData or allow navigation back
    } catch (error: any) {
      console.error("Error updating loyalty reward:", error);
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

  if (loadingData) return <p>Loading reward data...</p>;
  if (notFound) return (
    <>
      <PageHeader title="Edit Loyalty Reward" />
      <p>Loyalty Reward not found or does not belong to this tier/program.</p>
      <Link href={`/dashboard/pricing/loyalty/programs/${programId}/tiers/${tierId}/rewards`} passHref><Button>Back to Rewards List</Button></Link>
    </>
  );
  if (formError && !initialData && !submissionStatus?.message) return (
    <>
      <PageHeader title="Edit Loyalty Reward" />
      <p style={{ color: 'red' }}>Error loading data: {formError}</p>
      <Link href={`/dashboard/pricing/loyalty/programs/${programId}/tiers/${tierId}/rewards`} passHref><Button>Back to Rewards List</Button></Link>
    </>
  );
  if (!initialData) return <p>Loyalty Reward data could not be loaded.</p>;

  const pageTitle = `Edit Reward: ${initialData?.name || ''} (Tier: ${tierName}, Program: ${programName})`;

  return (
    <>
      <PageHeader title={pageTitle} />
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
        initialData={initialData}
        onSubmit={handleUpdateReward}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        // tierId={tierId}
        currenciesList={currenciesList}
        routesList={routesList}
        vehicleTypesList={vehicleTypesList}
      />
    </>
  );
}
