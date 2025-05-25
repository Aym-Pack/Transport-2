// apps/control-app/app/dashboard/layout.tsx
'use client'; // If using client-side navigation links or state for sidebar

import React from 'react';
import Link from 'next/link';
import { AdminLayout } from '@samatransport/ui'; // Assuming AdminLayout and PageHeader are suitable
import { usePathname } from 'next/navigation'; // To highlight active link

// Basic styling for sidebar (can be moved to a CSS module)
const sidebarStyles: React.CSSProperties = {
  width: '250px',
  padding: '20px',
  borderRight: '1px solid #eee',
  height: '100vh', // Full height
  background: '#f9f9f9',
};

const navLinkStyles = (isActive: boolean): React.CSSProperties => ({
  display: 'block',
  padding: '10px 0',
  color: isActive ? 'blue' : 'black',
  textDecoration: 'none',
  fontWeight: isActive ? 'bold' : 'normal',
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const sidebarContent = (
    <div style={sidebarStyles}>
      <h2>SAMAControl</h2>
      <nav>
        <ul>
          <li><Link href="/dashboard/agencies" style={navLinkStyles(pathname.startsWith('/dashboard/agencies'))}>Agencies</Link></li>
          {/* Add other master data links here as they are built */}
          <li><Link href="/dashboard/routes" style={navLinkStyles(pathname.startsWith('/dashboard/routes'))}>Routes</Link></li>
          <li><Link href="/dashboard/vehicle-types" style={navLinkStyles(pathname.startsWith('/dashboard/vehicle-types'))}>Vehicle Types</Link></li>
          <li><Link href="/dashboard/vehicles" style={navLinkStyles(pathname.startsWith('/dashboard/vehicles'))}>Vehicles</Link></li>
          <li><Link href="/dashboard/currencies" style={navLinkStyles(pathname.startsWith('/dashboard/currencies'))}>Currencies</Link></li>
          <li><Link href="/dashboard/exchange-rates" style={navLinkStyles(pathname.startsWith('/dashboard/exchange-rates'))}>Exchange Rates</Link></li>

          {/* User Auth Links */}
          <li style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #ddd' }}><span style={{ fontSize: '0.9em', color: '#555' }}>User Authorization</span></li>
          <li><Link href="/dashboard/users" style={navLinkStyles(pathname.startsWith('/dashboard/users'))}>User Management</Link></li>
          <li><Link href="/dashboard/roles" style={navLinkStyles(pathname.startsWith('/dashboard/roles'))}>Roles</Link></li>
          <li><Link href="/dashboard/permissions" style={navLinkStyles(pathname.startsWith('/dashboard/permissions'))}>Permissions</Link></li>
        </ul>
      </nav>
    </div>
  );

  return (
    <AdminLayout
      sidebarContent={sidebarContent}
      mainContent={
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      }
    />
  );
}
