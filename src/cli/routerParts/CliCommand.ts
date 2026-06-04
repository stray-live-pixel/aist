import { type ConfigScope } from '../../core/app/config/config';
import { type AutonomousExportFormat, type AutonomousLaunchOptions } from '../../core/processes/autonomous';
import { type JsonValue } from '../../core/shared/types/types';
import { CliApprovalMode } from './CliApprovalMode';
import { CliModelProvider } from './CliModelProvider';

export type CliCommand =
  | { readonly kind: 'help' }
  | { readonly kind: 'version' }
  | { readonly kind: 'daemon'; readonly workspace?: string; readonly socket?: string }
  | { readonly kind: 'web'; readonly workspace?: string; readonly host: string; readonly port: number }
  | { readonly kind: 'doctor'; readonly workspace?: string }
  | { readonly kind: 'paths'; readonly workspace?: string }
  | { readonly kind: 'chatNew'; readonly workspace?: string; readonly model?: string; readonly json: boolean }
  | { readonly kind: 'chatList'; readonly workspace?: string; readonly json: boolean }
  | { readonly kind: 'chatGet'; readonly chatId: string; readonly workspace?: string; readonly json: boolean }
  | { readonly kind: 'chatClear'; readonly chatId: string; readonly workspace?: string; readonly json: boolean }
  | {
      readonly kind: 'chatSetModel';
      readonly chatId: string;
      readonly model: string;
      readonly workspace?: string;
      readonly json: boolean;
    }
  | {
      readonly kind: 'chatAsk';
      readonly chatId: string;
      readonly workspace?: string;
      readonly prompt?: string;
      readonly stdin: boolean;
      readonly jsonl: boolean;
      readonly approvalMode: CliApprovalMode;
    }
  | { readonly kind: 'configGet'; readonly key?: string; readonly workspace?: string; readonly json: boolean }
  | {
      readonly kind: 'configSet';
      readonly key: string;
      readonly value: JsonValue;
      readonly scope: ConfigScope;
      readonly workspace?: string;
      readonly json: boolean;
    }
  | { readonly kind: 'authOpenRouterSetKey'; readonly fromEnv: boolean; readonly json: boolean }
  | { readonly kind: 'authOpenRouterStatus'; readonly json: boolean }
  | { readonly kind: 'authCodexStatus'; readonly json: boolean }
  | { readonly kind: 'modelsList'; readonly provider: CliModelProvider; readonly json: boolean }
  | { readonly kind: 'modelsRefresh'; readonly provider: CliModelProvider; readonly json: boolean }
  | { readonly kind: 'autonomousList'; readonly workspace?: string; readonly json: boolean }
  | {
      readonly kind: 'autonomousFlowStart';
      readonly flowId: string;
      readonly workspace?: string;
      readonly launch: AutonomousLaunchOptions;
      readonly jsonl: boolean;
    }
  | {
      readonly kind: 'autonomousRunStart';
      readonly runId: string;
      readonly workspace?: string;
      readonly launch: AutonomousLaunchOptions;
      readonly jsonl: boolean;
    }
  | { readonly kind: 'autonomousStop'; readonly sessionId: string; readonly workspace?: string; readonly json: boolean }
  | {
      readonly kind: 'autonomousExport';
      readonly sessionId: string;
      readonly workspace?: string;
      readonly format: AutonomousExportFormat;
    };
