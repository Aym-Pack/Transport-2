'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, PageHeader } from '@samatransport/ui';

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

const CreateUserPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    jobTitle: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!formData.email || !formData.password) {
      setError('Email and Password are required.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include Authorization header if your function is protected
          // 'Authorization': `Bearer ${YOUR_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
          job_title: formData.jobTitle,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Error: ${response.status}`);
      }

      setSuccessMessage(result.message || 'User created successfully!');
      setFormData({ email: '', password: '', fullName: '', jobTitle: '' }); // Clear form
      // Optionally redirect after a delay
      setTimeout(() => {
        router.push('/dashboard/users');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Create New User" />
      <div className="container mx-auto p-4 max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-500">{error}</p>}
          {successMessage && <p className="text-green-500">{successMessage}</p>}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <Input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <Input
              type="password"
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full"
              placeholder="********"
              required
            />
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <Input
              type="text"
              name="fullName"
              id="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="mt-1 block w-full"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">
              Job Title
            </label>
            <Input
              type="text"
              name="jobTitle"
              id="jobTitle"
              value={formData.jobTitle}
              onChange={handleChange}
              className="mt-1 block w-full"
              placeholder="Software Engineer"
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Creating User...' : 'Create User'}
          </Button>
        </form>
      </div>
    </>
  );
};

export default CreateUserPage;
