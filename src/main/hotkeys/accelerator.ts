/**
 * Normalizes accelerator strings to standard Electron accelerator tokens.
 * Decoupled from Electron runtime so it is purely testable in isolation.
 * e.g. "ctrl+shift+h" -> "CommandOrControl+Shift+H"
 */
export function normalizeAccelerator(hotkey: string): string {
  const parts = hotkey.split('+').map(p => p.trim());
  const mapped = parts.map(part => {
    const lower = part.toLowerCase();
    if (lower === 'ctrl' || lower === 'control' || lower === 'commandorcontrol') return 'CommandOrControl';
    if (lower === 'alt') return 'Alt';
    if (lower === 'shift') return 'Shift';
    if (lower === 'win' || lower === 'super' || lower === 'meta') return 'Super';
    return part.toUpperCase();
  });
  return mapped.join('+');
}
