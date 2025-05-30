'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
interface Vehicle extends VehicleFormData { // Ensure Vehicle type includes all form data fields
  id: string;
}


const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;

  const [initialData, setInitialData] = useState<Partial<VehicleFormData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [agencies, setAgencies] = useState<SelectOption[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<SelectOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchVehicleAndRelatedData = useCallback(async () => {
    setLoadingData(true);
    setFormError(null);
    try {
      const [vehicleRes, agenciesRes, vehicleTypesRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicles?id=${vehicleId}`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-agencies`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicle-types`),
      ]);

      if (!vehicleRes.ok) {
        if (vehicleRes.status === 404) throw new Error('Vehicle not found.');
        const errorData = await vehicleRes.json();
        throw new Error(errorData.error || 'Failed to fetch vehicle data');
      }
      const vehicleData: Vehicle = await vehicleRes.json();
      // Ensure date fields are strings in YYYY-MM-DD format if they exist
      if (vehicleData.last_maintenance_date) {
        vehicleData.last_maintenance_date = new Date(vehicleData.last_maintenance_date).toISOString().split('T')[0];
      }
      if (vehicleData.next_maintenance_due_date) {
        vehicleData.next_maintenance_due_date = new Date(vehicleData.next_maintenance_due_date).toISOString().split('T')[0];
      }
      setInitialData(vehicleData);

      if (!agenciesRes.ok) throw new Error('Failed to fetch agencies');
      const agenciesData: Agency[] = await agenciesRes.json();
      setAgencies(agenciesData.map(a => ({ value: a.id, label: a.name })));

      if (!vehicleTypesRes.ok) throw new Error('Failed to fetch vehicle types');
      const vehicleTypesData: VehicleType[] = await vehicleTypesRes.json();
      setVehicleTypes(vehicleTypesData.map(vt => ({ value: vt.id, label: vt.name })));

    } catch (error: any) {
      console.error("Error fetching data:", error);
      setFormError(error.message);
    } finally {
      setLoadingData(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (vehicleId) {
      fetchVehicleAndRelatedData();
    }
  }, [vehicleId, fetchVehicleAndRelatedData]);

  const handleUpdateVehicle = async (data: VehicleFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicles?id=${vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update vehicle');
      }
      alert('Vehicle updated successfully!');
      router.push('/dashboard/vehicles');
    } catch (error: any) {
      console.error("Error updating vehicle:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/vehicles');
  };

  if (loadingData) {
    return <p>Loading vehicle data...</p>;
  }

  if (formError && !initialData) {
    return (
      <>
        <PageHeader title="Edit Vehicle" />
        <p style={{ color: 'red' }}>Error: {formError}</p>
      </>
    );
  }

  if (!initialData) {
      return <p>Vehicle not found.</p>;
  }

  return (
    <>
      <PageHeader title={`Edit Vehicle: ${initialData?.registration_number || ''}`} />
      <VehicleForm
        initialData={initialData}
        onSubmit={handleUpdateVehicle}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        agenciesList={agencies}
        vehicleTypesList={vehicleTypes}
      />
    </>
  );
}
