'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@samatransport/ui';
import { CurrencyForm, CurrencyFormData } from '../components/CurrencyForm';

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function NewCurrencyPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateCurrency = async (data: CurrencyFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-currencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create currency');
      }
      alert('Currency created successfully!');
      router.push('/dashboard/currencies');
    } catch (error: any) {
      console.error("Error creating currency:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/currencies');
  };

  return (
    <>
      <PageHeader title="Add New Currency" />
      <CurrencyForm
        onSubmit={handleCreateCurrency}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        isEditMode={false}
      />
    </>
  );
}
