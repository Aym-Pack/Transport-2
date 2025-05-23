import React from 'react';
import styles from './FormControls.module.css';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  // 'checked' and 'onChange' are already part of React.InputHTMLAttributes<HTMLInputElement>
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  name,
  error, // error prop is not typically used for styling individual checkboxes in the same way as text inputs
  checked,
  onChange,
  ...props
}) => {
  return (
    <div className={styles.checkboxContainer}>
      <input
        id={name}
        name={name}
        type="checkbox"
        className={styles.checkboxInput}
        checked={checked}
        onChange={onChange}
        {...props}
      />
      <label htmlFor={name} className={styles.checkboxLabel}>
        {label}
      </label>
      {/* Error messages for single checkboxes are less common directly beside them,
          usually handled at the form level or for a group of checkboxes.
          If needed, an error span could be added here similar to other inputs. */}
    </div>
  );
};

export default Checkbox;
