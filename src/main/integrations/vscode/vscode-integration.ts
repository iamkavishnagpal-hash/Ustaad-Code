import { spawn } from 'node:child_process';
import {
  DesktopIntegration,
  IntegrationAction,
  IntegrationCapability,
  IntegrationExecutionContext,
  IntegrationResult,
} from '../integration-types';
import { ActionUnsupportedError, IntegrationNotAvailableError } from '../integration-errors';

export class VsCodeIntegration implements DesktopIntegration {
  public readonly id = 'vscode';
  public readonly name = 'Visual Studio Code';
  public readonly description = 'Desktop developer IDE integration';

  public async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn('code', ['--version'], { shell: true, windowsHide: true });
      child.on('error', () => resolve(false));
      child.on('exit', (code) => resolve(code === 0));
    });
  }

  public getCapabilities(): IntegrationCapability[] {
    return [
      { name: 'OPEN', description: 'Launch or open Visual Studio Code' },
      { name: 'FOCUS', description: 'Focus existing Visual Studio Code window' },
      { name: 'OPEN_FOLDER', description: 'Open specified directory workspace in VS Code' },
      { name: 'OPEN_FILE', description: 'Open specified source code file in VS Code' },
    ];
  }

  public async execute(
    action: IntegrationAction,
    _context: IntegrationExecutionContext
  ): Promise<IntegrationResult> {
    const isAvail = await this.isAvailable();
    if (!isAvail) {
      throw new IntegrationNotAvailableError(this.id);
    }

    switch (action.type) {
      case 'OPEN_VSCODE':
      case 'OPEN':
      case 'FOCUS_VSCODE':
      case 'FOCUS': {
        return this.runCli([]);
      }

      case 'OPEN_VSCODE_FOLDER':
      case 'OPEN_FOLDER': {
        const folderPath = action.parameters.folderPath || action.parameters.path || '.';
        return this.runCli([folderPath]);
      }

      case 'OPEN_VSCODE_FILE':
      case 'OPEN_FILE': {
        const filePath = action.parameters.filePath || action.parameters.path;
        if (!filePath) {
          return { success: false, error: 'filePath parameter required for OPEN_FILE' };
        }
        const args = ['-g', filePath];
        if (action.parameters.line) {
          args[1] = `${filePath}:${action.parameters.line}`;
        }
        return this.runCli(args);
      }

      default:
        throw new ActionUnsupportedError(this.id, action.type);
    }
  }

  private runCli(args: string[]): Promise<IntegrationResult> {
    return new Promise((resolve) => {
      const child = spawn('code', args, { shell: true, windowsHide: true });
      child.on('error', (err) => {
        resolve({ success: false, error: `Failed to dispatch VS Code: ${err.message}` });
      });
      child.on('exit', (code) => {
        if (code === 0) {
          resolve({ success: true, message: `Dispatched VS Code with arguments: ${args.join(' ')}` });
        } else {
          resolve({ success: false, error: `VS Code process exited with code ${code}` });
        }
      });
    });
  }
}
