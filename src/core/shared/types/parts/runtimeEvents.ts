import type { ToolApprovalDecision, ToolApprovalRequest } from './approval';
import type { ChatModelRequestStatus, ChatUsageEstimate } from './chat';
import type { ModelUsage } from './model';
import type {
  RuntimeChatMessage,
  RuntimeErrorInfo,
  RuntimeModelMessage,
  RuntimeRunSnapshot,
  RuntimeToolCallSnapshot
} from './runtimeLoop';
import type { AgentRunActivity, AgentRunStatus } from './runtimeStatus';
import type { RuntimeToolResult } from './toolResult';

export type RuntimeEvent =
  | {
      type: 'run.started';
      run: RuntimeRunSnapshot;
      at: number;
    }
  | {
      type: 'run.activity';
      runId: string;
      chatId: string;
      activity: AgentRunActivity;
      detail?: string;
      at: number;
    }
  | {
      type: 'run.completed';
      run: RuntimeRunSnapshot;
      answer: string;
      usage: ChatUsageEstimate;
      at: number;
    }
  | {
      type: 'run.failed';
      runId: string;
      chatId: string;
      error: RuntimeErrorInfo;
      at: number;
    }
  | {
      type: 'run.stopped';
      runId: string;
      chatId: string;
      reason?: string;
      at: number;
    }
  | {
      type: 'run.finished';
      run: RuntimeRunSnapshot;
      status: Extract<AgentRunStatus, 'completed' | 'stopped'>;
      answer?: string;
      usage?: ChatUsageEstimate;
      reason?: string;
      at: number;
    }
  | {
      type: 'run.error';
      runId: string;
      chatId: string;
      error: RuntimeErrorInfo;
      at: number;
    }
  | {
      type: 'message.appended';
      chatId: string;
      message: RuntimeChatMessage;
      at: number;
    }
  | {
      type: 'chat.updated';
      chatId: string;
      reason?: string;
      at: number;
    }
  | {
      type: 'model.request.updated';
      runId: string;
      chatId: string;
      request: ChatModelRequestStatus;
      at: number;
    }
  | {
      type: 'model.response';
      runId: string;
      chatId: string;
      requestNumber: number;
      message: RuntimeModelMessage;
      usage?: ModelUsage;
      at: number;
    }
  | {
      type: 'tool.call.started';
      runId: string;
      chatId: string;
      messageId?: string;
      toolCall: RuntimeToolCallSnapshot;
      at: number;
    }
  | {
      type: 'tool.call.approvalRequested';
      runId: string;
      chatId: string;
      approvalId: string;
      messageId: string;
      approval: ToolApprovalRequest;
      toolCall: RuntimeToolCallSnapshot;
      preview?: RuntimeToolResult;
      at: number;
    }
  | {
      type: 'tool.call.approvalResolved';
      runId: string;
      chatId: string;
      approvalId: string;
      messageId: string;
      approval?: ToolApprovalRequest;
      decision: ToolApprovalDecision;
      at: number;
    }
  | {
      type: 'tool.call.completed';
      runId: string;
      chatId: string;
      messageId: string;
      toolCall: RuntimeToolCallSnapshot;
      result: RuntimeToolResult;
      modelResult?: RuntimeToolResult;
      at: number;
    }
  | {
      type: 'tool.call.failed';
      runId: string;
      chatId: string;
      messageId?: string;
      toolCall: RuntimeToolCallSnapshot;
      error: RuntimeErrorInfo;
      at: number;
    };

export type RuntimeEventType = RuntimeEvent['type'];
