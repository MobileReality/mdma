import type { InputHTMLAttributes } from 'react';

type SmallInputProps = InputHTMLAttributes<HTMLInputElement>;

export function SmallInput({ className = '', ...props }: SmallInputProps) {
  return (
    <input
      {...props}
      className={`px-2 py-1 border border-border rounded bg-surface-2 text-text-primary text-xs outline-none focus:border-primary ${className}`}
    />
  );
}
