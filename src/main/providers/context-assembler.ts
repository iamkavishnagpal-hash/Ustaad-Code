import { LlmRequest } from './provider-types';

export class ContextAssembler {
  /**
   * Assembles a structured system instruction and user prompt
   * that incorporates active workspace context, foreground application,
   * and live transcript segments without mutating base workspace state.
   */
  public static formatPrompt(request: LlmRequest): {
    systemPrompt: string;
    userContent: string;
  } {
    const { context, systemInstruction, userPrompt } = request;

    const baseInstruction =
      systemInstruction ||
      'You are UstaadG, an expert personal workspace assistant. You assist the user concisely based on their live desktop context.';

    const appInfo = context.activeWindow
      ? `Active Application: ${context.activeWindow.application || 'Unknown'} (Title: "${context.activeWindow.title || ''}")`
      : 'Active Application: Unknown';

    const screenBlock = context.screenContext?.ocrText
      ? `\n[VISIBLE SCREEN CONTEXT]:\n${context.screenContext.ocrText}`
      : '';

    const gitBlock = context.gitContext
      ? `\n[GIT REPOSITORY CONTEXT]:\nBranch: ${context.gitContext.branch} | Changed Files: ${context.gitContext.changedFiles} | Staged: ${context.gitContext.stagedFiles}${context.gitContext.diffSummary ? `\nDiff Summary:\n${context.gitContext.diffSummary}` : ''}`
      : '';

    const transcriptText = context.transcript.text.trim();
    const transcriptBlock = transcriptText.length > 0
      ? `\n--- RECENT SPEECH TRANSCRIPT ---\n${transcriptText}\n--- END TRANSCRIPT ---`
      : '\n[No recent speech transcript recorded]';

    const systemPrompt = `${baseInstruction}\n\n[LIVE DESKTOP CONTEXT]\n${appInfo}${gitBlock}${screenBlock}${transcriptBlock}`;

    const userContent = userPrompt?.trim()
      ? userPrompt.trim()
      : 'Please summarize the current discussion/activity and provide immediate action points or answers.';

    return {
      systemPrompt,
      userContent,
    };
  }
}
