import { KeyboardShortcutsBoard } from "@/components/keyboard-shortcuts/keyboard-shortcuts-board";

/**
 * /keyboard-shortcuts — the Keyboard shortcuts board (design mockup 7.25 + 7.26),
 * a public catalogue page sibling to /design and /empty-states. The board is a
 * client component (live keymap preference + searchable reference); this route
 * is a thin server shell.
 */
export const metadata = {
  title: "Quanta — Keyboard shortcuts",
};

export default function KeyboardShortcutsPage() {
  return (
    <main className="min-h-screen bg-chrome">
      <KeyboardShortcutsBoard />
    </main>
  );
}
