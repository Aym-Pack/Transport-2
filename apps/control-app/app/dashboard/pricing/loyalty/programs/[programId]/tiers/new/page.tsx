'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, Button } from '@samatransport/ui';
import { LoyaltyTierForm, LoyaltyTierFormData } from '../components/LoyaltyTierForm';

interface LoyaltyProgram {
  id: string;
  name: string;
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function NewLoyaltyTierPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.programId as string;

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | string[] | null>(null);
  const [programName, setProgramName] = useState<string>('');
  const [loadingProgram, setLoadingProgram] = useState(true);
  const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error'; message: string | string[] } | null>(null);

  const fetchProgramName = useCallback(async () => {
    if (!programId) return;
    setLoadingProgram(true);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-programs?id=${programId}`);
      if (!response.ok) throw new Error('Failed to fetch loyalty program details');
      const data: LoyaltyProgram = await response.json();
      setProgramName(data.name);
    } catch (error) {
      console.error("Error fetching program name:", error);
      setSubmissionStatus({ type: 'error', message: 'Could not load program details. Please go back and try again.' });
    } finally {
      setLoadingProgram(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchProgramName();
  }, [fetchProgramName]);

  const handleCreateTier = async (data: Omit<LoyaltyTierFormData, 'id' | 'loyalty_program_id'>) => {
    setIsSaving(true);
    setFormError(null);
    setSubmissionStatus(null);

    const payload = {
      ...data,
      loyalty_program_id: BigInt(programId), // Add programId and convert to BigInt
    };

    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-tiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();
      if (!response.ok) {
        const message = Array.isArray(responseData.errors) ? responseData.errors : (responseData.error || 'Failed to create loyalty tier');
        throw { type: 'validation', messages: message };
      }
      setSubmissionStatus({ type: 'success', message: 'Loyalty tier created successfully! Redirecting...' });
      setTimeout(() => router.push(`/dashboard/pricing/loyalty/programs/${programId}/tiers`), 2000);
    } catch (error: any) {
      console.error("Error creating loyalty tier:", error);
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

  if (loadingProgram) return <p>Loading program details...</p>;

  return (
    <>
      <PageHeader title={programName ? `Create New Tier for: ${programName}` : 'Create New Tier'} />
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
        onSubmit={handleCreateTier}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
      />
    </>
  );
}
