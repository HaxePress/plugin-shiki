// HaxePress frontend module (docs/PLUGIN-PACKAGES.md, Hooks): highlights the
// fenced code blocks of public pages with Shiki in the browser. Pages load only
// this small module; the highlighter, the chosen themes and the grammars of the
// languages on the page load when a code block comes near the viewport.

import type { Options, Scheme } from './options';

interface ExtensionContext {
  root: HTMLElement;
  settings: Record<string, string>;
}

type Highlighter = typeof import('./highlight');

function readOptions(settings: Record<string, string>): Options {
  const requested = settings.color_scheme;
  const scheme: Scheme = requested === 'light' || requested === 'dark' ? requested : 'system';
  return {
    light: settings.light_theme || '',
    dark: settings.dark_theme || '',
    scheme,
  };
}

/** Code blocks as HaxePress Markdown writes them: `<pre><code class="language-…">`. */
function codeBlocks(root: HTMLElement): HTMLElement[] {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('pre > code'));
  return candidates.filter(
    (code) =>
      code.childElementCount === 0 &&
      code.parentElement?.childElementCount === 1 &&
      !code.closest('[contenteditable]'),
  );
}

export function activate({ root, settings }: ExtensionContext) {
  const blocks = codeBlocks(root);
  if (blocks.length === 0) return () => {};
  const options = readOptions(settings);
  let active = true;
  let highlighter: Promise<Highlighter> | undefined;
  const restores: (() => void)[] = [];

  const highlight = (code: HTMLElement) => {
    highlighter ??= import('./highlight');
    highlighter
      .then((module) => (active ? module.highlight(code, options) : undefined))
      .then((restore) => {
        if (!restore) return;
        if (active) restores.push(restore);
        else restore();
      })
      .catch((error: unknown) => console.error('Shiki could not highlight a code block.', error));
  };

  const pending = new Map<Element, HTMLElement>();
  const observer =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const code = pending.get(entry.target);
              if (!entry.isIntersecting || !code) continue;
              observer?.unobserve(entry.target);
              pending.delete(entry.target);
              highlight(code);
            }
          },
          { rootMargin: '600px 0px' },
        )
      : null;
  for (const code of blocks) {
    const pre = code.parentElement as HTMLElement;
    if (observer) {
      pending.set(pre, code);
      observer.observe(pre);
    } else {
      highlight(code);
    }
  }

  return () => {
    active = false;
    observer?.disconnect();
    pending.clear();
    for (const restore of restores.reverse()) restore();
  };
}
