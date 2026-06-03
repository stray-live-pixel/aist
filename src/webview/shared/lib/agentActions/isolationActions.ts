import { post } from './post';

export const isolationActions = {
  startIsolationSession(prompt: string): void {
    post({ message: { type: 'isolation.start', prompt } });
  },
  continueIsolationSession(sessionId: string, prompt: string): void {
    post({ message: { type: 'isolation.continue', sessionId, prompt } });
  },
  stopIsolationSession(sessionId: string): void {
    post({ message: { type: 'isolation.stop', sessionId } });
  },
  destroyIsolationSession(sessionId: string): void {
    post({ message: { type: 'isolation.destroy', sessionId } });
  },
  openIsolationWorktree(sessionId: string): void {
    post({ message: { type: 'isolation.openWorktree', sessionId } });
  },
  openIsolationPullRequest(sessionId: string): void {
    post({ message: { type: 'isolation.openPr', sessionId } });
  },
  openIsolationChat(sessionId: string): void {
    post({ message: { type: 'isolation.openChat', sessionId } });
  },
  loadIsolationSessionEvents(sessionId: string): void {
    post({ message: { type: 'isolation.loadEvents', sessionId } });
  },
  refreshIsolationSessions(): void {
    post({ message: { type: 'isolation.refresh' } });
  }
};
