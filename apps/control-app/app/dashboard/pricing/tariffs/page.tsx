'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition } from '@samatransport/ui';

// Define the PassengerTariff type based on your table structure and expected joined data
export interface PassengerTariff {
  id: string; // BIGINT from DB, string in JS
  name: string;
  route_id?: string | null;
  vehicle_type_id?: string | null;
  passenger_category: string;
  price: number;
  currency_code: string;
  valid_from?: string | null;
  valid_until?: string | null;
  days_of_week?: number[] | null;
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined data (names/symbols)
  routes?: { name: string };
  vehicle_types?: { name: string };
  currencies?: { name: string; symbol: string };
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function PassengerTariffsPage() {
  const [tariffs, setTariffs] = useState<PassengerTariff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchTariffs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-passenger-tariffs`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch passenger tariffs: ${response.status}`);
      }
      const data: PassengerTariff[] = await response.json();
      setTariffs(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching passenger tariffs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTariffs();
  }, [fetchTariffs]);

  const handleDelete = async (tariffId: string) => {
    if (window.confirm('Are you sure you want to delete this passenger tariff?')) {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-passenger-tariffs?id=${tariffId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to delete passenger tariff: ${response.status}`);
        }
        alert('Passenger tariff deleted successfully!');
        fetchTariffs(); // Refresh the list
      } catch (err: any) {
        alert(`Error deleting passenger tariff: ${err.message}`);
        console.error("Error deleting passenger tariff:", err);
      }
    }
  };

  const columns: ColumnDefinition<PassengerTariff>[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Category', accessor: 'passenger_category' },
    { 
      header: 'Price', 
      accessor: (row) => `${row.price.toFixed(2)} ${row.currencies?.symbol || row.currency_code}` 
    },
    { header: 'Route', accessor: (row) => row.routes?.name || 'General' },
    { header: 'Vehicle Type', accessor: (row) => row.vehicle_types?.name || 'General' },
    { 
      header: 'Days', 
      accessor: (row) => row.days_of_week && row.days_of_week.length > 0 ? row.days_of_week.join(',') : 'All' 
    },
    { header: 'Status', accessor: (row) => (row.is_active ? 'Active' : 'Inactive') },
    {
      header: 'Actions',
      accessor: (row) => (
        <>
          <Button onClick={() => router.push(`/dashboard/pricing/tariffs/${row.id}/edit`)} style={{ marginRight: '5px' }}>
            Edit
          </Button>
          <Button onClick={() => handleDelete(row.id)} style={{ background: 'red' }}>
            Delete
          </Button>
        </>
      ),
    },
  ];

  if (loading) return <p>Loading passenger tariffs...</p>;
  if (error) return <p style={{ color: 'red' }}>Error loading passenger tariffs: {error}</p>;

  return (
    <>
      <PageHeader
        title="Passenger Tariffs"
        actions={
          <Link href="/dashboard/pricing/tariffs/new" passHref>
            <Button>New Tariff</Button>
          </Link>
        }
      />
      <DataTable data={tariffs} columns={columns} />
    </>
  );
}
