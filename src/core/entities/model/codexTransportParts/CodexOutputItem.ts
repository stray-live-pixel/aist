export type CodexOutputItem =
  | {
      type?: 'message';
      role?: string;
      content?: Array<{ type?: string; text?: string }>;
    }
  | {
      type?: 'function_call';
      id?: string;
      call_id?: string;
      name?: string;
      arguments?: string;
    }
  | {
      type?: 'reasoning';
      summary?: Array<{ text?: string }>;
      content?: Array<{ text?: string }>;
    };
