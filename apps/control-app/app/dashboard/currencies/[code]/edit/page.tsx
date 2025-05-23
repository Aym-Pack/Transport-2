'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@samatransport/ui';
import { CurrencyForm, CurrencyFormData } from '../components/CurrencyForm';

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

interface Currency extends CurrencyFormData {
  // No extra fields needed from the form data for initial population
}

export default function EditCurrencyPage() {
  const router = useRouter();
  const params = useParams();
  const currencyCode = params.code as string; // The 'code' from the URL path

  const [initialData, setInitialData] = useState<Partial<CurrencyFormData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const fetchCurrency = useCallback(async () => {
    setLoadingData(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-currencies?code=${currencyCode}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error('Currency not found.');
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch currency data');
      }
      const currencyData: Currency = await response.json();
      setInitialData(currencyData);
    } catch (error: any) {
      console.error("Error fetching currency data:", error);
      setFormError(error.message);
    } finally {
      setLoadingData(false);
    }
  }, [currencyCode]);

  useEffect(() => {
    if (currencyCode) {
      fetchCurrency();
    }
  }, [currencyCode, fetchCurrency]);

  const handleUpdateCurrency = async (data: CurrencyFormData) => {
    setIsSaving(true);
    setFormError(null);
    // The 'code' in 'data' from the form should be the original, disabled code.
    // The endpoint expects the code in the query parameter for targeting the record.
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-currencies?code=${currencyCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, symbol: data.symbol }), // Only send updatable fields
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update currency');
      }
      alert('Currency updated successfully!');
      router.push('/dashboard/currencies');
    } catch (error: any) {
      console.error("Error updating currency:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/currencies');
  };

  if (loadingData) {
    return <p>Loading currency data...</p>;
  }

  if (formError && !initialData) {
    return (
      <>
        <PageHeader title="Edit Currency" />
        <p style={{ color: 'red' }}>Error: {formError}</p>
      </>
    );
  }
  
  if (!initialData) {
      return <p>Currency not found.</p>;
  }

  return (
    <>
      <PageHeader title={`Edit Currency: ${initialData?.code || ''}`} />
      <CurrencyForm
        initialData={initialData}
        onSubmit={handleUpdateCurrency}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        isEditMode={true} // 'code' field will be disabled
      />
    </>
  );
}
