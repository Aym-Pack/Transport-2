'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, SelectOption } from '@samatransport/ui';
import { AgencyForm, AgencyFormData } from '../components/AgencyForm';

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

interface Currency {
  code: string;
  name: string;
}

export default function NewAgencyPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [currencies, setCurrencies] = useState<SelectOption[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);

  const fetchCurrencies = useCallback(async () => {
    setLoadingCurrencies(true);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-currencies`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch currencies');
      const data: Currency[] = await response.json();
      setCurrencies(data.map(c => ({ value: c.code, label: `${c.name} (${c.code})` })));
    } catch (error: any) {
      console.error("Error fetching currencies:", error);
      setFormError('Failed to load currency options. Please try again.');
    } finally {
      setLoadingCurrencies(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  const handleCreateAgency = async (data: AgencyFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-agencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create agency');
      }
      alert('Agency created successfully!'); // Replace with a proper notification system if available
      router.push('/dashboard/agencies');
    } catch (error: any) {
      console.error("Error creating agency:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/agencies');
  };

  if (loadingCurrencies) {
    return <p>Loading form dependencies...</p>;
  }

  return (
    <>
      <PageHeader title="Create New Agency" />
      <AgencyForm
        onSubmit={handleCreateAgency}
        isSaving={isSaving}
        currencies={currencies}
        formError={formError}
        onCancel={handleCancel}
      />
    </>
  );
}
