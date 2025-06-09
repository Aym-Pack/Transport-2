'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, Button } from '@samatransport/ui';
import { LoyaltyTierForm, LoyaltyTierFormData } from '../components/LoyaltyTierForm';
import Link from 'next/link';

interface LoyaltyProgram {
  id: string;
  name: string;
}
// Tier data as returned by API for editing (omits loyalty_program_id as it's context)
interface LoyaltyTierEditData extends Omit<LoyaltyTierFormData, 'loyalty_program_id'> {
  id: string;
}


const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function EditLoyaltyTierPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.programId as string;
  const tierId = params.tierId as string;

  const [initialData, setInitialData] = useState<Partial<Omit<LoyaltyTierFormData, 'loyalty_program_id'>> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | string[] | null>(null);
  const [programName, setProgramName] = useState<string>('');
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error'; message: string | string[] } | null>(null);


  const fetchTierAndProgramData = useCallback(async () => {
    if (!programId || !tierId) return;
    setLoadingData(true);
    setFormError(null);
    setNotFound(false);
    setSubmissionStatus(null);

    try {
      const [tierRes, programRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-tiers?id=${tierId}`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-programs?id=${programId}`),
      ]);

      if (!tierRes.ok) {
        if (tierRes.status === 404) {
          setNotFound(true);
          throw new Error('Loyalty Tier not found.');
        }
        const errorData = await tierRes.json();
        throw new Error(errorData.error || 'Failed to fetch loyalty tier data');
      }
      const tierData: LoyaltyTierEditData = await tierRes.json();
      // Check if the fetched tier actually belongs to the programId in the URL
      if (tierData.loyalty_program_id && tierData.loyalty_program_id.toString() !== programId) {
          setNotFound(true); // Or a different error indicating mismatch
          throw new Error('Tier does not belong to the specified program.');
      }
      setInitialData(tierData);

      if (!programRes.ok) throw new Error('Failed to fetch loyalty program details');
      const programData: LoyaltyProgram = await programRes.json();
      setProgramName(programData.name);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      if (!notFound) { // Only set formError if it's not a "not found" error that's handled by the notFound state
        setFormError(error.message);
        setSubmissionStatus({ type: 'error', message: error.message });
      }
    } finally {
      setLoadingData(false);
    }
  }, [programId, tierId, notFound]);

  useEffect(() => {
    fetchTierAndProgramData();
  }, [fetchTierAndProgramData]);

  const handleUpdateTier = async (data: Omit<LoyaltyTierFormData, 'id' | 'loyalty_program_id'>) => {
    setIsSaving(true);
    setFormError(null);
    setSubmissionStatus(null);
    try {
      // loyalty_program_id is not part of the payload for update as it shouldn't change
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-tiers?id=${tierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const responseData = await response.json();
      if (!response.ok) {
        const message = Array.isArray(responseData.errors) ? responseData.errors : (responseData.error || 'Failed to update loyalty tier');
        throw { type: 'validation', messages: message };
      }
      setSubmissionStatus({ type: 'success', message: 'Loyalty tier updated successfully!' });
      // Optionally, update initialData or just let user navigate back
      // setTimeout(() => router.push(`/dashboard/pricing/loyalty/programs/${programId}/tiers`), 2000);
    } catch (error: any) {
      console.error("Error updating loyalty tier:", error);
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
    router.push(`/dashboard/pricing/loyalty/programs/${programId}/tiers`);
  };

  if (loadingData) return <p>Loading tier data...</p>;
  if (notFound) return (
    <>
      <PageHeader title="Edit Loyalty Tier" />
      <p>Loyalty Tier not found or does not belong to this program.</p>
      <Link href={`/dashboard/pricing/loyalty/programs/${programId}/tiers`} passHref><Button>Back to Tiers List</Button></Link>
    </>
  );
   if (formError && !initialData && !submissionStatus?.message) return (
    <>
      <PageHeader title="Edit Loyalty Tier" />
      <p style={{ color: 'red' }}>Error loading data: {formError}</p>
      <Link href={`/dashboard/pricing/loyalty/programs/${programId}/tiers`} passHref><Button>Back to Tiers List</Button></Link>
    </>
  );
  if (!initialData) return <p>Loyalty Tier data could not be loaded.</p>;

  return (
    <>
      <PageHeader title={programName ? `Edit Tier: ${initialData?.name || ''} (Program: ${programName})` : `Edit Tier: ${initialData?.name || ''}`} />
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
      <LoyaltyTierForm
        initialData={initialData}
        onSubmit={handleUpdateTier}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
      />
    </>
  );
}
