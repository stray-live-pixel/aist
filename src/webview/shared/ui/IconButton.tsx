import type { ReactNode } from 'react';

type IconButtonProps = {
  title: string;
  children: ReactNode;
  disabled?: boolean;
  onClick(): void;
};

export function IconButton({ title, children, disabled, onClick }: IconButtonProps) {
  return (
    <button className="icon-button" title={title} aria-label={title} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
