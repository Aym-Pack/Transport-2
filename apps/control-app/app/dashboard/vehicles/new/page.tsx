'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, SelectOption } from '@samatransport/ui';
import { VehicleForm, VehicleFormData } from '../components/VehicleForm';

// Assuming these types are defined elsewhere or can be defined here
interface Agency {
  id: string;
  name: string;
}
interface VehicleType {
  id: string;
  name: string;
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function NewVehiclePage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [agencies, setAgencies] = useState<SelectOption[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<SelectOption[]>([]);
  const [loadingRelatedData, setLoadingRelatedData] = useState(true);

  const fetchRelatedData = useCallback(async () => {
    setLoadingRelatedData(true);
    setFormError(null);
    try {
      const [agenciesRes, vehicleTypesRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-agencies`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicle-types`),
      ]);

      if (!agenciesRes.ok) throw new Error('Failed to fetch agencies');
      const agenciesData: Agency[] = await agenciesRes.json();
      setAgencies(agenciesData.map(a => ({ value: a.id, label: a.name })));

      if (!vehicleTypesRes.ok) throw new Error('Failed to fetch vehicle types');
      const vehicleTypesData: VehicleType[] = await vehicleTypesRes.json();
      setVehicleTypes(vehicleTypesData.map(vt => ({ value: vt.id, label: vt.name })));

    } catch (error: any) {
      console.error("Error fetching related data:", error);
      setFormError('Failed to load form dependencies: ' + error.message);
    } finally {
      setLoadingRelatedData(false);
    }
  }, []);

  useEffect(() => {
    fetchRelatedData();
  }, [fetchRelatedData]);

  const handleCreateVehicle = async (data: VehicleFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create vehicle');
      }
      alert('Vehicle created successfully!');
      router.push('/dashboard/vehicles');
    } catch (error: any) {
      console.error("Error creating vehicle:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/vehicles');
  };

  if (loadingRelatedData) {
    return <p>Loading form dependencies...</p>;
  }

  if (formError && agencies.length === 0 && vehicleTypes.length === 0) {
      return <p style={{ color: 'red' }}>Error loading form: {formError}</p>;
  }

  return (
    <>
      <PageHeader title="Add New Vehicle" />
      <VehicleForm
        onSubmit={handleCreateVehicle}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        agenciesList={agencies}
        vehicleTypesList={vehicleTypes}
      />
    </>
  );
}
