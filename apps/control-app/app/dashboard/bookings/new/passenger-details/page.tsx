'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader, Button, Input } from '@samatransport/ui'; // Assuming Input and Select are available or use native

interface Passenger {
  seatNumber: string;
  fullName: string;
  age: string; // Store as string to allow empty input, parse to number on submission
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say' | '';
}

const PassengerDetailsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract data from query parameters
  const departureId = searchParams.get('departureId');
  const scheduleId = searchParams.get('scheduleId');
  const vehicleId = searchParams.get('vehicleId');
  const departurePoint = searchParams.get('dp');
  const arrivalPoint = searchParams.get('ap');
  const travelDate = searchParams.get('date');
  const departureTime = searchParams.get('dt');
  const arrivalTime = searchParams.get('at');
  const pricePerSeat = parseFloat(searchParams.get('price') || '0');
  const selectedSeatIdentifiers = useMemo(() => (searchParams.get('seats') || '').split(',').filter(s => s), [searchParams]);
  const numSeats = parseInt(searchParams.get('numSeats') || '0', 10);

  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize passenger forms based on selected seats
    if (selectedSeatIdentifiers.length > 0 && passengers.length === 0) {
      setPassengers(
        selectedSeatIdentifiers.map(seat => ({
          seatNumber: seat,
          fullName: '',
          age: '',
          gender: '',
        }))
      );
    }
  }, [selectedSeatIdentifiers, passengers.length]);

  const handleInputChange = (index: number, field: keyof Omit<Passenger, 'seatNumber'>, value: string) => {
    const updatedPassengers = [...passengers];
    updatedPassengers[index] = { ...updatedPassengers[index], [field]: value };
    setPassengers(updatedPassengers);
  };

  const validateForms = () => {
    for (const passenger of passengers) {
      if (!passenger.fullName.trim()) {
        setFormError(`Full Name is required for passenger in seat ${passenger.seatNumber}.`);
        return false;
      }
    }
    setFormError(null);
    return true;
  };

  const handleNext = () => {
    if (!validateForms()) {
      return;
    }
    // TODO: Navigate to Payment page or summary page
    console.log('Proceeding to payment with passenger details:', {
      departureId, scheduleId, vehicleId, departurePoint, arrivalPoint, travelDate,
      departureTime, arrivalTime, pricePerSeat, selectedSeats: selectedSeatIdentifiers,
      totalPrice: pricePerSeat * numSeats,
      passengers
    });

    const queryParams = new URLSearchParams({
      departureId: departureId || '',
      scheduleId: scheduleId || '',
      vehicleId: vehicleId || '',
      dp: departurePoint || '',
      ap: arrivalPoint || '',
      date: travelDate || '',
      dt: departureTime || '',
      at: arrivalTime || '',
      price: pricePerSeat.toString(),
      seats: selectedSeatIdentifiers.join(','),
      numSeats: numSeats.toString(),
      totalPrice: (pricePerSeat * numSeats).toFixed(2),
      passengers: JSON.stringify(passengers), // Stringify passenger array
    }).toString();

    router.push(`/dashboard/bookings/new/payment?${queryParams}`);
  };

  const handleBack = () => {
    // Navigate back to select-seats, re-passing necessary query params
    const queryParams = new URLSearchParams({
        departureId: departureId || '',
        scheduleId: scheduleId || '',
        vehicleId: vehicleId || '',
        dp: departurePoint || '',
        ap: arrivalPoint || '',
        date: travelDate || '',
        dt: departureTime || '',
        at: arrivalTime || '',
        price: pricePerSeat.toString()
      }).toString();
    router.push(`/dashboard/bookings/new/select-seats?${queryParams}`);
  };

  if (numSeats === 0 || selectedSeatIdentifiers.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <PageHeader title="Error" />
        <p className="text-red-500">No seats selected. Please go back and select seats.</p>
        <Button onClick={handleBack} variant="outline">Select Seats</Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="New Booking - Step 3: Passenger Details" />
      <div className="container mx-auto p-4 max-w-3xl">
        {/* Trip Summary */}
        <div className="mb-6 p-4 border rounded-lg shadow-sm bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">Your Trip</h2>
          <p><strong>Route:</strong> {departurePoint} to {arrivalPoint}</p>
          <p><strong>Date & Time:</strong> {travelDate} at {departureTime} - {arrivalTime}</p>
          <p><strong>Selected Seats:</strong> {selectedSeatIdentifiers.join(', ')}</p>
          <p><strong>Total Price:</strong> ${(pricePerSeat * numSeats).toFixed(2)}</p>
        </div>

        {formError && <p className="text-red-500 mb-4">{formError}</p>}

        <div className="space-y-8">
          {passengers.map((passenger, index) => (
            <div key={passenger.seatNumber} className="p-4 border rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-3">Passenger for Seat {passenger.seatNumber}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label htmlFor={`fullName-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    id={`fullName-${index}`}
                    value={passenger.fullName}
                    onChange={(e) => handleInputChange(index, 'fullName', e.target.value)}
                    placeholder="Enter full name"
                    className="w-full"
                    required
                  />
                </div>

                {/* Age */}
                <div>
                  <label htmlFor={`age-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                    Age (Optional)
                  </label>
                  <Input
                    type="number"
                    id={`age-${index}`}
                    value={passenger.age}
                    onChange={(e) => handleInputChange(index, 'age', e.target.value)}
                    placeholder="Enter age"
                    className="w-full"
                  />
                </div>
              </div>
              {/* Gender */}
              <div className="mt-4">
                <label htmlFor={`gender-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Gender (Optional)
                </label>
                <select
                  id={`gender-${index}`}
                  value={passenger.gender}
                  onChange={(e) => handleInputChange(index, 'gender', e.target.value as Passenger['gender'])}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="" disabled>Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-8">
          <Button onClick={handleBack} variant="outline">
            Back to Seat Selection
          </Button>
          <Button
            onClick={handleNext}
            disabled={passengers.some(p => !p.fullName.trim())} // Disable if any full name is missing
          >
            Next: Proceed to Payment
          </Button>
        </div>
      </div>
    </>
  );
};

export default PassengerDetailsPage;
