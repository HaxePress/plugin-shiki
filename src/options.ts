/** `system` follows the visitor's `prefers-color-scheme`; the others force one theme. */
export type Scheme = 'system' | 'light' | 'dark';

/** The plugin's settings as the frontend module reads them. */
export interface Options {
  light: string;
  dark: string;
  scheme: Scheme;
}
