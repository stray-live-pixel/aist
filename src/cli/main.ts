#!/usr/bin/env node
import { runCli } from './router';

export { runNodeFilesystemTool } from '../core/tools/fs/node_filesystem_tools/nodeFilesystemTools';

if (require.main === module) {
  void runCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
