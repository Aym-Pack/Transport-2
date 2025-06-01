import React from 'react';

const Dashboard = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {/* Key Metrics Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Key Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 shadow rounded">
            <h3 className="text-lg font-medium">Total Users</h3>
            <p className="text-3xl">1,234</p>
          </div>
          <div className="bg-white p-4 shadow rounded">
            <h3 className="text-lg font-medium">Total Bookings</h3>
            <p className="text-3xl">567</p>
          </div>
          <div className="bg-white p-4 shadow rounded">
            <h3 className="text-lg font-medium">Total Revenue</h3>
            <p className="text-3xl">$12,345</p>
          </div>
        </div>
      </section>

      {/* Summaries Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Summaries</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 shadow rounded">
            <h3 className="text-lg font-medium">Recent Activity</h3>
            <ul className="list-disc pl-5">
              <li>User John Doe registered.</li>
              <li>Booking #123 confirmed.</li>
              <li>New message received.</li>
            </ul>
          </div>
          <div className="bg-white p-4 shadow rounded">
            <h3 className="text-lg font-medium">Pending Tasks</h3>
            <ul className="list-disc pl-5">
              <li>Approve new user registrations.</li>
              <li>Review booking cancellation requests.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Quick Access Section */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Quick Access</h2>
        <div className="flex space-x-4">
          <a href="/admin/users" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            User Management
          </a>
          <a href="/admin/bookings" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
            Booking Management
          </a>
          <a href="/dashboard/reports" className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded">
            Reports
          </a>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
