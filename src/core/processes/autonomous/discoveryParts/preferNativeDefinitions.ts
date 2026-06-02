import { type AutonomousSourceKind } from '../types';

export function preferNativeDefinitions<T extends { id: string; sourceKind: AutonomousSourceKind }>(
  definitions: T[]
): T[] {
  const byId = new Map<string, T>();
  for (const definition of definitions) {
    const previous = byId.get(definition.id);
    if (!previous || (previous.sourceKind === 'legacy' && definition.sourceKind === 'native')) {
      byId.set(definition.id, definition);
    }
  }

  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}
