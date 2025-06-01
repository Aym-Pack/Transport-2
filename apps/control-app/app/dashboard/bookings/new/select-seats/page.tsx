'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader, Button } from '@samatransport/ui';
import { supabaseJsClient } from '../../../../../../../supabase'; // Adjust path

interface SeatProps {
  seatNumber: string;
  status: 'available' | 'booked' | 'selected';
  onClick: (seatNumber: string) => void;
}

const SeatComponent: React.FC<SeatProps> = ({ seatNumber, status, onClick }) => {
  let bgColor = 'bg-gray-200 hover:bg-gray-300'; // available
  if (status === 'booked') {
    bgColor = 'bg-red-400 cursor-not-allowed';
  } else if (status === 'selected') {
    bgColor = 'bg-green-500 hover:bg-green-600 text-white';
  }

  return (
    <button
      type="button"
      onClick={() => status === 'available' && onClick(seatNumber)}
      disabled={status === 'booked'}
      className={`p-2 m-1 border rounded text-center w-12 h-12 ${bgColor}`}
    >
      {seatNumber}
    </button>
  );
};


const SelectSeatsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Passed data from query (ensure these are handled if null/undefined)
  const departureId = searchParams.get('departureId');
  const scheduleId = searchParams.get('scheduleId'); // schedule definition id
  const vehicleId = searchParams.get('vehicleId');
  const departurePoint = searchParams.get('dp');
  const arrivalPoint = searchParams.get('ap');
  const travelDate = searchParams.get('date');
  const departureTime = searchParams.get('dt');
  const arrivalTime = searchParams.get('at');
  const pricePerSeat = parseFloat(searchParams.get('price') || '0');

  const [vehicleCapacity, setVehicleCapacity] = useState<number>(0);
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch vehicle details (capacity) and booked seats
  useEffect(() => {
    if (!vehicleId || !departureId) {
      setError('Vehicle ID or Departure ID missing from parameters.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch Vehicle Capacity
        const { data: vehicleData, error: vehicleErr } = await supabaseJsClient.functions.invoke(
          'get-vehicle-details',
          { body: { vehicleId } }
        );
        if (vehicleErr || vehicleData.error) throw new Error(vehicleErr?.message || vehicleData?.error);
        if (!vehicleData || !vehicleData.capacity) throw new Error('Could not retrieve vehicle capacity.');
        setVehicleCapacity(vehicleData.capacity);

        // Fetch Booked Seats
        const { data: bookedSeatsData, error: bookedSeatsErr } = await supabaseJsClient.functions.invoke(
          'get-booked-seats-for-departure',
          { body: { departureId, vehicleId } }
        );
        if (bookedSeatsErr || bookedSeatsData.error) throw new Error(bookedSeatsErr?.message || bookedSeatsData?.error);
        setBookedSeats(bookedSeatsData.bookedSeats || []);

      } catch (err: any) {
        console.error("Error fetching seat data:", err);
        setError(`Failed to load seat information: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [vehicleId, departureId]);

  const handleSeatClick = useCallback((seatNumber: string) => {
    setSelectedSeats(prev =>
      prev.includes(seatNumber)
        ? prev.filter(s => s !== seatNumber)
        : [...prev, seatNumber]
    );
  }, []);

  // Generate a generic list of seat numbers, e.g., "1", "2", ... up to capacity
  // TODO: Implement a more realistic seat layout if vehicleData.layout_config is available
  const seatMap = useMemo(() => {
    return Array.from({ length: vehicleCapacity }, (_, i) => `S${i + 1}`);
  }, [vehicleCapacity]);

  const getSeatStatus = (seatNumber: string): SeatProps['status'] => {
    if (bookedSeats.includes(seatNumber)) return 'booked';
    if (selectedSeats.includes(seatNumber)) return 'selected';
    return 'available';
  };

  const totalPrice = useMemo(() => {
    return selectedSeats.length * pricePerSeat;
  }, [selectedSeats, pricePerSeat]);

  const handleNext = () => {
    if (selectedSeats.length === 0) {
        setError("Please select at least one seat.");
        return;
    }
    // TODO: Navigate to passenger details page, passing all relevant data including selectedSeats
    console.log("Proceeding to next step with:", {
        departureId, scheduleId, vehicleId, departurePoint, arrivalPoint, travelDate,
        departureTime, arrivalTime, pricePerSeat, selectedSeats, totalPrice
    });

    const queryParams = new URLSearchParams({
        // Ensure all IDs are strings for query params
        departureId: departureId || '',
        scheduleId: scheduleId || '',
        vehicleId: vehicleId || '',
        dp: departurePoint || '',
        ap: arrivalPoint || '',
        date: travelDate || '',
        dt: departureTime || '',
        at: arrivalTime || '',
        price: pricePerSeat.toString(),
        seats: selectedSeats.join(','), // Pass selected seats as a comma-separated string
        numSeats: selectedSeats.length.toString()
      }).toString();

    router.push(`/dashboard/bookings/new/passenger-details?${queryParams}`);
  };

  const handleBack = () => {
    // Navigate back to select-route, potentially with query params to re-populate fields
    router.push(`/dashboard/bookings/new/select-route`);
  };

  if (!departureId || !scheduleId || !vehicleId) {
     return (
        <div className="container mx-auto p-4">
            <PageHeader title="Error" />
            <p className="text-red-500">Missing critical booking information. Please start over.</p>
            <Button onClick={() => router.push('/dashboard/bookings/new/select-route')}>Go Back</Button>
        </div>
     );
  }

  return (
    <>
      <PageHeader title="New Booking - Step 2: Select Seats" />
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Schedule Summary */}
        <div className="mb-6 p-4 border rounded-lg shadow-sm bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">Your Selection</h2>
          <p><strong>Route:</strong> {departurePoint || 'N/A'} to {arrivalPoint || 'N/A'}</p>
          <p><strong>Date:</strong> {travelDate || 'N/A'}</p>
          <p><strong>Time:</strong> {departureTime || 'N/A'} - {arrivalTime || 'N/A'}</p>
          <p><strong>Price per Seat:</strong> ${pricePerSeat.toFixed(2)}</p>
        </div>

        {loading && <p>Loading seat information...</p>}
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {!loading && !error && (
          <>
            {/* Seat Map Area */}
            <div className="mb-6 p-4 border rounded-lg">
              <h3 className="text-lg font-medium mb-2">Seat Map (Vehicle Capacity: {vehicleCapacity})</h3>
              <div className="flex flex-wrap justify-center">
                {seatMap.map(seatNumber => (
                  <SeatComponent
                    key={seatNumber}
                    seatNumber={seatNumber}
                    status={getSeatStatus(seatNumber)}
                    onClick={handleSeatClick}
                  />
                ))}
                {vehicleCapacity === 0 && <p>No seat layout information available.</p>}
              </div>
            </div>

            {/* Selected Seats Summary */}
            {selectedSeats.length > 0 && (
              <div className="mb-6 p-4 border rounded-lg shadow-sm bg-blue-50">
                <h3 className="text-lg font-medium mb-2">Your Selected Seats</h3>
                <p><strong>Seats:</strong> {selectedSeats.join(', ')}</p>
                <p><strong>Total Price:</strong> ${totalPrice.toFixed(2)}</p>
              </div>
            )}
          </>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button onClick={handleBack} variant="outline">
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={loading || selectedSeats.length === 0}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
};

export default SelectSeatsPage;
