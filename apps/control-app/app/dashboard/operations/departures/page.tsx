'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition, Select, SelectOption, Input } from '@samatransport/ui';
import { DepartureStatusEnum } from './components/types'; // Assuming types are defined here or imported

// Define the Departure type based on your table structure and expected joined data
export interface Departure {
  id: string; // BIGSERIAL
  schedule_id: string; // UUID
  departure_date: string; // DATE
  planned_departure_time: string; // TIMETZ
  planned_arrival_time: string; // TIMETZ
  actual_departure_time?: string | null; // TIMESTAMPTZ
  actual_arrival_time?: string | null; // TIMESTAMPTZ
  assigned_vehicle_id?: string | null; // UUID
  status: DepartureStatusEnum;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;

  // Joined data from Edge Function
  schedule?: {
    id: string;
    departure_time: string;
    arrival_time: string;
    route?: { id: string; name: string; start_city: string; end_city: string; };
    default_vehicle_type?: { id: string; name: string; };
  };
  assigned_vehicle?: { id: string; registration_number: string; make?: string; model?: string; };
  departure_crew?: Array<{
    id: string; // BIGSERIAL (crew assignment ID)
    assigned_role_in_departure: string;
    staff_member?: { id: string; first_name: string; last_name: string; staff_type: string; };
  }>;
}

interface RouteInfo { id: string; name: string; } // For filter dropdown
interface ScheduleInfo { id: string; route: { name: string }; departure_time: string; } // For filter


const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';
const statusOptions: SelectOption[] = [{value: '', label: 'All Statuses'}, ...Object.values(DepartureStatusEnum).map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, ' ') }))];


export default function DeparturesPage() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const router = useRouter();

  const [schedulesList, setSchedulesList] = useState<SelectOption[]>([]);
  const [filterScheduleId, setFilterScheduleId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default to today

  const fetchDeparturesAndFilters = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      // Fetch schedules for filter dropdown (only once or if schedules change)
      if (schedulesList.length === 0) {
        const schedulesRes = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-schedules`); // Assuming this fetches all schedules with route names
        if (schedulesRes.ok) {
          const schedulesData: Schedule[] = await schedulesRes.json();
          setSchedulesList([{value: '', label: 'All Schedules'}, ...schedulesData.map(s => ({ value: s.id, label: `${s.route?.name || s.route_id} @ ${s.departure_time}` }))]);
        } else {
          console.warn("Could not fetch schedules for filtering.");
        }
      }

      // Fetch departures
      let url = `${SUPABASE_FUNCTIONS_BASE_URL}/crud-departures`;
      const params = new URLSearchParams();
      if (filterScheduleId) params.append('schedule_id', filterScheduleId);
      if (filterStatus) params.append('status', filterStatus);
      if (filterDate) params.append('departure_date', filterDate);
      // Add other filters like route_id if backend supports it directly or via schedule_id
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch departures: ${response.status}`);
      }
      const data: Departure[] = await response.json();
      setDepartures(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
      console.error("Error fetching departures:", err);
    } finally {
      setLoading(false);
    }
  }, [filterScheduleId, filterStatus, filterDate, schedulesList.length]);

  useEffect(() => {
    fetchDeparturesAndFilters();
  }, [fetchDeparturesAndFilters]);

  const handleDelete = async (departureId: string) => {
    setFeedback(null);
    if (window.confirm('Are you sure you want to delete this departure instance?')) {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-departures?id=${departureId}`, {
          method: 'DELETE',
        });
        const responseData = response.status === 204 ? { message: 'Departure deleted successfully!' } : await response.json();
        if (!response.ok && response.status !== 204) {
          throw new Error(responseData.error || responseData.message || `Failed to delete departure: ${response.status}`);
        }
        setFeedback({ type: 'success', message: responseData.message || 'Departure deleted successfully!' });
        fetchDeparturesAndFilters(); // Refresh
      } catch (err: any) {
        setFeedback({ type: 'error', message: `Error deleting departure: ${err.message}` });
        console.error("Error deleting departure:", err);
      }
    }
  };

  const formatTime = (timeStr?: string | null) => timeStr ? new Date(`1970-01-01T${timeStr}Z`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', timeZone: 'UTC'}) : 'N/A';
  const formatDateTime = (dateTimeStr?: string | null) => dateTimeStr ? new Date(dateTimeStr).toLocaleString() : 'N/A';

  const columns: ColumnDefinition<Departure>[] = [
    { header: 'Route', accessor: (row) => row.schedule?.route?.name || row.schedule_id },
    { header: 'Date', accessor: 'departure_date' },
    { header: 'Planned Dep.', accessor: (row) => formatTime(row.planned_departure_time) },
    { header: 'Actual Dep.', accessor: (row) => formatDateTime(row.actual_departure_time) },
    { header: 'Status', accessor: 'status' },
    { header: 'Vehicle', accessor: (row) => row.assigned_vehicle?.registration_number || 'N/A' },
    {
      header: 'Crew',
      accessor: (row) => row.departure_crew && row.departure_crew.length > 0
                       ? row.departure_crew.map(c => `${c.staff_member?.first_name || ''} (${c.assigned_role_in_departure})`).join(', ')
                       : 'No crew'
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div style={{display: 'flex', gap: '5px', alignItems: 'center'}}>
          <Button onClick={() => router.push(`/dashboard/operations/departures/${row.id}/edit`)} size="small">Edit</Button>
          <Button onClick={() => router.push(`/dashboard/operations/departures/${row.id}/manage-crew`)} size="small">Manage Crew</Button>
          <Button onClick={() => handleDelete(row.id)} style={{ background: 'red' }} size="small">Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Manage Departures"
        actions={<Link href="/dashboard/operations/departures/new" passHref><Button>New Departure Instance</Button></Link>}
      />
      {feedback && (
        <div style={{
          padding: '10px', margin: '10px 0', borderRadius: '4px',
          border: `1px solid ${feedback.type === 'success' ? 'green' : 'red'}`,
          background: feedback.type === 'success' ? '#e6fffa' : '#ffebeb',
          color: feedback.type === 'success' ? 'green' : 'red',
        }}>{feedback.message}</div>
      )}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <Input label="Filter by Date:" type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} name="filterDate"/>
        <Select label="Filter by Schedule:" options={schedulesList} value={filterScheduleId} onChange={(e) => setFilterScheduleId(e.target.value)} name="filterScheduleId"/>
        <Select label="Filter by Status:" options={statusOptions} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} name="filterStatus"/>
      </div>
      {loading && <p>Loading departures...</p>}
      {feedback?.type === 'error' && !loading && <p style={{ color: 'red' }}>{feedback.message}</p>}
      {!loading && !(feedback?.type === 'error' && departures.length === 0) && <DataTable data={departures} columns={columns} />}
    </>
  );
}
