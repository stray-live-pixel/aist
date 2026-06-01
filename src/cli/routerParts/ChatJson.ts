import { type Chat, type ChatMessage, type JsonValue } from '../../core/shared/types/types';

export type ChatJson = {
  readonly id: string;
  readonly title: string;
  readonly model: string;
  readonly previousChatId: string | null;
  readonly compactedAt: number | null;
  readonly compactionModel: string | null;
  readonly messages: readonly ChatMessage[];
  readonly history: readonly JsonValue[];
  readonly lastAnswer: string;
  readonly busy: boolean;
  readonly activity: string | null;
  readonly activityDetail: string | null;
  readonly modelRequest: JsonValue | null;
  readonly context: JsonValue | null;
  readonly contextLength: number | null;
  readonly activePlan: JsonValue | null;
  readonly reflectionCandidates: JsonValue[];
  readonly usage: Chat['usage'];
  readonly createdAt: number;
  readonly updatedAt: number;
};
