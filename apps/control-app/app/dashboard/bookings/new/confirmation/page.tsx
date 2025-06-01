'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader, Button } from '@samatransport/ui';

interface Passenger { // Ensure this matches
  seatNumber: string;
  fullName: string;
  // other fields if needed for display
}

const ConfirmationPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract data (same as payment page for now)
  const departurePoint = searchParams.get('dp');
  const arrivalPoint = searchParams.get('ap');
  const travelDate = searchParams.get('date');
  const departureTime = searchParams.get('dt');
  const arrivalTime = searchParams.get('at');
  const selectedSeatIdentifiers = useMemo(() => (searchParams.get('seats') || '').split(',').filter(s => s), [searchParams]);
  const totalPrice = parseFloat(searchParams.get('totalPrice') || '0');

  const passengers: Passenger[] = useMemo(() => {
    const passengersString = searchParams.get('passengers');
    try {
      return passengersString ? JSON.parse(passengersString) : [];
    } catch (e) {
      console.error("Failed to parse passengers JSON for confirmation:", e);
      return [];
    }
  }, [searchParams]);

  // Placeholder for a real booking ID
  const bookingId = searchParams.get('bookingId') || `SIM-${Date.now().toString().slice(-6)}`;


  return (
    <>
      <PageHeader title="Booking Confirmation" />
      <div className="container mx-auto p-4 max-w-2xl text-center">

        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-6 mb-8 rounded-md shadow-md">
          <h2 className="text-2xl font-bold mb-3">Booking Confirmed!</h2>
          <p className="text-md">Thank you for booking with us. Your booking (ID: <span className="font-semibold">{bookingId}</span>) has been successfully processed.</p>
        </div>

        <div className="mb-8 p-6 border rounded-lg shadow-sm bg-white text-left">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Booking Summary</h3>
          <p><strong>Route:</strong> {departurePoint} to {arrivalPoint}</p>
          <p><strong>Date:</strong> {travelDate}</p>
          <p><strong>Time:</strong> {departureTime} - {arrivalTime}</p>
          <p><strong>Selected Seats:</strong> {selectedSeatIdentifiers.join(', ')}</p>
          <p className="mt-2"><strong>Passengers:</strong></p>
          <ul className="list-disc list-inside pl-4 mb-3 text-sm">
            {passengers.map((p, index) => (
              <li key={index}>{p.fullName} (Seat: {p.seatNumber})</li>
            ))}
          </ul>
          <p className="text-lg font-bold"><strong>Total Price:</strong> ${totalPrice.toFixed(2)}</p>
        </div>

        <div className="space-y-4 md:space-y-0 md:flex md:justify-center md:space-x-4">
          <Button
            onClick={() => router.push('/dashboard/bookings/new/select-route')}
            variant="solid" // Assuming solid is a primary style
            className="w-full md:w-auto"
          >
            Make Another Booking
          </Button>
          <Button
            onClick={() => router.push('/dashboard/bookings/list')} // Placeholder link
            variant="outline"
            className="w-full md:w-auto"
          >
            View My Bookings
          </Button>
        </div>
      </div>
    </>
  );
};

export default ConfirmationPage;
