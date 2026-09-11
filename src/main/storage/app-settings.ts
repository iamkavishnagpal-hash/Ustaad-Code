import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { app } from 'electron';
import { Logger } from '../utils/logger';

export const AppSettingsSchema = z.object({
  startWithWindows: z.boolean().default(false),
  startMinimized: z.boolean().default(false),
  closeToTray: z.boolean().default(true),
  theme: z.enum(['dark', 'system']).default('dark'),
  enableTelemetry: z.boolean().default(false),
  activeWorkspaceId: z.string().optional(),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

export class AppSettingsStore {
  private settingsPath: string;
  private settings: AppSettings;

  constructor(customPath?: string) {
    if (customPath) {
      this.settingsPath = customPath;
    } else {
      let userDataPath = path.join(process.cwd(), '.data');
      try {
        if (app && typeof app.getPath === 'function') {
          userDataPath = app.getPath('userData');
        }
      } catch {}
      this.settingsPath = path.join(userDataPath, 'settings.json');
    }

    this.settings = this.loadSettings();
  }

  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  public get(): AppSettings {
    return this.getSettings();
  }

  public update(partial: Partial<AppSettings>): AppSettings {
    return this.updateSettings(partial);
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    const candidate = {
      ...this.settings,
      ...partial,
    };

    const parsed = AppSettingsSchema.safeParse(candidate);
    if (!parsed.success) {
      Logger.warn('invalid_settings_update', { errors: parsed.error.errors });
      return this.settings;
    }

    this.settings = parsed.data;
    this.saveSettings();

    // Apply native startup behavior if in Electron environment
    try {
      if (app && typeof app.setLoginItemSettings === 'function') {
        app.setLoginItemSettings({
          openAtLogin: this.settings.startWithWindows,
          openAsHidden: this.settings.startMinimized,
        });
      }
    } catch (err: any) {
      Logger.warn('failed_to_apply_login_item_settings', { error: err?.message });
    }

    return { ...this.settings };
  }

  private loadSettings(): AppSettings {
    if (!fs.existsSync(this.settingsPath)) {
      return AppSettingsSchema.parse({});
    }

    try {
      const raw = fs.readFileSync(this.settingsPath, 'utf-8');
      const parsed = JSON.parse(raw);
      const validated = AppSettingsSchema.safeParse(parsed);
      if (validated.success) {
        return validated.data;
      }
      Logger.warn('settings_parse_fallback_to_defaults', { errors: validated.error.errors });
      return AppSettingsSchema.parse({});
    } catch (err: any) {
      Logger.warn('settings_read_error_fallback', { error: err?.message });
      return AppSettingsSchema.parse({});
    }
  }

  private saveSettings(): void {
    try {
      const dir = path.dirname(this.settingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8');
      Logger.info('settings_saved');
    } catch (err: any) {
      Logger.error('settings_save_failed', err);
    }
  }
}
