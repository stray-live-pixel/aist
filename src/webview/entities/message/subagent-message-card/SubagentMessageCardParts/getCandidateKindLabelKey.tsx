import { type TranslationKey } from '../../../../shared/i18n';
import { type AgentReflectionCandidate } from '../../../../shared/types';

export function getCandidateKindLabelKey(kind: AgentReflectionCandidate['kind']): TranslationKey {
  switch (kind) {
    case 'memory_preference':
      return 'settings.memory.candidate.memoryPreference';
    case 'project_lesson':
      return 'settings.memory.candidate.projectLesson';
    case 'verification_command':
      return 'settings.memory.candidate.verificationCommand';
    case 'declarative_definition':
      return 'settings.memory.candidate.declarativeDefinition';
  }
}
