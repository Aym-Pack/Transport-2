'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition } from '@samatransport/ui';

// Define the Currency type based on your table structure
export interface Currency {
  code: string;
  name: string;
  symbol?: string;
  created_at?: string;
  updated_at?: string;
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchCurrencies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-currencies`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch currencies: ${response.status}`);
      }
      const data: Currency[] = await response.json();
      setCurrencies(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching currencies:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  const handleDelete = async (currencyCode: string) => {
    if (window.confirm(`Are you sure you want to delete currency ${currencyCode}? This action cannot be undone if the currency is in use.`)) {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-currencies?code=${currencyCode}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
           if (response.status === 409) { // Conflict due to FK constraint
             throw new Error(errorData.error || `Cannot delete currency: ${currencyCode}. It is currently in use by other records (e.g., agencies, exchange rates). Please update those records before deleting this currency.`);
           }
          throw new Error(errorData.error || `Failed to delete currency: ${response.status}`);
        }
        alert('Currency deleted successfully!');
        fetchCurrencies(); // Refresh the list
      } catch (err: any) {
        alert(`Error deleting currency: ${err.message}`);
        console.error("Error deleting currency:", err);
      }
    }
  };

  const columns: ColumnDefinition<Currency>[] = [
    { header: 'Code', accessor: 'code' },
    { header: 'Name', accessor: 'name' },
    { header: 'Symbol', accessor: (row) => row.symbol || '-' },
    {
      header: 'Actions',
      accessor: (row) => (
        <>
          <Button onClick={() => router.push(`/dashboard/currencies/${row.code}/edit`)} style={{ marginRight: '5px' }}>
            Edit
          </Button>
          <Button onClick={() => handleDelete(row.code)} style={{ background: 'red' }}>
            Delete
          </Button>
        </>
      ),
    },
  ];

  if (loading) return <p>Loading currencies...</p>;
  if (error) return <p style={{ color: 'red' }}>Error loading currencies: {error}</p>;

  return (
    <>
      <PageHeader
        title="Currencies"
        actions={
          <Link href="/dashboard/currencies/new" passHref>
            <Button>New Currency</Button>
          </Link>
        }
      />
      <DataTable data={currencies} columns={columns} />
    </>
  );
}
