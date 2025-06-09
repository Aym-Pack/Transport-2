'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@samatransport/ui';
import { RoleForm, RoleFormData } from '../components/RoleForm';

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

interface CreatedRole extends RoleFormData {
    id: string; // Ensure the created role includes an ID
}

export default function NewRolePage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateRole = async (data: Pick<RoleFormData, 'name' | 'description'>) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create role');
      }
      const newRole: CreatedRole = await response.json();
      alert('Role created successfully! You will now be redirected to assign permissions.');
      router.push(`/dashboard/roles/${newRole.id}/edit`); // Redirect to edit page
    } catch (error: any) {
      console.error("Error creating role:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/roles');
  };

  return (
    <>
      <PageHeader title="Create New Role" />
      <RoleForm
        onSubmit={handleCreateRole}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
      />
    </>
  );
}
