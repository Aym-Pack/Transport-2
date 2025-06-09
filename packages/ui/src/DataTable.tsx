import React from 'react';
import styles from './DataTable.module.css';

export interface ColumnDefinition<T> {
  header: string;
  accessor: keyof T | ((row: T) => any);
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
}

export function DataTable<T extends Record<string, any>>({ data, columns }: DataTableProps<T>) {
  const getColumnValue = (row: T, accessor: ColumnDefinition<T>['accessor']) => {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    return row[accessor];
  };

  return (
    <table className={styles.dataTable}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.header}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((col) => (
              <td key={`${col.header}-${rowIndex}`}>
                {getColumnValue(row, col.accessor)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default DataTable;
