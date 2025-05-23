'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@samatransport/ui';
import { VehicleTypeForm, VehicleTypeFormData } from '../components/VehicleTypeForm';

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function NewVehicleTypePage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateVehicleType = async (data: VehicleTypeFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicle-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create vehicle type');
      }
      alert('Vehicle type created successfully!');
      router.push('/dashboard/vehicle-types');
    } catch (error: any) {
      console.error("Error creating vehicle type:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/vehicle-types');
  };

  return (
    <>
      <PageHeader title="Create New Vehicle Type" />
      <VehicleTypeForm
        onSubmit={handleCreateVehicleType}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
      />
    </>
  );
}
