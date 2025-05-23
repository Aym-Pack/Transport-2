'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@samatransport/ui';
import { VehicleTypeForm, VehicleTypeFormData } from '../components/VehicleTypeForm';

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

interface VehicleType extends VehicleTypeFormData {
  id: string;
}

export default function EditVehicleTypePage() {
  const router = useRouter();
  const params = useParams();
  const typeId = params.id as string;

  const [initialData, setInitialData] = useState<Partial<VehicleTypeFormData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const fetchVehicleType = useCallback(async () => {
    setLoadingData(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicle-types?id=${typeId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error('Vehicle Type not found.');
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch vehicle type data');
      }
      const typeData: VehicleType = await response.json();
      setInitialData(typeData);
    } catch (error: any) {
      console.error("Error fetching vehicle type data:", error);
      setFormError(error.message);
    } finally {
      setLoadingData(false);
    }
  }, [typeId]);

  useEffect(() => {
    if (typeId) {
      fetchVehicleType();
    }
  }, [typeId, fetchVehicleType]);

  const handleUpdateVehicleType = async (data: VehicleTypeFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicle-types?id=${typeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update vehicle type');
      }
      alert('Vehicle type updated successfully!');
      router.push('/dashboard/vehicle-types');
    } catch (error: any) {
      console.error("Error updating vehicle type:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/vehicle-types');
  };

  if (loadingData) {
    return <p>Loading vehicle type data...</p>;
  }

  if (formError && !initialData) {
    return (
      <>
        <PageHeader title="Edit Vehicle Type" />
        <p style={{ color: 'red' }}>Error: {formError}</p>
      </>
    );
  }
  
  if (!initialData) {
      return <p>Vehicle Type not found.</p>;
  }

  return (
    <>
      <PageHeader title={`Edit Vehicle Type: ${initialData?.name || ''}`} />
      <VehicleTypeForm
        initialData={initialData}
        onSubmit={handleUpdateVehicleType}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
      />
    </>
  );
}
