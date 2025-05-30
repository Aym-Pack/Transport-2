'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, SelectOption } from '@samatransport/ui';
import { AgencyForm, AgencyFormData } from '../components/AgencyForm'; // Reusing the form

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

interface Currency {
  code: string;
  name: string;
}

interface Agency extends AgencyFormData {
  id: string; // Ensure id is part of the Agency type
}


export default function EditAgencyPage() {
  const router = useRouter();
  const params = useParams();
  const agencyId = params.id as string; // From the [id] part of the URL

  const [initialData, setInitialData] = useState<Partial<AgencyFormData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currencies, setCurrencies] = useState<SelectOption[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const fetchAgencyAndCurrencies = useCallback(async () => {
    setLoadingData(true);
    setFormError(null);
    try {
      // Fetch agency data
      const agencyResponse = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-agencies?id=${agencyId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!agencyResponse.ok) {
        if (agencyResponse.status === 404) throw new Error('Agency not found.');
        const errorData = await agencyResponse.json();
        throw new Error(errorData.error || 'Failed to fetch agency data');
      }
      const agencyData: Agency = await agencyResponse.json();
      setInitialData(agencyData);

      // Fetch currencies
      const currenciesResponse = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-currencies`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!currenciesResponse.ok) throw new Error('Failed to fetch currencies');
      const currenciesData: Currency[] = await currenciesResponse.json();
      setCurrencies(currenciesData.map(c => ({ value: c.code, label: `${c.name} (${c.code})` })));

    } catch (error: any) {
      console.error("Error fetching data:", error);
      setFormError(error.message);
    } finally {
      setLoadingData(false);
    }
  }, [agencyId]);

  useEffect(() => {
    if (agencyId) {
      fetchAgencyAndCurrencies();
    }
  }, [agencyId, fetchAgencyAndCurrencies]);

  const handleUpdateAgency = async (data: AgencyFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-agencies?id=${agencyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update agency');
      }
      alert('Agency updated successfully!'); // Replace with a proper notification system
      router.push('/dashboard/agencies');
    } catch (error: any) {
      console.error("Error updating agency:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/agencies');
  };

  if (loadingData) {
    return <p>Loading agency data...</p>;
  }

  if (formError && !initialData) { // If there was an error fetching initial data (e.g. agency not found)
    return (
      <>
        <PageHeader title="Edit Agency" />
        <p style={{ color: 'red' }}>Error: {formError}</p>
      </>
    );
  }

  if (!initialData) { // Should be caught by loading or error state, but as a fallback
      return <p>Agency not found.</p>;
  }


  return (
    <>
      <PageHeader title={`Edit Agency: ${initialData?.name || ''}`} />
      <AgencyForm
        initialData={initialData}
        onSubmit={handleUpdateAgency}
        isSaving={isSaving}
        currencies={currencies}
        formError={formError}
        onCancel={handleCancel}
      />
    </>
  );
}
