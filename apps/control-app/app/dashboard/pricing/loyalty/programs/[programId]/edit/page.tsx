'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, SelectOption, Button } from '@samatransport/ui';
import { LoyaltyProgramForm, LoyaltyProgramFormData } from '../components/LoyaltyProgramForm';
import Link from 'next/link';

// Define type for fetching currencies
interface Currency {
  code: string;
  name: string;
  symbol?: string | null;
}

// LoyaltyProgram as returned by API (might include joined data)
interface LoyaltyProgramAPIResponse extends LoyaltyProgramFormData {
  id: string;
  // For joined currency data, based on Edge function:
  // base_currency_code_for_points: { code: string; name: string; symbol: string | null; };
  // Or if the FK field itself is the object:
  base_currency_code_for_points: string | { code: string; name: string; symbol: string | null; };
}


const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function EditLoyaltyProgramPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.programId as string;

  const [initialData, setInitialData] = useState<Partial<LoyaltyProgramFormData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | string[] | null>(null);
  const [currenciesList, setCurrenciesList] = useState<SelectOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error'; message: string | string[] } | null>(null);

  const fetchProgramAndCurrencies = useCallback(async () => {
    if (!programId) return;
    setLoadingData(true);
    setFormError(null);
    setNotFound(false);
    setSubmissionStatus(null);

    try {
      const [programRes, currenciesRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-programs?id=${programId}`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-currencies`),
      ]);

      if (!programRes.ok) {
        if (programRes.status === 404) {
          setNotFound(true);
          throw new Error('Loyalty Program not found.');
        }
        const errorData = await programRes.json();
        throw new Error(errorData.error || 'Failed to fetch loyalty program data');
      }
      const programData: LoyaltyProgramAPIResponse = await programRes.json();
      // The form expects base_currency_code_for_points as a string ID.
      // The API returns it as an object due to the join: base_currency_code_for_points:currencies(...)
      // So, we need to extract the code.
      const baseCurrencyCode = typeof programData.base_currency_code_for_points === 'object'
        ? programData.base_currency_code_for_points.code
        : programData.base_currency_code_for_points;

      setInitialData({
        ...programData,
        base_currency_code_for_points: baseCurrencyCode,
      });

      if (!currenciesRes.ok) throw new Error('Failed to fetch currencies');
      const currenciesData: Currency[] = await currenciesRes.json();
      setCurrenciesList(currenciesData.map(c => ({ value: c.code, label: `${c.name} (${c.symbol || c.code})` })));

    } catch (error: any) {
      console.error("Error fetching data:", error);
      if (!notFound) {
        setFormError(error.message); // General error if not specifically "not found"
        setSubmissionStatus({ type: 'error', message: error.message });
      }
    } finally {
      setLoadingData(false);
    }
  }, [programId, notFound]);

  useEffect(() => {
    fetchProgramAndCurrencies();
  }, [fetchProgramAndCurrencies]);

  const handleUpdateProgram = async (data: LoyaltyProgramFormData) => {
    setIsSaving(true);
    setFormError(null);
    setSubmissionStatus(null);
    try {
      const { id, ...updatePayload } = data; // id is not part of the update payload body
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-programs?id=${programId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      const responseData = await response.json();
      if (!response.ok) {
        const message = Array.isArray(responseData.errors) ? responseData.errors : (responseData.error || 'Failed to update loyalty program');
        throw { type: 'validation', messages: message };
      }
      setSubmissionStatus({ type: 'success', message: 'Loyalty program updated successfully!' });
      // Optionally update initialData state with responseData if needed, or refetch.
      // For now, success message is shown, user can navigate back.
    } catch (error: any) {
      console.error("Error updating loyalty program:", error);
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
    router.push('/dashboard/pricing/loyalty/programs');
  };

  if (loadingData) return <p>Loading loyalty program data...</p>;
  if (notFound) return (
    <>
      <PageHeader title="Edit Loyalty Program" />
      <p>Loyalty Program not found.</p>
      <Link href="/dashboard/pricing/loyalty/programs" passHref><Button>Back to List</Button></Link>
    </>
  );
  if (formError && !initialData && !submissionStatus?.message) return ( // Only show generic load error if no submission attempt made yet
    <>
      <PageHeader title="Edit Loyalty Program" />
      <p style={{ color: 'red' }}>Error loading data: {formError}</p>
      <Link href="/dashboard/pricing/loyalty/programs" passHref><Button>Back to List</Button></Link>
    </>
  );
  if (!initialData) return <p>Loyalty Program data could not be loaded.</p>;

  return (
    <>
      <PageHeader title={`Edit Loyalty Program: ${initialData?.name || ''}`} />
       {submissionStatus && (
        <div style={{
          padding: '10px', marginBottom: '15px', borderRadius: '4px',
          border: `1px solid ${submissionStatus.type === 'success' ? 'green' : 'red'}`,
          background: submissionStatus.type === 'success' ? '#e6fffa' : '#ffebeb',
          color: submissionStatus.type === 'success' ? 'green' : 'red',
        }}>
          {typeof submissionStatus.message === 'string' ? submissionStatus.message : (
             submissionStatus.message.map((msg, idx) => <p key={idx}>{msg}</p>)
          )}
        </div>
      )}
      <LoyaltyProgramForm
        initialData={initialData}
        onSubmit={handleUpdateProgram}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        currenciesList={currenciesList}
      />
    </>
  );
}
