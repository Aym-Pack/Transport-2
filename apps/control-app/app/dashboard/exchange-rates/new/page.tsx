'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, SelectOption } from '@samatransport/ui';
import { ExchangeRateForm, ExchangeRateFormData } from '../components/ExchangeRateForm';

// Define the Currency type for fetching
interface Currency {
  code: string;
  name: string;
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function NewExchangeRatePage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [currencies, setCurrencies] = useState<SelectOption[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);

  const fetchCurrenciesList = useCallback(async () => {
    setLoadingCurrencies(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-currencies`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch currencies for dropdown');
      }
      const data: Currency[] = await response.json();
      setCurrencies(data.map(c => ({ value: c.code, label: `${c.name} (${c.code})` })));
    } catch (error: any) {
      console.error("Error fetching currencies:", error);
      setFormError('Failed to load currency options: ' + error.message);
    } finally {
      setLoadingCurrencies(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrenciesList();
  }, [fetchCurrenciesList]);

  const handleCreateExchangeRate = async (data: ExchangeRateFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-exchange-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create exchange rate');
      }
      alert('Exchange rate created successfully!');
      router.push('/dashboard/exchange-rates');
    } catch (error: any) {
      console.error("Error creating exchange rate:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/exchange-rates');
  };

  if (loadingCurrencies) {
    return <p>Loading currency data for form...</p>;
  }
  
  if (formError && currencies.length === 0) {
      return <p style={{ color: 'red' }}>Error loading form dependencies: {formError}</p>;
  }

  return (
    <>
      <PageHeader title="Add New Exchange Rate" />
      <ExchangeRateForm
        onSubmit={handleCreateExchangeRate}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        currenciesList={currencies}
      />
    </>
  );
}
