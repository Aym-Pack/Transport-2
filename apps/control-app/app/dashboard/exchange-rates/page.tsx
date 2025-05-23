'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition } from '@samatransport/ui';

// Define the ExchangeRate type based on your table structure
export interface ExchangeRate {
  id: string; // Assuming it's a BIGSERIAL, so string from JSON
  source_currency_code: string;
  target_currency_code: string;
  rate: number;
  last_updated_at: string;
  source_of_rate?: string | null;
  created_at?: string;
  updated_at?: string;
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function ExchangeRatesPage() {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchExchangeRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-exchange-rates`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch exchange rates: ${response.status}`);
      }
      const data: ExchangeRate[] = await response.json();
      setExchangeRates(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching exchange rates:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExchangeRates();
  }, [fetchExchangeRates]);

  const handleDelete = async (rateId: string) => {
    if (window.confirm('Are you sure you want to delete this exchange rate?')) {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-exchange-rates?id=${rateId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to delete exchange rate: ${response.status}`);
        }
        alert('Exchange rate deleted successfully!');
        fetchExchangeRates(); // Refresh the list
      } catch (err: any) {
        alert(`Error deleting exchange rate: ${err.message}`);
        console.error("Error deleting exchange rate:", err);
      }
    }
  };

  const columns: ColumnDefinition<ExchangeRate>[] = [
    { header: 'Source Currency', accessor: 'source_currency_code' },
    { header: 'Target Currency', accessor: 'target_currency_code' },
    { 
      header: 'Rate', 
      accessor: (row) => row.rate.toFixed(6) // Display rate with precision
    },
    { header: 'Source of Rate', accessor: (row) => row.source_of_rate || '-' },
    {
      header: 'Last Updated',
      accessor: (row) => new Date(row.last_updated_at).toLocaleString(),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <>
          <Button onClick={() => router.push(`/dashboard/exchange-rates/${row.id}/edit`)} style={{ marginRight: '5px' }}>
            Edit
          </Button>
          <Button onClick={() => handleDelete(row.id)} style={{ background: 'red' }}>
            Delete
          </Button>
        </>
      ),
    },
  ];

  if (loading) return <p>Loading exchange rates...</p>;
  if (error) return <p style={{ color: 'red' }}>Error loading exchange rates: {error}</p>;

  return (
    <>
      <PageHeader
        title="Exchange Rates"
        actions={
          <Link href="/dashboard/exchange-rates/new" passHref>
            <Button>New Exchange Rate</Button>
          </Link>
        }
      />
      <DataTable data={exchangeRates} columns={columns} />
    </>
  );
}
