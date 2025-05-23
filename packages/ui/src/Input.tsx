import React from 'react';
import styles from './FormControls.module.css'; // Will create a shared CSS module

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  name,
  type = 'text',
  error,
  ...props
}) => {
  return (
    <div className={styles.formControl}>
      <label htmlFor={name} className={styles.label}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        {...props}
      />
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
};

export default Input;
