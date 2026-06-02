import { CodexAccessToken } from './CodexAccessToken';

export interface CodexTokenProvider {
  getToken(): Promise<CodexAccessToken>;
}
