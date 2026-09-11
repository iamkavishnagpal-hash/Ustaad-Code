import React from 'react';
import { Workspace } from '../../../shared/types';
import { Button } from './Button';
import { Play, Edit2, Trash2, Globe, Terminal, Cpu, Shield } from 'lucide-react';

interface WorkspaceListProps {
  workspaces: Workspace[];
  onActivate: (id: string) => void;
  onEdit: (workspace: Workspace) => void;
  onDelete: (id: string) => void;
}

export const WorkspaceList: React.FC<WorkspaceListProps> = ({
  workspaces,
  onActivate,
  onEdit,
  onDelete,
}) => {
  if (workspaces.length === 0) {
    return (
      <div className="bg-surface border border-surfaceBorder rounded-xl p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto text-accent mb-3">
          <Globe size={22} />
        </div>
        <h3 className="text-base font-semibold text-textPrimary">No Workspaces Configured</h3>
        <p className="text-xs text-textSecondary max-w-sm mx-auto mt-1 mb-5">
          Create your first workspace to connect an existing AI project (ChatGPT, Claude, Gemini) with a dedicated Windows hotkey.
        </p>
      </div>
    );
  }

  const getSourceIcon = (kind: string) => {
    switch (kind) {
      case 'web':
        return <Globe size={15} className="text-blue-400" />;
      case 'api':
        return <Terminal size={15} className="text-emerald-400" />;
      case 'local':
        return <Cpu size={15} className="text-amber-400" />;
      default:
        return <Globe size={15} className="text-slate-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {workspaces.map((ws) => (
        <div
          key={ws.id}
          className="bg-surface border border-surfaceBorder hover:border-slate-600/70 transition-all rounded-xl p-5 flex flex-col justify-between shadow-sm"
        >
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#0E1422] border border-surfaceBorder">
                  {getSourceIcon(ws.source.kind)}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-textPrimary leading-tight">{ws.name}</h4>
                  <span className="text-[11px] text-textMuted uppercase tracking-wider font-mono">
                    {ws.source.provider}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-[#0E1422] border border-surfaceBorder rounded-md text-xs font-mono font-semibold text-accent">
                {ws.hotkey}
              </span>
            </div>

            {ws.description && (
              <p className="text-xs text-textSecondary line-clamp-2 mt-2">{ws.description}</p>
            )}

            <div className="mt-3 flex items-center gap-2 text-[11px] text-textMuted truncate">
              <span className="truncate max-w-[280px] bg-[#0E1422] px-2 py-0.5 rounded border border-surfaceBorder/60">
                {ws.source.url || ws.source.endpoint}
              </span>
              {ws.privacy.overlayCapturePolicy !== 'normal' && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  <Shield size={11} /> Protected
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-5 pt-3 border-t border-surfaceBorder/60">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                icon={Edit2}
                onClick={() => onEdit(ws)}
                className="text-textSecondary hover:text-textPrimary"
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={() => onDelete(ws.id)}
                className="text-danger/80 hover:text-danger hover:bg-danger/10"
              >
                Delete
              </Button>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={Play}
              onClick={() => onActivate(ws.id)}
              className="bg-accent hover:bg-accentHover"
            >
              Activate
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
