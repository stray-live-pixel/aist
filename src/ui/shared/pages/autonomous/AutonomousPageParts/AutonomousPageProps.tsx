import { type AutonomousState } from '../../../types';

export type AutonomousPageProps = {
  state: AutonomousState;
  error?: string | null;
  routeRequest?: { route: 'flows'; nonce: number } | null;
  operation?: {
    operation: 'deleteFlow';
    flowId: string;
    status: 'done' | 'cancelled' | 'error';
    nonce: number;
  } | null;
};
