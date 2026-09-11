import { spawn } from 'node:child_process';
import {
  DesktopIntegration,
  IntegrationAction,
  IntegrationCapability,
  IntegrationExecutionContext,
  IntegrationResult,
} from '../integration-types';
import { ActionUnsupportedError, IntegrationNotAvailableError } from '../integration-errors';

export interface StructuredGitStatus {
  branch: string;
  changedFiles: number;
  stagedFiles: number;
  untrackedFiles: number;
  hasUncommittedChanges: boolean;
  files: { path: string; status: string }[];
}

export interface StructuredGitDiff {
  filesChanged: number;
  insertions: number;
  deletions: number;
  diffSummary: string;
}

export class GitIntegration implements DesktopIntegration {
  public readonly id = 'git';
  public readonly name = 'Local Git';
  public readonly description = 'Version control repository inspection integration';

  public async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn('git', ['--version'], { windowsHide: true });
      child.on('error', () => resolve(false));
      child.on('exit', (code) => resolve(code === 0));
    });
  }

  public getCapabilities(): IntegrationCapability[] {
    return [
      { name: 'GET_STATUS', description: 'Inspect structured repository status and uncommitted changes' },
      { name: 'GET_CURRENT_BRANCH', description: 'Retrieve active Git branch name' },
      { name: 'GET_DIFF', description: 'Retrieve structured diff statistics for uncommitted changes' },
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

    const repoPath = action.parameters?.repoPath || context.workingDirectory || process.cwd();

    switch (action.type) {
      case 'GET_GIT_STATUS':
      case 'GET_STATUS': {
        const status = await this.getStatus(repoPath);
        return { success: true, data: status, message: `Branch ${status.branch}: ${status.changedFiles} changed files` };
      }

      case 'GET_GIT_CURRENT_BRANCH':
      case 'GET_CURRENT_BRANCH': {
        const branch = await this.getCurrentBranch(repoPath);
        return { success: true, data: { branch }, message: `Current branch is ${branch}` };
      }

      case 'GET_GIT_DIFF':
      case 'GET_DIFF': {
        const maxLines = action.parameters?.maxLines || 100;
        const diff = await this.getDiff(repoPath, maxLines);
        return { success: true, data: diff, message: `${diff.filesChanged} files changed (+${diff.insertions} -${diff.deletions})` };
      }

      default:
        throw new ActionUnsupportedError(this.id, action.type);
    }
  }

  public async getStatus(repoPath: string): Promise<StructuredGitStatus> {
    const branch = await this.getCurrentBranch(repoPath);
    const porcelainOutput = await this.execGit(['status', '--porcelain=v1'], repoPath);

    const lines = porcelainOutput.split('\n').filter((l) => l.trim().length > 0);
    const files: { path: string; status: string }[] = [];
    let stagedFiles = 0;
    let untrackedFiles = 0;
    let changedFiles = 0;

    for (const line of lines) {
      const indexStatus = line.charAt(0);
      const workTreeStatus = line.charAt(1);
      const filePath = line.substring(3).trim();

      if (indexStatus === '?' && workTreeStatus === '?') {
        untrackedFiles++;
        changedFiles++;
      } else {
        if (indexStatus !== ' ' && indexStatus !== '?') stagedFiles++;
        if (workTreeStatus !== ' ' && workTreeStatus !== '?' || (indexStatus !== ' ' && indexStatus !== '?')) {
          changedFiles++;
        }
      }

      files.push({ path: filePath, status: `${indexStatus}${workTreeStatus}`.trim() });
    }

    return {
      branch,
      changedFiles,
      stagedFiles,
      untrackedFiles,
      hasUncommittedChanges: lines.length > 0,
      files,
    };
  }

  public async getCurrentBranch(repoPath: string): Promise<string> {
    const out = await this.execGit(['branch', '--show-current'], repoPath);
    return out.trim() || 'HEAD (detached)';
  }

  public async getDiff(repoPath: string, maxLines = 100): Promise<StructuredGitDiff> {
    const statOutput = await this.execGit(['diff', '--shortstat'], repoPath);
    const fullDiff = await this.execGit(['diff'], repoPath);

    let filesChanged = 0;
    let insertions = 0;
    let deletions = 0;

    const statMatch = statOutput.match(/(\d+)\s+file[s]?\s+changed(?:,\s+(\d+)\s+insertion[s]?\(\+\))?(?:,\s+(\d+)\s+deletion[s]?\(-\))?/);
    if (statMatch) {
      filesChanged = parseInt(statMatch[1] || '0', 10);
      insertions = parseInt(statMatch[2] || '0', 10);
      deletions = parseInt(statMatch[3] || '0', 10);
    }

    const truncatedDiff = fullDiff.split('\n').slice(0, maxLines).join('\n');

    return {
      filesChanged,
      insertions,
      deletions,
      diffSummary: truncatedDiff,
    };
  }

  private execGit(args: string[], cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('git', args, { cwd, windowsHide: true });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => (stdout += d.toString()));
      child.stderr.on('data', (d) => (stderr += d.toString()));

      child.on('error', (err) => reject(err));
      child.on('exit', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Git command failed (${code}): ${stderr || stdout}`));
        }
      });
    });
  }
}
