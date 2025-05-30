'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, SelectOption } from '@samatransport/ui';
import { PromotionForm, PromotionFormData } from '../components/PromotionForm';

// Define types for related data
interface Tariff { id: string; name: string; } // Assuming BIGINT for id, so string in JS
interface Route { id: string; name: string; } // UUID, string in JS
interface VehicleType { id: string; name: string; } // UUID, string in JS

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function NewPromotionPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [tariffsList, setTariffsList] = useState<SelectOption[]>([]);
  const [routesList, setRoutesList] = useState<SelectOption[]>([]);
  const [vehicleTypesList, setVehicleTypesList] = useState<SelectOption[]>([]);
  const [loadingRelatedData, setLoadingRelatedData] = useState(true);

  const fetchRelatedData = useCallback(async () => {
    setLoadingRelatedData(true);
    setFormError(null);
    try {
      const [tariffsRes, routesRes, vehicleTypesRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-passenger-tariffs`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-routes`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicle-types`),
      ]);

      if (!tariffsRes.ok) throw new Error('Failed to fetch passenger tariffs');
      const tariffsData: Tariff[] = await tariffsRes.json();
      setTariffsList(tariffsData.map(t => ({ value: t.id.toString(), label: t.name })));

      if (!routesRes.ok) throw new Error('Failed to fetch routes');
      const routesData: Route[] = await routesRes.json();
      setRoutesList(routesData.map(r => ({ value: r.id, label: r.name })));

      if (!vehicleTypesRes.ok) throw new Error('Failed to fetch vehicle types');
      const vehicleTypesData: VehicleType[] = await vehicleTypesRes.json();
      setVehicleTypesList(vehicleTypesData.map(vt => ({ value: vt.id, label: vt.name })));

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

  const handleCreatePromotion = async (data: PromotionFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create promotion');
      }
      alert('Promotion created successfully!');
      router.push('/dashboard/pricing/promotions');
    } catch (error: any) {
      console.error("Error creating promotion:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/pricing/promotions');
  };

  if (loadingRelatedData) {
    return <p>Loading form dependencies...</p>;
  }

  if (formError && tariffsList.length === 0 && routesList.length === 0 && vehicleTypesList.length === 0) {
      return <p style={{ color: 'red' }}>Error loading form: {formError}</p>;
  }

  return (
    <>
      <PageHeader title="Create New Promotion" />
      <PromotionForm
        onSubmit={handleCreatePromotion}
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
