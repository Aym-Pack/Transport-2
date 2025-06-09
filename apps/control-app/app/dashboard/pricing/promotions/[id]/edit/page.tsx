'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, SelectOption, Button } from '@samatransport/ui';
import { PromotionForm, PromotionFormData } from '../components/PromotionForm';
import Link from 'next/link'; // For "Back to List" link

// Define types for related data (can be moved to a shared types file)
interface Tariff { id: string; name: string; }
interface Route { id: string; name: string; }
interface VehicleType { id: string; name: string; }

// Define the Promotion type as expected from the API (including joined data)
interface PromotionAPIResponse extends PromotionFormData {
  id: string;
  // passenger_tariff_ids, applicable_routes, applicable_vehicle_types are already in PromotionFormData
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function EditPromotionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string; // Promotion ID from URL

  const [initialData, setInitialData] = useState<Partial<PromotionFormData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [tariffsList, setTariffsList] = useState<SelectOption[]>([]);
  const [routesList, setRoutesList] = useState<SelectOption[]>([]);
  const [vehicleTypesList, setVehicleTypesList] = useState<SelectOption[]>([]);

  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchPromotionAndRelatedData = useCallback(async () => {
    if (!id) return;

    setLoadingData(true);
    setFormError(null);
    setNotFound(false);

    try {
      const [promotionRes, tariffsRes, routesRes, vehicleTypesRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-promotions?id=${id}`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-passenger-tariffs`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-routes`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicle-types`),
      ]);

      // Process Promotion Data
      if (!promotionRes.ok) {
        if (promotionRes.status === 404) {
          setNotFound(true);
          throw new Error('Promotion not found.');
        }
        const errorData = await promotionRes.json();
        throw new Error(errorData.error || 'Failed to fetch promotion data');
      }
      const promotionData: PromotionAPIResponse = await promotionRes.json();
      // The PromotionForm expects dates as YYYY-MM-DDTHH:mm strings
      // and ID arrays (passenger_tariff_ids, applicable_routes, applicable_vehicle_types)
      // The form's useEffect will handle mapping to its internal state (Sets for multi-selects, string for numbers/dates)
      setInitialData({
        ...promotionData,
        valid_from: promotionData.valid_from ? new Date(promotionData.valid_from).toISOString().slice(0, 16) : '',
        valid_until: promotionData.valid_until ? new Date(promotionData.valid_until).toISOString().slice(0, 16) : '',
        // passenger_tariff_ids, applicable_routes, applicable_vehicle_types are already arrays of strings/numbers
        // The form will convert them to Sets of strings.
      });

      // Process Tariffs
      if (!tariffsRes.ok) throw new Error('Failed to fetch passenger tariffs');
      const tariffsData: Tariff[] = await tariffsRes.json();
      setTariffsList(tariffsData.map(t => ({ value: t.id.toString(), label: t.name })));

      // Process Routes
      if (!routesRes.ok) throw new Error('Failed to fetch routes');
      const routesData: Route[] = await routesRes.json();
      setRoutesList(routesData.map(r => ({ value: r.id, label: r.name })));

      // Process Vehicle Types
      if (!vehicleTypesRes.ok) throw new Error('Failed to fetch vehicle types');
      const vehicleTypesData: VehicleType[] = await vehicleTypesRes.json();
      setVehicleTypesList(vehicleTypesData.map(vt => ({ value: vt.id, label: vt.name })));

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
    fetchPromotionAndRelatedData();
  }, [fetchPromotionAndRelatedData]);

  const handleUpdatePromotion = async (formData: PromotionFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-promotions?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update promotion');
      }
      alert('Promotion updated successfully!');
      router.push('/dashboard/pricing/promotions');
    } catch (error: any) {
      console.error("Error updating promotion:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/pricing/promotions');
  };

  if (loadingData) {
    return <p>Loading promotion data...</p>;
  }

  if (notFound) {
    return (
      <>
        <PageHeader title="Edit Promotion" />
        <p>Promotion not found.</p>
        <Link href="/dashboard/pricing/promotions" passHref>
          <Button>Back to List</Button>
        </Link>
      </>
    );
  }

  if (formError && !initialData) {
     return (
      <>
        <PageHeader title="Edit Promotion" />
        <p style={{ color: 'red' }}>Error loading data: {formError}</p>
         <Link href="/dashboard/pricing/promotions" passHref>
          <Button>Back to List</Button>
        </Link>
      </>
    );
  }

  if (!initialData) {
      return <p>Promotion data could not be loaded.</p>;
  }

  return (
    <>
      <PageHeader title={`Edit Promotion: ${initialData?.name || ''}`} />
      <PromotionForm
        initialData={initialData}
        onSubmit={handleUpdatePromotion}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        tariffsList={tariffsList}
        routesList={routesList}
        vehicleTypesList={vehicleTypesList}
      />
    </>
  );
}
