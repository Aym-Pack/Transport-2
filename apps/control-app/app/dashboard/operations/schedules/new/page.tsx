'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, SelectOption } from '@samatransport/ui';
import { ScheduleForm, ScheduleFormData } from '../components/ScheduleForm';

// Define types for related data
interface RouteInfo { id: string; name: string; }
interface VehicleTypeInfo { id: string; name: string; }
interface VehicleInfo { id: string; registration_number: string; }

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function NewSchedulePage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | string[] | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error'; message: string | string[] } | null>(null);

  const [routesList, setRoutesList] = useState<SelectOption[]>([]);
  const [vehicleTypesList, setVehicleTypesList] = useState<SelectOption[]>([]);
  const [vehiclesList, setVehiclesList] = useState<SelectOption[]>([]);
  const [loadingRelatedData, setLoadingRelatedData] = useState(true);

  const fetchRelatedData = useCallback(async () => {
    setLoadingRelatedData(true);
    setFormError(null);
    setSubmissionStatus(null);
    try {
      const [routesRes, vehicleTypesRes, vehiclesRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-routes`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicle-types`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicles?status=Active`), // Fetch only active vehicles
      ]);

      if (!routesRes.ok) throw new Error('Failed to fetch routes');
      const routesData: RouteInfo[] = await routesRes.json();
      setRoutesList(routesData.map(r => ({ value: r.id, label: r.name })));

      if (!vehicleTypesRes.ok) throw new Error('Failed to fetch vehicle types');
      const vehicleTypesData: VehicleTypeInfo[] = await vehicleTypesRes.json();
      setVehicleTypesList(vehicleTypesData.map(vt => ({ value: vt.id, label: vt.name })));

      if (!vehiclesRes.ok) throw new Error('Failed to fetch vehicles');
      const vehiclesData: VehicleInfo[] = await vehiclesRes.json();
      setVehiclesList(vehiclesData.map(v => ({ value: v.id, label: v.registration_number })));


    } catch (error: any) {
      console.error("Error fetching related data:", error);
      setSubmissionStatus({ type: 'error', message: 'Failed to load form dependencies: ' + error.message });
    } finally {
      setLoadingRelatedData(false);
    }
  }, []);

  useEffect(() => {
    fetchRelatedData();
  }, [fetchRelatedData]);

  const handleCreateSchedule = async (data: ScheduleFormData) => {
    setIsSaving(true);
    setFormError(null);
    setSubmissionStatus(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const responseData = await response.json();
      if (!response.ok) {
        const message = Array.isArray(responseData.errors) ? responseData.errors : (responseData.error || 'Failed to create schedule');
        throw { type: 'validation', messages: message };
      }
      setSubmissionStatus({ type: 'success', message: 'Schedule created successfully! Redirecting...' });
      setTimeout(() => router.push('/dashboard/operations/schedules'), 2000);
    } catch (error: any)      if (error.type === 'validation') {
        setFormError(error.messages);
        setSubmissionStatus({ type: 'error', message: error.messages });
      } else {
        const errorMessage = error.message || 'An unexpected error occurred.';
        setFormError(errorMessage);
        setSubmissionStatus({ type: 'error', message: errorMessage });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/operations/schedules');
  };

  if (loadingRelatedData) {
    return <p>Loading form dependencies...</p>;
  }

  if (submissionStatus?.type === 'error' && routesList.length === 0) { // Check if initial load failed critically
      return (
        <>
            <PageHeader title="Create New Schedule" />
            <p style={{ color: 'red' }}>{typeof submissionStatus.message === 'string' ? submissionStatus.message : submissionStatus.message.join(', ')}</p>
        </>
      );
  }

  return (
    <>
      <PageHeader title="Create New Schedule" />
      {submissionStatus && submissionStatus.type !== 'error' && ( // Show only success here, formError handles form-specific issues
        <div style={{
          padding: '10px', marginBottom: '15px', borderRadius: '4px',
          border: `1px solid ${submissionStatus.type === 'success' ? 'green' : 'red'}`,
          background: submissionStatus.type === 'success' ? '#e6fffa' : '#ffebeb',
          color: submissionStatus.type === 'success' ? 'green' : 'red',
        }}>
          {typeof submissionStatus.message === 'string' ? submissionStatus.message : (
             submissionStatus.message.map((msg, idx) => <p key={idx}>{typeof msg === 'object' ? msg.message : msg}</p>)
          )}
        </div>
      )}
      <ScheduleForm
        onSubmit={handleCreateSchedule}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        routesList={routesList}
        vehicleTypesList={vehicleTypesList}
        vehiclesList={vehiclesList}
      />
    </>
  );
}
