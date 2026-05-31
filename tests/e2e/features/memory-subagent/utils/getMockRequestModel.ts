import type { MockModelRequest } from '../../../sources/MockModelRequest';

/**
 * Что это: достает model id из OpenRouter-compatible mock request.
 * Зачем нужно: e2e проверяет, что memory-субагент использует модель из настроек или модель текущего чата.
 */
export function getMockRequestModel({ request }: { request: MockModelRequest | undefined }): string {
  const model = request?.body.model;
  return typeof model === 'string' ? model : '';
}
