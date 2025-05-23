// packages/ui/src/Button.tsx
import * as React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ children, onClick }: ButtonProps) {
  return (
    <button type="button" onClick={onClick} style={{ padding: '10px 15px', background: 'blue', color: 'white', border: 'none', borderRadius: '5px' }}>
      {children}
    </button>
  );
}

export default Button;
