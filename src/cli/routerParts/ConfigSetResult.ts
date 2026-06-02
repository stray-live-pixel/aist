import { type ConfigScope } from '../../core/app/config/config';
import { type JsonValue } from '../../core/shared/types/types';

export type ConfigSetResult = {
  readonly key: string;
  readonly value: JsonValue;
  readonly scope: ConfigScope;
  readonly redacted: boolean;
};
