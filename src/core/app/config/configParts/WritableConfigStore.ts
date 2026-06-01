import { type JsonValue } from '../../../shared/types/types';
import { ConfigScope } from './ConfigScope';
import { ConfigStore } from './ConfigStore';

export interface WritableConfigStore extends ConfigStore {
  set(key: string, value: JsonValue, options?: { scope?: ConfigScope }): Promise<void>;
  delete(key: string, options?: { scope?: ConfigScope }): Promise<void>;
}
