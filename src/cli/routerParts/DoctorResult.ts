import { globalAistRoot, workspaceAistRoot } from '../../core/entities/storage/storage';
import { CliPaths } from './CliPaths';
import { DoctorCheck } from './DoctorCheck';

export type DoctorResult = {
  readonly ok: boolean;
  readonly paths: Pick<CliPaths, 'workspaceRoot' | 'workspaceAistRoot' | 'globalAistRoot'>;
  readonly checks: readonly DoctorCheck[];
};
