# Problem Definition: Personal AI Workspace OS

## The Problem
Users increasingly maintain specialized AI workspaces for engineering, meetings, and research—such as ChatGPT Projects, Claude Projects, Gemini workspaces, or local endpoints. Each workspace holds curated documents, terminology, custom instructions, and domain context.

However, the user's AI workspace is fundamentally disconnected from their Windows desktop workflow:
1. Every time a meeting or technical task starts, the user must manually navigate to a browser, find the correct project tab, make sure context is active, and configure screen/audio tools manually.
2. In the middle of desktop work, switching contexts between editor, terminal, meeting windows, and the AI workspace requires high cognitive effort and repetitive copy-pasting.
3. Users are forced to recreate the same setup every day.

## The Solution
A dedicated desktop runtime layer that bridges the Windows operating system and existing AI workspaces.

The user configures a Workspace once:
- Source specification (web project URL, provider type)
- Global activation hotkey (e.g. `Ctrl + Shift + H`)
- Verified privacy & capture policy
- Overlay preferences

With one global keystroke from anywhere in Windows:
1. The shortcut is caught by the OS hotkey manager.
2. The runtime validates and activates the configured workspace.
3. The source AI environment is opened/focused.
4. A verified runtime session is established.
5. An always-on-top desktop overlay appears reporting genuine verified state (`READY`).
