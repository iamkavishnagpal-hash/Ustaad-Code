import { spawn } from 'node:child_process';
import {
  DesktopIntegration,
  IntegrationAction,
  IntegrationCapability,
  IntegrationExecutionContext,
  IntegrationResult,
} from '../integration-types';
import { ActionUnsupportedError, IntegrationNotAvailableError } from '../integration-errors';

export class TerminalIntegration implements DesktopIntegration {
  public readonly id = 'terminal';
  public readonly name = 'Windows Terminal / PowerShell';
  public readonly description = 'Windows system shell and terminal emulator integration';

  public async isAvailable(): Promise<boolean> {
    // Windows PowerShell is ubiquitously available on Windows systems
    return process.platform === 'win32';
  }

  public getCapabilities(): IntegrationCapability[] {
    return [
      { name: 'OPEN', description: 'Launch a new terminal window at default or specified directory' },
      { name: 'FOCUS', description: 'Focus active Windows terminal' },
    ];
  }

  public async execute(
    action: IntegrationAction,
    context: IntegrationExecutionContext
  ): Promise<IntegrationResult> {
    const isAvail = await this.isAvailable();
    if (!isAvail) {
      throw new IntegrationNotAvailableError(this.id);
    }

    switch (action.type) {
      case 'OPEN_TERMINAL':
      case 'OPEN':
      case 'FOCUS_TERMINAL':
      case 'FOCUS': {
        const cwd = action.parameters?.workingDirectory || context.workingDirectory || process.cwd();
        return this.openTerminal(cwd);
      }

      default:
        throw new ActionUnsupportedError(this.id, action.type);
    }
  }

  private openTerminal(cwd: string): Promise<IntegrationResult> {
    return new Promise((resolve) => {
      // First try wt.exe (Windows Terminal) if present, fallback to powershell.exe
      const wt = spawn('wt.exe', ['-d', cwd], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      });

      wt.on('error', () => {
        // Fallback to powershell.exe in its own console window
        const ps = spawn('powershell.exe', ['-NoExit'], {
          cwd,
          detached: true,
          stdio: 'ignore',
          windowsHide: false,
        });

        ps.on('error', (psErr) => {
          resolve({ success: false, error: `Failed to launch terminal: ${psErr.message}` });
        });

        ps.unref();
        resolve({ success: true, message: `Launched PowerShell window in ${cwd}` });
      });

      wt.unref();
      resolve({ success: true, message: `Launched Windows Terminal in ${cwd}` });
    });
  }
}
