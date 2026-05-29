export type ProviderRequestUrlConfig = {
  endpoint: string;
  proxyHost?: string;
};

/**
 * Что это: вычисляет фактический URL для запроса к провайдеру с необязательным корпоративным proxy.
 * Зачем нужно: AIST должен сохранять стандартный endpoint по умолчанию, но позволять компании поставить
 * прозрачный proxy/шлюз безопасности перед endpoint без изменения payload, auth-заголовков и бизнес-логики транспорта.
 */
export function resolveProviderRequestUrl(config: ProviderRequestUrlConfig): string {
  const endpoint = config.endpoint.trim();
  const proxyHost = config.proxyHost?.trim();

  if (!proxyHost) {
    return endpoint;
  }

  const proxyUrl = new URL(proxyHost.endsWith('/') ? proxyHost : `${proxyHost}/`);
  proxyUrl.searchParams.set('endpoint', endpoint);
  return proxyUrl.toString();
}
