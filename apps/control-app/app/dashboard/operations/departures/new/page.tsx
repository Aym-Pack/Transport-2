'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, SelectOption } from '@samatransport/ui';
import { DepartureForm, DepartureFormData } from '../components/DepartureForm';
import { DepartureStatusEnum } from '../components/types'; // Import ENUM

// Define types for related data
interface ScheduleInfo {
  id: string;
  // Assuming Edge function for schedules returns route name and times for better labeling
  route?: { name: string };
  departure_time?: string;
  arrival_time?: string;
}
interface VehicleInfo { id: string; registration_number: string; }

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function NewDeparturePage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | string[] | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error'; message: string | string[] } | null>(null);

  const [schedulesList, setSchedulesList] = useState<SelectOption[]>([]);
  const [vehiclesList, setVehiclesList] = useState<SelectOption[]>([]);
  const [loadingRelatedData, setLoadingRelatedData] = useState(true);

  const fetchRelatedData = useCallback(async () => {
    setLoadingRelatedData(true);
    setFormError(null);
    setSubmissionStatus(null);
    try {
      const [schedulesRes, vehiclesRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-schedules?is_active=true`), // Fetch only active schedules
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicles?status=Active`), // Fetch only active vehicles
      ]);

      if (!schedulesRes.ok) throw new Error('Failed to fetch active schedules');
      const schedulesData: ScheduleInfo[] = await schedulesRes.json();
      setSchedulesList(schedulesData.map(s => ({
        value: s.id,
        label: `${s.route?.name || 'Unknown Route'} @ ${s.departure_time ? s.departure_time.substring(0,5) : 'N/A'}`
      })));

      if (!vehiclesRes.ok) throw new Error('Failed to fetch active vehicles');
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

  const handleCreateDeparture = async (data: Omit<DepartureFormData, 'id'>) => {
    setIsSaving(true);
    setFormError(null);
    setSubmissionStatus(null);
    try {
      // Ensure status defaults if not set by form (though form has a default)
      const payload = {
        ...data,
        status: data.status || DepartureStatusEnum.SCHEDULED,
      };
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-departures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();
      if (!response.ok) {
        const message = Array.isArray(responseData.errors) ? responseData.errors : (responseData.error || 'Failed to create departure');
        throw { type: 'validation', messages: message };
      }
      // The backend POST for departures now includes crew assignment.
      // If crew_assignments are part of DepartureFormData and handled by DepartureForm, they'd be in `data`.
      // For now, assuming basic departure creation, crew managed separately.
      setSubmissionStatus({ type: 'success', message: `Departure created successfully (ID: ${responseData.id})! You can manage crew on the edit page. Redirecting...` });
      setTimeout(() => router.push('/dashboard/operations/departures'), 3000); // Longer timeout to read message
    } catch (error: any) {
      console.error("Error creating departure:", error);
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
    router.push('/dashboard/operations/departures');
  };

  if (loadingRelatedData) {
    return <p>Loading form dependencies...</p>;
  }

  if (submissionStatus?.type === 'error' && schedulesList.length === 0) {
      return (
        <>
            <PageHeader title="Create New Departure Instance" />
            <p style={{ color: 'red' }}>{typeof submissionStatus.message === 'string' ? submissionStatus.message : submissionStatus.message.join(', ')}</p>
        </>
      );
  }

  return (
    <>
      <PageHeader title="Create New Departure Instance" />
      {submissionStatus && submissionStatus.type !== 'error' && (
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
      <DepartureForm
        onSubmit={handleCreateDeparture}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        schedulesList={schedulesList}
        vehiclesList={vehiclesList}
        isEditMode={false}
      />
    </>
  );
}
