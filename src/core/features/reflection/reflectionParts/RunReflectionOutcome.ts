export type RunReflectionOutcome = {
  status: 'success' | 'error' | 'stopped';
  answer?: string;
  error?: string;
};
