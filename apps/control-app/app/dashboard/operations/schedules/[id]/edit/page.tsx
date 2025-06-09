'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, SelectOption, Button } from '@samatransport/ui';
import { ScheduleForm, ScheduleFormData } from '../components/ScheduleForm';
import Link from 'next/link';

// Define types for related data
interface RouteInfo { id: string; name: string; }
interface VehicleTypeInfo { id: string; name: string; }
interface VehicleInfo { id: string; registration_number: string; }

interface ScheduleAPIResponse extends ScheduleFormData {
  id: string;
  // Potentially joined data for display, though form expects IDs
  route?: { name: string };
  default_vehicle_type?: { name: string };
  assigned_vehicle?: { registration_number: string };
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function EditSchedulePage() {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.id as string;

  const [initialData, setInitialData] = useState<Partial<ScheduleFormData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | string[] | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error'; message: string | string[] } | null>(null);

  const [routesList, setRoutesList] = useState<SelectOption[]>([]);
  const [vehicleTypesList, setVehicleTypesList] = useState<SelectOption[]>([]);
  const [vehiclesList, setVehiclesList] = useState<SelectOption[]>([]);

  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchScheduleAndRelatedData = useCallback(async () => {
    if (!scheduleId) return;
    setLoadingData(true);
    setFormError(null);
    setSubmissionStatus(null);
    setNotFound(false);

    try {
      const [scheduleRes, routesRes, vehicleTypesRes, vehiclesRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-schedules?id=${scheduleId}`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-routes`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicle-types`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicles?status=Active`), // Fetch active vehicles
      ]);

      if (!scheduleRes.ok) {
        if (scheduleRes.status === 404) { setNotFound(true); throw new Error('Schedule not found.'); }
        const errorData = await scheduleRes.json();
        throw new Error(errorData.error || 'Failed to fetch schedule data');
      }
      const scheduleData: ScheduleAPIResponse = await scheduleRes.json();
      setInitialData(scheduleData);

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
      console.error("Error fetching data:", error);
      if (!notFound) {
        setSubmissionStatus({ type: 'error', message: 'Failed to load data: ' + error.message });
      }
    } finally {
      setLoadingData(false);
    }
  }, [scheduleId, notFound]);

  useEffect(() => {
    fetchScheduleAndRelatedData();
  }, [fetchScheduleAndRelatedData]);

  const handleUpdateSchedule = async (data: ScheduleFormData) => {
    setIsSaving(true);
    setFormError(null);
    setSubmissionStatus(null);
    try {
      const { id, ...updatePayload } = data; // id is not part of update payload body
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-schedules?id=${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      const responseData = await response.json();
      if (!response.ok) {
        const message = Array.isArray(responseData.errors) ? responseData.errors : (responseData.error || 'Failed to update schedule');
        throw { type: 'validation', messages: message };
      }
      setSubmissionStatus({ type: 'success', message: 'Schedule updated successfully!' });
      // Optionally update initialData or re-fetch
    } catch (error: any) {
      console.error("Error updating schedule:", error);
      if (error.type === 'validation') {
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

  if (loadingData) return <p>Loading schedule data...</p>;
  if (notFound) return (
    <>
      <PageHeader title="Edit Schedule" />
      <p>Schedule not found.</p>
      <Link href="/dashboard/operations/schedules" passHref><Button>Back to List</Button></Link>
    </>
  );
  if (submissionStatus?.type === 'error' && !initialData && !loadingData) { // If initial load failed critically
    return (
      <>
        <PageHeader title="Edit Schedule" />
        <p style={{ color: 'red' }}>{typeof submissionStatus.message === 'string' ? submissionStatus.message : submissionStatus.message.join(', ')}</p>
        <Link href="/dashboard/operations/schedules" passHref><Button>Back to List</Button></Link>
      </>
    );
  }
  if (!initialData) return <p>Schedule data could not be loaded.</p>;

  const pageTitle = `Edit Schedule (Route: ${initialData?.route?.name || initialData.route_id})`;

  return (
    <>
      <PageHeader title={pageTitle} />
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
        initialData={initialData}
        onSubmit={handleUpdateSchedule}
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
