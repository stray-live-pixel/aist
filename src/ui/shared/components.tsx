import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Button({
  children,
  tone = 'secondary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly tone?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  return (
    <button {...props} className={`uiButton uiButton_${tone} ${props.className || ''}`.trim()}>
      {children}
    </button>
  );
}

export function StatusPill({
  children,
  tone = 'neutral'
}: {
  readonly children: ReactNode;
  readonly tone?: 'neutral' | 'busy' | 'success' | 'warning' | 'danger';
}) {
  return <span className={`uiStatusPill uiStatusPill_${tone}`}>{children}</span>;
}

export function Toolbar({ children }: { readonly children: ReactNode }) {
  return <div className="uiToolbar">{children}</div>;
}

export function EmptyState({ title, children }: { readonly title: string; readonly children?: ReactNode }) {
  return (
    <div className="uiEmptyState">
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
