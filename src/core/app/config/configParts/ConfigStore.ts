import { type JsonValue } from '../../../shared/types/types';

export interface ConfigStore {
  get<T extends JsonValue = JsonValue>(key: string, defaultValue?: T): Promise<T | undefined>;
}
