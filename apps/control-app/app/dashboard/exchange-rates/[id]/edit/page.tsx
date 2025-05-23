'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, SelectOption, Button } from '@samatransport/ui';
import { ExchangeRateForm, ExchangeRateFormData } from '../components/ExchangeRateForm';
import Link from 'next/link'; // For the "Back to List" link on not found

// Define the Currency type for fetching
interface Currency {
  code: string;
  name: string;
}

// Define the ExchangeRate type for fetching (can be more specific)
interface ExchangeRate extends ExchangeRateFormData {
  id: string;
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function EditExchangeRatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string; // The 'id' from the URL path

  const [initialData, setInitialData] = useState<Partial<ExchangeRateFormData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [currencies, setCurrencies] = useState<SelectOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchExchangeRateAndCurrencies = useCallback(async () => {
    if (!id) return; // Ensure ID is present

    setLoadingData(true);
    setFormError(null);
    setNotFound(false);

    try {
      // Fetch the specific exchange rate
      const rateResponse = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-exchange-rates?id=${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!rateResponse.ok) {
        if (rateResponse.status === 404) {
          setNotFound(true);
          throw new Error('Exchange Rate not found.');
        }
        const errorData = await rateResponse.json();
        throw new Error(errorData.error || 'Failed to fetch exchange rate data');
      }
      const rateData: ExchangeRate = await rateResponse.json();
      // The form expects rate_str, so we handle this transformation if needed in the form or here.
      // For now, ExchangeRateForm handles initialData?.rate?.toString()
      setInitialData(rateData);

      // Fetch currencies for dropdowns
      const currenciesResponse = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-currencies`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!currenciesResponse.ok) {
        const errorData = await currenciesResponse.json();
        throw new Error(errorData.error || 'Failed to fetch currencies for dropdown');
      }
      const currenciesData: Currency[] = await currenciesResponse.json();
      setCurrencies(currenciesData.map(c => ({ value: c.code, label: `${c.name} (${c.code})` })));

    } catch (error: any) {
      console.error("Error fetching data:", error);
      // Only set formError if it's not a "not found" error that's handled by the notFound state
      if (!notFound) {
        setFormError(error.message);
      }
    } finally {
      setLoadingData(false);
    }
  }, [id, notFound]); // Added notFound to dependency array, though it might not be strictly necessary here

  useEffect(() => {
    fetchExchangeRateAndCurrencies();
  }, [fetchExchangeRateAndCurrencies]);

  const handleUpdateExchangeRate = async (formData: ExchangeRateFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-exchange-rates?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData), // Send the whole formData as the Edge Function expects it
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update exchange rate');
      }
      alert('Exchange Rate updated successfully!');
      router.push('/dashboard/exchange-rates');
    } catch (error: any) {
      console.error("Error updating exchange rate:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/exchange-rates');
  };

  if (loadingData) {
    return <p>Loading exchange rate data...</p>;
  }

  if (notFound) {
    return (
      <>
        <PageHeader title="Edit Exchange Rate" />
        <p>Exchange Rate not found.</p>
        <Link href="/dashboard/exchange-rates" passHref>
          <Button>Back to List</Button>
        </Link>
      </>
    );
  }
  
  if (formError && !initialData) { // If there was a fetch error other than not found
     return (
      <>
        <PageHeader title="Edit Exchange Rate" />
        <p style={{ color: 'red' }}>Error loading data: {formError}</p>
         <Link href="/dashboard/exchange-rates" passHref>
          <Button>Back to List</Button>
        </Link>
      </>
    );
  }


  if (!initialData) { // Fallback if data is still null after loading and no specific error set
      return <p>Exchange Rate data could not be loaded.</p>;
  }

  return (
    <>
      <PageHeader title={`Edit Exchange Rate: ID ${initialData?.id || id}`} />
      <ExchangeRateForm
        initialData={initialData}
        onSubmit={handleUpdateExchangeRate}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        currenciesList={currencies}
      />
    </>
  );
}
