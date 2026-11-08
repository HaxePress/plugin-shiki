// Shiki's core with the JavaScript regular expression engine, which runs under
// the site's Content Security Policy (`script-src 'self'`, no WebAssembly).
// Grammars and themes load once per page, when a code block first needs them.

import {
  codeToTokens,
  createShikiPrimitiveAsync,
  type ShikiPrimitive,
  type ThemedToken,
} from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { grammarName, grammars, PLAIN_TEXT } from './languages';
import type { Options } from './options';
import { DEFAULT_DARK, DEFAULT_LIGHT, darkThemes, lightThemes } from './themes';

/** Longer blocks stay plain, so one huge paste cannot stall the page. */
const MAX_CODE_LENGTH = 200_000;
/** Longer lines are shown without colors. */
const MAX_LINE_LENGTH = 5_000;

// Shiki's tokenizer without its HTML renderer, which the plugin does not use.
let core: Promise<ShikiPrimitive> | undefined;
const loads = new Map<string, Promise<void>>();

function highlighter(): Promise<ShikiPrimitive> {
  core ??= createShikiPrimitiveAsync({
    themes: [],
    langs: [],
    // Patterns the engine cannot translate are skipped instead of failing the grammar.
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
  return core;
}

function once(key: string, load: () => Promise<void>): Promise<void> {
  let pending = loads.get(key);
  if (!pending) {
    pending = load();
    loads.set(key, pending);
  }
  return pending;
}

function loadGrammar(shiki: ShikiPrimitive, name: string): Promise<void> {
  if (name === PLAIN_TEXT) return Promise.resolve();
  return once(`grammar:${name}`, () => shiki.loadLanguage(grammars[name]()));
}

function loadTheme(shiki: ShikiPrimitive, name: string): Promise<void> {
  const theme = lightThemes[name] ?? darkThemes[name];
  return once(`theme:${name}`, () => shiki.loadTheme(theme()));
}

/** The themes a block uses, by Shiki's color names `light` and `dark`. */
function chosenThemes(options: Options): Record<string, string> {
  const light = Object.hasOwn(lightThemes, options.light) ? options.light : DEFAULT_LIGHT;
  const dark = Object.hasOwn(darkThemes, options.dark) ? options.dark : DEFAULT_DARK;
  if (options.scheme === 'light') return { light };
  if (options.scheme === 'dark') return { dark };
  return { light, dark };
}

function fenceName(code: HTMLElement): string {
  for (const name of code.classList) {
    if (name.startsWith('language-')) return name.slice('language-'.length);
  }
  return '';
}

/** `--a:1;--b:2` as name/value pairs. */
function declarations(style: string | false | undefined): [string, string][] {
  if (!style) return [];
  return style
    .split(';')
    .map((declaration) => declaration.split(':'))
    .filter((parts) => parts.length === 2 && parts[0].trim() !== '')
    .map(([name, value]) => [name.trim(), value.trim()]);
}

function lineElement(tokens: ThemedToken[]): HTMLElement {
  const line = document.createElement('span');
  line.className = 'line';
  for (const token of tokens) {
    const span = document.createElement('span');
    span.textContent = token.content;
    for (const [name, value] of Object.entries(token.htmlStyle ?? {})) {
      span.style.setProperty(name, value);
    }
    line.append(span);
  }
  return line;
}

/**
    Replaces the text of a `<pre><code>` block with colored tokens and returns
    a function that restores the plain block, or nothing when it stays plain.
**/
export async function highlight(
  code: HTMLElement,
  options: Options,
): Promise<(() => void) | undefined> {
  const text = code.textContent ?? '';
  const pre = code.parentElement;
  if (!pre || text.length > MAX_CODE_LENGTH) return undefined;
  const grammar = grammarName(fenceName(code));
  const themes = chosenThemes(options);
  const shiki = await highlighter();
  await Promise.all([
    loadGrammar(shiki, grammar),
    ...Object.values(themes).map((theme) => loadTheme(shiki, theme)),
  ]);
  // The page may have changed the block while the files loaded.
  if (!code.isConnected || code.childElementCount > 0 || code.textContent !== text) {
    return undefined;
  }
  const result = codeToTokens(shiki, text, {
    lang: grammar,
    themes,
    defaultColor: false,
    tokenizeMaxLineLength: MAX_LINE_LENGTH,
  });
  const lines = document.createDocumentFragment();
  result.tokens.forEach((tokens, index) => {
    if (index > 0) lines.append('\n');
    lines.append(lineElement(tokens));
  });
  const rootStyle = declarations(result.rootStyle);
  const hadClass = pre.classList.contains('shiki');
  code.replaceChildren(lines);
  pre.classList.add('shiki');
  pre.dataset.shikiScheme = options.scheme;
  for (const [name, value] of rootStyle) pre.style.setProperty(name, value);
  return () => {
    code.textContent = text;
    if (!hadClass) pre.classList.remove('shiki');
    delete pre.dataset.shikiScheme;
    for (const [name] of rootStyle) pre.style.removeProperty(name);
  };
}
