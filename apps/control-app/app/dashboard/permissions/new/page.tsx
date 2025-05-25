'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@samatransport/ui';
import { PermissionForm, PermissionFormData } from '../components/PermissionForm';

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function NewPermissionPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreatePermission = async (data: PermissionFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create permission');
      }
      alert('Permission created successfully!');
      router.push('/dashboard/permissions');
    } catch (error: any) {
      console.error("Error creating permission:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/permissions');
  };

  return (
    <>
      <PageHeader title="Create New Permission" />
      <PermissionForm
        onSubmit={handleCreatePermission}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
      />
    </>
  );
}
