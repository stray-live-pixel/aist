import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'tactile';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonShape = 'default' | 'round';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  iconOnly?: boolean;
  fullWidth?: boolean;
};
