'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@samatransport/ui';
import { RouteForm, RouteFormData } from '../components/RouteForm';

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

// This type might already exist in page.tsx, consider sharing if more complex
interface Route extends RouteFormData {
  id: string;
}

export default function EditRoutePage() {
  const router = useRouter();
  const params = useParams();
  const routeId = params.id as string;

  const [initialData, setInitialData] = useState<Partial<RouteFormData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const fetchRoute = useCallback(async () => {
    setLoadingData(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-routes?id=${routeId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error('Route not found.');
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch route data');
      }
      const routeData: Route = await response.json();
      setInitialData(routeData);
    } catch (error: any) {
      console.error("Error fetching route data:", error);
      setFormError(error.message);
    } finally {
      setLoadingData(false);
    }
  }, [routeId]);

  useEffect(() => {
    if (routeId) {
      fetchRoute();
    }
  }, [routeId, fetchRoute]);

  const handleUpdateRoute = async (data: RouteFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-routes?id=${routeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update route');
      }
      alert('Route updated successfully!');
      router.push('/dashboard/routes');
    } catch (error: any) {
      console.error("Error updating route:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/routes');
  };

  if (loadingData) {
    return <p>Loading route data...</p>;
  }

  if (formError && !initialData) {
    return (
      <>
        <PageHeader title="Edit Route" />
        <p style={{ color: 'red' }}>Error: {formError}</p>
      </>
    );
  }
  
  if (!initialData) {
      return <p>Route not found.</p>;
  }

  return (
    <>
      <PageHeader title={`Edit Route: ${initialData?.name || ''}`} />
      <RouteForm
        initialData={initialData}
        onSubmit={handleUpdateRoute}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
      />
    </>
  );
}
