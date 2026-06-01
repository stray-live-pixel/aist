import { type JsonObject, type JsonValue } from '../../core/shared/types/types';
import { ConfigValueSource } from './ConfigValueSource';

export type ConfigGetResult =
  | {
      readonly key: string;
      readonly value: JsonValue | undefined;
      readonly source: ConfigValueSource;
      readonly redacted: boolean;
    }
  | {
      readonly values: JsonObject;
      readonly redacted: boolean;
    };
