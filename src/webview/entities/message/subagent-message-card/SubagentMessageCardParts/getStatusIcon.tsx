import { CheckCircle2, Sparkles, XCircle } from 'lucide-react';

export function getStatusIcon(status: 'running' | 'success' | 'error') {
  if (status === 'success') {
    return <CheckCircle2 size={12} />;
  }
  if (status === 'error') {
    return <XCircle size={12} />;
  }
  return <Sparkles size={12} />;
}
