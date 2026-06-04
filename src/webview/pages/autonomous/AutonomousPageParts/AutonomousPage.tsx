import { useEffect, useState } from 'react';

import { AutonomousPageProps } from './AutonomousPageProps';
import { AutonomousRoute } from './AutonomousRoute';
import { FlowEditorPage } from './FlowEditorPage';
import { FlowsPage } from './FlowsPage';

export function AutonomousPage({ state, error, routeRequest }: AutonomousPageProps) {
  const [route, setRoute] = useState<AutonomousRoute>({ page: 'flows' });

  useEffect(() => {
    if (routeRequest?.route === 'flows') {
      setRoute({ page: 'flows' });
    }
  }, [routeRequest]);

  if (route.page === 'flows') {
    return <FlowsPage state={state} error={error} onOpenFlow={(flowId) => setRoute({ page: 'flow-edit', flowId })} />;
  }

  if (route.page === 'flow-edit') {
    const flow = state.definitions.flows.find((candidate) => candidate.id === route.flowId);
    return <FlowEditorPage flow={flow} error={error} onBack={() => setRoute({ page: 'flows' })} />;
  }

  return null;
}
