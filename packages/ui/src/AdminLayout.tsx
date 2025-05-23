import React from 'react';
import styles from './AdminLayout.module.css';

export interface AdminLayoutProps {
  sidebarContent: React.ReactNode;
  mainContent: React.ReactNode;
  headerContent?: React.ReactNode; // Optional header that can span across
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  sidebarContent,
  mainContent,
  headerContent,
}) => {
  return (
    <div className={styles.adminLayout}>
      {headerContent && (
        <header className={styles.header}>{headerContent}</header>
      )}
      <aside className={styles.sidebar}>{sidebarContent}</aside>
      <main className={styles.mainContent}>{mainContent}</main>
    </div>
  );
};

export default AdminLayout;
