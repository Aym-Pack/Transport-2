'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition } from '@samatransport/ui';

// Define the VehicleType type based on your table structure
export interface VehicleType {
  id: string;
  name: string;
  capacity_passengers?: number | null;
  capacity_cargo_kg?: number | null;
  description?: string;
  is_passenger_vehicle: boolean;
  is_cargo_vehicle: boolean;
  created_at?: string;
  updated_at?: string;
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function VehicleTypesPage() {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchVehicleTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicle-types`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch vehicle types: ${response.status}`);
      }
      const data: VehicleType[] = await response.json();
      setVehicleTypes(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching vehicle types:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicleTypes();
  }, [fetchVehicleTypes]);

  const handleDelete = async (typeId: string) => {
    if (window.confirm('Are you sure you want to delete this vehicle type?')) {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicle-types?id=${typeId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to delete vehicle type: ${response.status}`);
        }
        alert('Vehicle type deleted successfully!');
        fetchVehicleTypes(); // Refresh the list
      } catch (err: any) {
        alert(`Error deleting vehicle type: ${err.message}`);
        console.error("Error deleting vehicle type:", err);
      }
    }
  };

  const columns: ColumnDefinition<VehicleType>[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Passenger Capacity', accessor: 'capacity_passengers' },
    { header: 'Cargo Capacity (kg)', accessor: 'capacity_cargo_kg' },
    {
      header: 'Is Passenger',
      accessor: (row) => (row.is_passenger_vehicle ? 'Yes' : 'No'),
    },
    {
      header: 'Is Cargo',
      accessor: (row) => (row.is_cargo_vehicle ? 'Yes' : 'No'),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <>
          <Button onClick={() => router.push(`/dashboard/vehicle-types/${row.id}/edit`)} style={{ marginRight: '5px' }}>
            Edit
          </Button>
          <Button onClick={() => handleDelete(row.id)} style={{ background: 'red' }}>
            Delete
          </Button>
        </>
      ),
    },
  ];

  if (loading) return <p>Loading vehicle types...</p>;
  if (error) return <p style={{ color: 'red' }}>Error loading vehicle types: {error}</p>;

  return (
    <>
      <PageHeader
        title="Vehicle Types"
        actions={
          <Link href="/dashboard/vehicle-types/new" passHref>
            <Button>New Vehicle Type</Button>
          </Link>
        }
      />
      <DataTable data={vehicleTypes} columns={columns} />
    </>
  );
}
