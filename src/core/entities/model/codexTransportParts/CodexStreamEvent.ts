import { CodexOutputItem } from './CodexOutputItem';
import { CodexResponse } from './CodexResponse';

export type CodexStreamEvent = {
  type?: string;
  delta?: string;
  text?: string;
  item?: CodexOutputItem;
  part?: {
    text?: string;
  };
  response?: CodexResponse;
  error?: {
    message?: string;
  };
};
