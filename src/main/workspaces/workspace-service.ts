import { WorkspaceStore } from '../storage/workspace-store';
import { Workspace, WorkspaceInput } from '../../shared/types';
import { WorkspaceValidator } from './workspace-validator';

export class WorkspaceService {
  constructor(private store: WorkspaceStore) {}

  public listWorkspaces(): Workspace[] {
    return this.store.list();
  }

  public getWorkspace(id: string): Workspace | null {
    return this.store.getById(id);
  }

  public getWorkspaceByHotkey(hotkey: string): Workspace | null {
    return this.store.getByHotkey(hotkey);
  }

  public createWorkspace(input: WorkspaceInput): Workspace {
    const validated = WorkspaceValidator.validateInput(input);
    return this.store.create(validated);
  }

  public updateWorkspace(id: string, input: Partial<WorkspaceInput>): Workspace {
    return this.store.update(id, input);
  }

  public deleteWorkspace(id: string): boolean {
    return this.store.delete(id);
  }
}
