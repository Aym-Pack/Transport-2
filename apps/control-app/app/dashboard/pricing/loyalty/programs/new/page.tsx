'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, SelectOption } from '@samatransport/ui';
import { LoyaltyProgramForm, LoyaltyProgramFormData } from '../components/LoyaltyProgramForm';

// Define type for fetching currencies
interface Currency {
  code: string;
  name: string;
  symbol?: string | null;
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function NewLoyaltyProgramPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | string[] | null>(null);
  const [currenciesList, setCurrenciesList] = useState<SelectOption[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);
  const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error'; message: string | string[] } | null>(null);


  const fetchCurrencies = useCallback(async () => {
    setLoadingCurrencies(true);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-currencies`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch currencies');
      const data: Currency[] = await response.json();
      setCurrenciesList(data.map(c => ({ value: c.code, label: `${c.name} (${c.symbol || c.code})` })));
    } catch (error: any) {
      console.error("Error fetching currencies:", error);
      setFormError('Failed to load currency options: ' + error.message); // Set form error for form component
      setSubmissionStatus({ type: 'error', message: 'Failed to load currency options for the form.' }); // Page level feedback
    } finally {
      setLoadingCurrencies(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  const handleCreateProgram = async (data: LoyaltyProgramFormData) => {
    setIsSaving(true);
    setFormError(null);
    setSubmissionStatus(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-loyalty-programs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const responseData = await response.json();
      if (!response.ok) {
        const message = Array.isArray(responseData.errors) ? responseData.errors : (responseData.error || 'Failed to create loyalty program');
        throw { type: 'validation', messages: message };
      }
      setSubmissionStatus({ type: 'success', message: 'Loyalty program created successfully! Redirecting...' });
      setTimeout(() => router.push('/dashboard/pricing/loyalty/programs'), 2000);
    } catch (error: any) {
      console.error("Error creating loyalty program:", error);
      if (error.type === 'validation') {
        setFormError(error.messages); // Pass array to form
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

  if (loadingCurrencies) {
    return <p>Loading form dependencies...</p>;
  }

  // If currencies failed to load, it's hard to proceed, show general error.
  // Specific formError for currencies is handled by the form's own display.
  if (currenciesList.length === 0 && formError) {
      return (
        <>
            <PageHeader title="Create Loyalty Program" />
            <p style={{ color: 'red' }}>Could not load required data for the form. Please try again later.</p>
        </>
      );
  }

  return (
    <>
      <PageHeader title="Create Loyalty Program" />
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
        onSubmit={handleCreateProgram}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        currenciesList={currenciesList}
      />
    </>
  );
}
