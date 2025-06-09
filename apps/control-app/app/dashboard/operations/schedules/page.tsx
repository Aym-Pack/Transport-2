'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition, Select, SelectOption } from '@samatransport/ui';

export interface Schedule {
  id: string; // UUID
  route_id: string;
  departure_time: string; // HH:MM
  arrival_time: string; // HH:MM
  days_of_operation: number[];
  default_vehicle_type_id: string;
  vehicle_id?: string | null;
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined data from Edge Function
  route?: { name: string };
  default_vehicle_type?: { name: string };
  assigned_vehicle?: { registration_number: string };
}

interface RouteInfo { id: string; name: string; } // For filter dropdown

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const router = useRouter();

  const [routesList, setRoutesList] = useState<SelectOption[]>([]);
  const [filterRouteId, setFilterRouteId] = useState<string>('');
  const [filterIsActive, setFilterIsActive] = useState<string>(''); // 'true', 'false', or ''

  const fetchSchedulesAndRoutes = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      // Fetch routes for filter dropdown (only once or if routes change)
      if (routesList.length === 0) {
        const routesRes = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-routes`);
        if (routesRes.ok) {
          const routesData: RouteInfo[] = await routesRes.json();
          setRoutesList([{value: '', label: 'All Routes'}, ...routesData.map(r => ({ value: r.id, label: r.name }))]);
        } else {
          console.warn("Could not fetch routes for filtering.");
        }
      }

      // Fetch schedules
      let url = `${SUPABASE_FUNCTIONS_BASE_URL}/crud-schedules`;
      const params = new URLSearchParams();
      if (filterRouteId) params.append('route_id', filterRouteId);
      if (filterIsActive !== '') params.append('is_active', filterIsActive);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch schedules: ${response.status}`);
      }
      const data: Schedule[] = await response.json();
      setSchedules(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
      console.error("Error fetching schedules:", err);
    } finally {
      setLoading(false);
    }
  }, [filterRouteId, filterIsActive, routesList.length]); // routesList.length to refetch only if it was empty

  useEffect(() => {
    fetchSchedulesAndRoutes();
  }, [fetchSchedulesAndRoutes]);

  const handleDelete = async (scheduleId: string) => {
    setFeedback(null);
    if (window.confirm('Are you sure you want to delete this schedule? This may fail if there are active departures using it.')) {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-schedules?id=${scheduleId}`, {
          method: 'DELETE',
        });
        const responseData = response.status === 204 ? { message: 'Schedule deleted successfully!' } : await response.json();
        if (!response.ok && response.status !== 204) {
          throw new Error(responseData.error || responseData.message || `Failed to delete schedule: ${response.status}`);
        }
        setFeedback({ type: 'success', message: responseData.message || 'Schedule deleted successfully!' });
        fetchSchedulesAndRoutes(); // Refresh
      } catch (err: any) {
        setFeedback({ type: 'error', message: `Error deleting schedule: ${err.message}` });
        console.error("Error deleting schedule:", err);
      }
    }
  };

  const formatDays = (days: number[]): string => {
    const dayMap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(d => dayMap[d-1] || d.toString()).join(', ');
  }

  const columns: ColumnDefinition<Schedule>[] = [
    { header: 'Route', accessor: (row) => row.route?.name || row.route_id },
    { header: 'Departure', accessor: 'departure_time' },
    { header: 'Arrival', accessor: 'arrival_time' },
    { header: 'Days', accessor: (row) => formatDays(row.days_of_operation) },
    { header: 'Default Vehicle Type', accessor: (row) => row.default_vehicle_type?.name || row.default_vehicle_type_id },
    { header: 'Assigned Vehicle', accessor: (row) => row.assigned_vehicle?.registration_number || 'N/A' },
    { header: 'Active', accessor: (row) => (row.is_active ? 'Yes' : 'No') },
    {
      header: 'Actions',
      accessor: (row) => (
        <div style={{display: 'flex', gap: '5px'}}>
          <Button onClick={() => router.push(`/dashboard/operations/schedules/${row.id}/edit`)}>Edit</Button>
          <Button onClick={() => handleDelete(row.id)} style={{ background: 'red' }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Manage Schedules"
        actions={<Link href="/dashboard/operations/schedules/new" passHref><Button>New Schedule</Button></Link>}
      />
      {feedback && (
        <div style={{
          padding: '10px', margin: '10px 0', borderRadius: '4px',
          border: `1px solid ${feedback.type === 'success' ? 'green' : 'red'}`,
          background: feedback.type === 'success' ? '#e6fffa' : '#ffebeb',
          color: feedback.type === 'success' ? 'green' : 'red',
        }}>{feedback.message}</div>
      )}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <Select label="Filter by Route:" options={routesList} value={filterRouteId} onChange={(e) => setFilterRouteId(e.target.value)} name="filterRouteId"/>
        <Select label="Filter by Status:" options={[{value: '', label: 'All Statuses'}, {value: 'true', label: 'Active'}, {value: 'false', label: 'Inactive'}]} value={filterIsActive} onChange={(e) => setFilterIsActive(e.target.value)} name="filterIsActive"/>
      </div>
      {loading && <p>Loading schedules...</p>}
      {feedback?.type === 'error' && !loading && <p style={{ color: 'red' }}>{feedback.message}</p>}
      {!loading && !feedback?.type === 'error' && <DataTable data={schedules} columns={columns} />}
    </>
  );
}
