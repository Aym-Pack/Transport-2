'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, SelectOption, Button } from '@samatransport/ui';
import { PassengerTariffForm, PassengerTariffFormData } from '../components/PassengerTariffForm';
import Link from 'next/link'; // For "Back to List" link

// Define types for related data (can be moved to a shared types file)
interface Route { id: string; name: string; }
interface VehicleType { id: string; name: string; }
interface Currency { code: string; name: string; symbol: string; }

// Define the PassengerTariff type as expected from the API (including joined data)
interface PassengerTariffAPIResponse extends PassengerTariffFormData {
  id: string;
  // Potentially joined data, though our form expects IDs
  routes?: { name: string };
  vehicle_types?: { name: string };
  currencies?: { name: string; symbol: string };
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function EditPassengerTariffPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string; // Tariff ID from URL

  const [initialData, setInitialData] = useState<Partial<PassengerTariffFormData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [routesList, setRoutesList] = useState<SelectOption[]>([]);
  const [vehicleTypesList, setVehicleTypesList] = useState<SelectOption[]>([]);
  const [currenciesList, setCurrenciesList] = useState<SelectOption[]>([]);
  
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchTariffAndRelatedData = useCallback(async () => {
    if (!id) return;

    setLoadingData(true);
    setFormError(null);
    setNotFound(false);

    try {
      const [tariffRes, routesRes, vehicleTypesRes, currenciesRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-passenger-tariffs?id=${id}`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-routes`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicle-types`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-currencies`),
      ]);

      // Process Tariff Data
      if (!tariffRes.ok) {
        if (tariffRes.status === 404) {
          setNotFound(true);
          throw new Error('Passenger Tariff not found.');
        }
        const errorData = await tariffRes.json();
        throw new Error(errorData.error || 'Failed to fetch passenger tariff data');
      }
      const tariffData: PassengerTariffAPIResponse = await tariffRes.json();
      // The PassengerTariffForm expects dates as YYYY-MM-DD strings or empty/null
      // and days_of_week as an array of numbers.
      // The form's useEffect will handle mapping to its internal state.
      setInitialData({
        ...tariffData,
        valid_from: tariffData.valid_from ? new Date(tariffData.valid_from).toISOString().split('T')[0] : null,
        valid_until: tariffData.valid_until ? new Date(tariffData.valid_until).toISOString().split('T')[0] : null,
      });

      // Process Routes
      if (!routesRes.ok) throw new Error('Failed to fetch routes');
      const routesData: Route[] = await routesRes.json();
      setRoutesList(routesData.map(r => ({ value: r.id, label: r.name })));

      // Process Vehicle Types
      if (!vehicleTypesRes.ok) throw new Error('Failed to fetch vehicle types');
      const vehicleTypesData: VehicleType[] = await vehicleTypesRes.json();
      setVehicleTypesList(vehicleTypesData.map(vt => ({ value: vt.id, label: vt.name })));

      // Process Currencies
      if (!currenciesRes.ok) throw new Error('Failed to fetch currencies');
      const currenciesData: Currency[] = await currenciesRes.json();
      setCurrenciesList(currenciesData.map(c => ({ value: c.code, label: `${c.name} (${c.symbol || c.code})` })));

    } catch (error: any) {
      console.error("Error fetching data:", error);
      if (!notFound) {
        setFormError(error.message);
      }
    } finally {
      setLoadingData(false);
    }
  }, [id, notFound]); // Added notFound

  useEffect(() => {
    fetchTariffAndRelatedData();
  }, [fetchTariffAndRelatedData]);

  const handleUpdateTariff = async (formData: PassengerTariffFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-passenger-tariffs?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update passenger tariff');
      }
      alert('Passenger tariff updated successfully!');
      router.push('/dashboard/pricing/tariffs');
    } catch (error: any) {
      console.error("Error updating passenger tariff:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/pricing/tariffs');
  };

  if (loadingData) {
    return <p>Loading passenger tariff data...</p>;
  }

  if (notFound) {
    return (
      <>
        <PageHeader title="Edit Passenger Tariff" />
        <p>Passenger Tariff not found.</p>
        <Link href="/dashboard/pricing/tariffs" passHref>
          <Button>Back to List</Button>
        </Link>
      </>
    );
  }
  
  if (formError && !initialData) {
     return (
      <>
        <PageHeader title="Edit Passenger Tariff" />
        <p style={{ color: 'red' }}>Error loading data: {formError}</p>
         <Link href="/dashboard/pricing/tariffs" passHref>
          <Button>Back to List</Button>
        </Link>
      </>
    );
  }

  if (!initialData) {
      return <p>Passenger Tariff data could not be loaded.</p>;
  }

  return (
    <>
      <PageHeader title={`Edit Passenger Tariff: ${initialData?.name || ''}`} />
      <PassengerTariffForm
        initialData={initialData}
        onSubmit={handleUpdateTariff}
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
