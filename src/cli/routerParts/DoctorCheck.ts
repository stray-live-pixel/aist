import { DoctorCheckStatus } from './DoctorCheckStatus';

export type DoctorCheck = {
  readonly name: string;
  readonly status: DoctorCheckStatus;
  readonly message: string;
};
