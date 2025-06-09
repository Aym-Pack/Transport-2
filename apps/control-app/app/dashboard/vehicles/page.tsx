'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition } from '@samatransport/ui';

// Define the Vehicle type based on your table structure and expected joined data
export interface Vehicle {
  id: string;
  registration_number: string;
  make?: string;
  model?: string;
  year_of_manufacture?: number | null;
  vehicle_type_id: string;
  assigned_agency_id?: string | null;
  status?: string;
  last_maintenance_date?: string | null;
  next_maintenance_due_date?: string | null;
  created_at?: string;
  updated_at?: string;
  // Assuming the backend joins these names, or they are fetched separately
  vehicle_types?: { name: string }; // From joined data
  agencies?: { name: string }; // From joined data
}


const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicles`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch vehicles: ${response.status}`);
      }
      const data: Vehicle[] = await response.json();
      setVehicles(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching vehicles:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleDelete = async (vehicleId: string) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicles?id=${vehicleId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to delete vehicle: ${response.status}`);
        }
        alert('Vehicle deleted successfully!');
        fetchVehicles(); // Refresh the list
      } catch (err: any) {
        alert(`Error deleting vehicle: ${err.message}`);
        console.error("Error deleting vehicle:", err);
      }
    }
  };

  const columns: ColumnDefinition<Vehicle>[] = [
    { header: 'Reg. Number', accessor: 'registration_number' },
    { header: 'Make', accessor: 'make' },
    { header: 'Model', accessor: 'model' },
    { header: 'Year', accessor: 'year_of_manufacture' },
    {
      header: 'Type',
      accessor: (row) => row.vehicle_types?.name || row.vehicle_type_id, // Display name if available
    },
    {
      header: 'Agency',
      accessor: (row) => row.agencies?.name || row.assigned_agency_id || 'N/A', // Display name if available
    },
    { header: 'Status', accessor: 'status' },
    {
      header: 'Actions',
      accessor: (row) => (
        <>
          <Button onClick={() => router.push(`/dashboard/vehicles/${row.id}/edit`)} style={{ marginRight: '5px' }}>
            Edit
          </Button>
          <Button onClick={() => handleDelete(row.id)} style={{ background: 'red' }}>
            Delete
          </Button>
        </>
      ),
    },
  ];

  if (loading) return <p>Loading vehicles...</p>;
  if (error) return <p style={{ color: 'red' }}>Error loading vehicles: {error}</p>;

  return (
    <>
      <PageHeader
        title="Fleet Vehicles"
        actions={
          <Link href="/dashboard/vehicles/new" passHref>
            <Button>New Vehicle</Button>
          </Link>
        }
      />
      <DataTable data={vehicles} columns={columns} />
    </>
  );
}
