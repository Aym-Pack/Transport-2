import React from 'react';
import styles from './FormControls.module.css';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  name: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  name,
  error,
  rows = 3,
  ...props
}) => {
  return (
    <div className={styles.formControl}>
      <label htmlFor={name} className={styles.label}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        className={`${styles.textarea} ${error ? styles.textareaError : ''}`}
        {...props}
      />
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
};

export default Textarea;
