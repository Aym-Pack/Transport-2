'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition } from '@samatransport/ui';

// Define the Agency type based on your table structure
interface Agency {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country_code?: string;
  phone_number?: string;
  email?: string;
  operational_currency_code: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Assume Supabase functions are served at this base URL.
// In a real app, this would come from an environment variable.
const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';


export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchAgencies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-agencies`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add Authorization header if your Edge Function requires it
          // 'Authorization': `Bearer ${YOUR_SUPABASE_ANON_KEY_OR_JWT}`
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch agencies: ${response.status}`);
      }
      const data: Agency[] = await response.json();
      setAgencies(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching agencies:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]);

  const handleDelete = async (agencyId: string) => {
    if (window.confirm('Are you sure you want to delete this agency?')) {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-agencies?id=${agencyId}`, {
          method: 'DELETE',
          // Add Authorization header if needed
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to delete agency: ${response.status}`);
        }
        alert('Agency deleted successfully!');
        fetchAgencies(); // Refresh the list
      } catch (err: any) {
        alert(`Error deleting agency: ${err.message}`);
        console.error("Error deleting agency:", err);
      }
    }
  };

  const columns: ColumnDefinition<Agency>[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'City', accessor: 'city' },
    { header: 'Country', accessor: 'country_code' },
    { header: 'Phone', accessor: 'phone_number' },
    { header: 'Email', accessor: 'email' },
    { header: 'Currency', accessor: 'operational_currency_code' },
    {
      header: 'Status',
      accessor: (row) => (row.is_active ? 'Active' : 'Inactive'),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <>
          <Button onClick={() => router.push(`/dashboard/agencies/${row.id}/edit`)} style={{ marginRight: '5px' }}>
            Edit
          </Button>
          <Button onClick={() => handleDelete(row.id)} style={{ background: 'red' }}>
            Delete
          </Button>
        </>
      ),
    },
  ];

  if (loading) return <p>Loading agencies...</p>;
  if (error) return <p style={{ color: 'red' }}>Error loading agencies: {error}</p>;

  return (
    <>
      <PageHeader
        title="Agencies"
        actions={
          <Link href="/dashboard/agencies/new" passHref>
            <Button>New Agency</Button>
          </Link>
        }
      />
      <DataTable data={agencies} columns={columns} />
    </>
  );
}
