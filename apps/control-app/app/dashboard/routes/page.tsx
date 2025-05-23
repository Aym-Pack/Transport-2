'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition } from '@samatransport/ui';

// Define the Route type based on your table structure
export interface Route {
  id: string;
  name: string;
  start_city: string;
  end_city: string;
  average_duration_minutes?: number | null;
  distance_km?: number | null;
  stops_details?: any; // Can be an array or object
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-routes`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch routes: ${response.status}`);
      }
      const data: Route[] = await response.json();
      setRoutes(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching routes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const handleDelete = async (routeId: string) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-routes?id=${routeId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to delete route: ${response.status}`);
        }
        alert('Route deleted successfully!');
        fetchRoutes(); // Refresh the list
      } catch (err: any) {
        alert(`Error deleting route: ${err.message}`);
        console.error("Error deleting route:", err);
      }
    }
  };

  const columns: ColumnDefinition<Route>[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Start City', accessor: 'start_city' },
    { header: 'End City', accessor: 'end_city' },
    { header: 'Duration (min)', accessor: 'average_duration_minutes' },
    { header: 'Distance (km)', accessor: 'distance_km' },
    {
      header: 'Status',
      accessor: (row) => (row.is_active ? 'Active' : 'Inactive'),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <>
          <Button onClick={() => router.push(`/dashboard/routes/${row.id}/edit`)} style={{ marginRight: '5px' }}>
            Edit
          </Button>
          <Button onClick={() => handleDelete(row.id)} style={{ background: 'red' }}>
            Delete
          </Button>
        </>
      ),
    },
  ];

  if (loading) return <p>Loading routes...</p>;
  if (error) return <p style={{ color: 'red' }}>Error loading routes: {error}</p>;

  return (
    <>
      <PageHeader
        title="Routes"
        actions={
          <Link href="/dashboard/routes/new" passHref>
            <Button>New Route</Button>
          </Link>
        }
      />
      <DataTable data={routes} columns={columns} />
    </>
  );
}
