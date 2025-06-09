'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, SelectOption } from '@samatransport/ui';
import { PassengerTariffForm, PassengerTariffFormData } from '../components/PassengerTariffForm';

// Define types for related data
interface Route { id: string; name: string; }
interface VehicleType { id: string; name: string; }
interface Currency { code: string; name: string; symbol: string; }

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function NewPassengerTariffPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [routesList, setRoutesList] = useState<SelectOption[]>([]);
  const [vehicleTypesList, setVehicleTypesList] = useState<SelectOption[]>([]);
  const [currenciesList, setCurrenciesList] = useState<SelectOption[]>([]);
  const [loadingRelatedData, setLoadingRelatedData] = useState(true);

  const fetchRelatedData = useCallback(async () => {
    setLoadingRelatedData(true);
    setFormError(null);
    try {
      const [routesRes, vehicleTypesRes, currenciesRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-routes`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicle-types`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-currencies`),
      ]);

      if (!routesRes.ok) throw new Error('Failed to fetch routes');
      const routesData: Route[] = await routesRes.json();
      setRoutesList(routesData.map(r => ({ value: r.id, label: r.name })));

      if (!vehicleTypesRes.ok) throw new Error('Failed to fetch vehicle types');
      const vehicleTypesData: VehicleType[] = await vehicleTypesRes.json();
      setVehicleTypesList(vehicleTypesData.map(vt => ({ value: vt.id, label: vt.name })));

      if (!currenciesRes.ok) throw new Error('Failed to fetch currencies');
      const currenciesData: Currency[] = await currenciesRes.json();
      setCurrenciesList(currenciesData.map(c => ({ value: c.code, label: `${c.name} (${c.symbol || c.code})` })));

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

  const handleCreateTariff = async (data: PassengerTariffFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-passenger-tariffs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create passenger tariff');
      }
      alert('Passenger tariff created successfully!');
      router.push('/dashboard/pricing/tariffs');
    } catch (error: any) {
      console.error("Error creating passenger tariff:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/pricing/tariffs');
  };

  if (loadingRelatedData) {
    return <p>Loading form dependencies...</p>;
  }

  if (formError && routesList.length === 0 && vehicleTypesList.length === 0 && currenciesList.length === 0) {
      return <p style={{ color: 'red' }}>Error loading form: {formError}</p>;
  }

  return (
    <>
      <PageHeader title="Create New Passenger Tariff" />
      <PassengerTariffForm
        onSubmit={handleCreateTariff}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        routesList={routesList}
        vehicleTypesList={vehicleTypesList}
        currenciesList={currenciesList}
      />
    </>
  );
}
