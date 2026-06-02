import { installChatMethods } from './methodInstallers/installChatMethods';
import { installConfigMethods } from './methodInstallers/installConfigMethods';
import { installLifecycleMethods } from './methodInstallers/installLifecycleMethods';
import { installRuntimeMethods } from './methodInstallers/installRuntimeMethods';
import { installSettingsMethods } from './methodInstallers/installSettingsMethods';

/**
 * Что это: устанавливает все вынесенные методы AistDaemonServer.
 * Зачем нужно: JSON-RPC dispatcher сохраняет старые method names, а implementation разбита на маленькие файлы.
 * Какую продуктовую проблему решает: daemon сохраняет контракт и проходит strict file-size без исключений.
 */
export function installAistDaemonServerMethods(): void {
  installLifecycleMethods();
  installChatMethods();
  installRuntimeMethods();
  installSettingsMethods();
  installConfigMethods();
}
