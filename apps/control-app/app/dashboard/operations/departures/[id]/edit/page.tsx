'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, SelectOption, Button } from '@samatransport/ui';
import { DepartureForm, DepartureFormData }_from '../components/DepartureForm';
import Link from 'next/link';
import { DepartureStatusEnum } from '../components/types';

// Define types for related data
interface ScheduleInfo { id: string; route?: { name: string }; departure_time?: string; }
interface VehicleInfo { id: string; registration_number: string; }

interface DepartureAPIResponse extends DepartureFormData {
  id: string;
  schedule?: { route?: { name: string } }; // For display
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function EditDeparturePage() {
  const router = useRouter();
  const params = useParams();
  const departureId = params.id as string;

  const [initialData, setInitialData] = useState<Partial<DepartureFormData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | string[] | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error'; message: string | string[] } | null>(null);

  const [schedulesList, setSchedulesList] = useState<SelectOption[]>([]); // Usually disabled in edit, but good for context
  const [vehiclesList, setVehiclesList] = useState<SelectOption[]>([]);

  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pageTitle, setPageTitle] = useState("Edit Departure");


  const fetchDepartureAndRelatedData = useCallback(async () => {
    if (!departureId) return;
    setLoadingData(true);
    setFormError(null);
    setSubmissionStatus(null);
    setNotFound(false);

    try {
      const [departureRes, schedulesRes, vehiclesRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-departures?id=${departureId}`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-schedules?is_active=true`), // Active schedules for context
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicles?status=Active`),   // Active vehicles
      ]);

      if (!departureRes.ok) {
        if (departureRes.status === 404) { setNotFound(true); throw new Error('Departure not found.'); }
        const errorData = await departureRes.json();
        throw new Error(errorData.error || 'Failed to fetch departure data');
      }
      const departureData: DepartureAPIResponse = await departureRes.json();
      setInitialData({
        ...departureData,
        // Ensure date/time strings are in format expected by inputs if necessary
        // DepartureForm handles ISOString.slice(0,16) for datetime-local from initialData
      });
      setPageTitle(`Edit Departure: ${departureData.schedule?.route?.name || departureData.schedule_id} on ${departureData.departure_date}`);

      if (!schedulesRes.ok) console.warn('Failed to fetch schedules for context.');
      else {
        const schedulesData: ScheduleInfo[] = await schedulesRes.json();
        setSchedulesList(schedulesData.map(s => ({
            value: s.id,
            label: `${s.route?.name || 'Unknown Route'} @ ${s.departure_time ? s.departure_time.substring(0,5) : 'N/A'}`
        })));
      }

      if (!vehiclesRes.ok) console.warn('Failed to fetch vehicles.');
      else {
        const vehiclesData: VehicleInfo[] = await vehiclesRes.json();
        setVehiclesList(vehiclesData.map(v => ({ value: v.id, label: v.registration_number })));
      }

    } catch (error: any) {
      console.error("Error fetching data:", error);
      if (!notFound) {
        setSubmissionStatus({ type: 'error', message: 'Failed to load data: ' + error.message });
      }
    } finally {
      setLoadingData(false);
    }
  }, [departureId, notFound]);

  useEffect(() => {
    fetchDepartureAndRelatedData();
  }, [fetchDepartureAndRelatedData]);

  const handleUpdateDeparture = async (data: Omit<DepartureFormData, 'id'>) => {
    setIsSaving(true);
    setFormError(null);
    setSubmissionStatus(null);
    try {
      // schedule_id and departure_date are disabled in the form for edit mode
      // We only send fields that are editable.
      const { schedule_id, departure_date, ...updatePayload } = data;

      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-departures?id=${departureId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      const responseData = await response.json();
      if (!response.ok) {
        const message = Array.isArray(responseData.errors) ? responseData.errors : (responseData.error || 'Failed to update departure');
        throw { type: 'validation', messages: message };
      }
      setSubmissionStatus({ type: 'success', message: 'Departure updated successfully!' });
      // Update initialData to reflect changes without a full refetch
      setInitialData(prev => prev ? {...prev, ...responseData} : responseData);

    } catch (error: any) {
      console.error("Error updating departure:", error);
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

  if (loadingData) return <p>Loading departure data...</p>;
  if (notFound) return (
    <>
      <PageHeader title="Edit Departure" />
      <p>Departure not found.</p>
      <Link href="/dashboard/operations/departures" passHref><Button>Back to List</Button></Link>
    </>
  );
  if (submissionStatus?.type === 'error' && !initialData && !loadingData) {
    return (
      <>
        <PageHeader title="Edit Departure" />
        <p style={{ color: 'red' }}>{typeof submissionStatus.message === 'string' ? submissionStatus.message : submissionStatus.message.join(', ')}</p>
        <Link href="/dashboard/operations/departures" passHref><Button>Back to List</Button></Link>
      </>
    );
  }
  if (!initialData) return <p>Departure data could not be loaded.</p>;


  return (
    <>
      <PageHeader title={pageTitle}
        actions={
            <Button onClick={() => router.push(`/dashboard/operations/departures/${departureId}/manage-crew`)}>
                Manage Crew
            </Button>
        }
      />
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
        initialData={initialData}
        onSubmit={handleUpdateDeparture}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        schedulesList={schedulesList} // Passed for context, but schedule_id field is disabled
        vehiclesList={vehiclesList}
        isEditMode={true}
      />
    </>
  );
}
