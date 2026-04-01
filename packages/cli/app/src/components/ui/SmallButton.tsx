import type { ButtonHTMLAttributes } from 'react';

interface SmallButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
}

const variants = {
  primary:
    'px-2.5 py-1 border border-primary rounded bg-primary-light text-primary-text text-[11px] cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white transition-colors',
  ghost:
    'border-none bg-transparent text-text-muted cursor-pointer text-xs px-0.5 hover:text-error',
};

export function SmallButton({ variant = 'primary', className = '', ...props }: SmallButtonProps) {
  return <button type="button" {...props} className={`${variants[variant]} ${className}`} />;
}
