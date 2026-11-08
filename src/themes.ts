// The themes offered in the plugin's settings. Each theme is its own file in
// the package; a page loads only the light and dark theme it uses. The ids
// match the select options of `light_theme` and `dark_theme` in
// cms-package.json, which `npm run build` checks.

import type { ThemeRegistration } from 'shiki/core';

type Theme = () => Promise<{ default: ThemeRegistration }>;

export const lightThemes: Record<string, Theme> = {
  'github-light': () => import('shiki/themes/github-light.mjs'),
  'github-light-default': () => import('shiki/themes/github-light-default.mjs'),
  'github-light-high-contrast': () => import('shiki/themes/github-light-high-contrast.mjs'),
  'light-plus': () => import('shiki/themes/light-plus.mjs'),
  'one-light': () => import('shiki/themes/one-light.mjs'),
  'min-light': () => import('shiki/themes/min-light.mjs'),
  'vitesse-light': () => import('shiki/themes/vitesse-light.mjs'),
  'catppuccin-latte': () => import('shiki/themes/catppuccin-latte.mjs'),
  'rose-pine-dawn': () => import('shiki/themes/rose-pine-dawn.mjs'),
  'solarized-light': () => import('shiki/themes/solarized-light.mjs'),
  'everforest-light': () => import('shiki/themes/everforest-light.mjs'),
  'gruvbox-light-medium': () => import('shiki/themes/gruvbox-light-medium.mjs'),
  'kanagawa-lotus': () => import('shiki/themes/kanagawa-lotus.mjs'),
  'material-theme-lighter': () => import('shiki/themes/material-theme-lighter.mjs'),
  'night-owl-light': () => import('shiki/themes/night-owl-light.mjs'),
  'ayu-light': () => import('shiki/themes/ayu-light.mjs'),
  'slack-ochin': () => import('shiki/themes/slack-ochin.mjs'),
  'snazzy-light': () => import('shiki/themes/snazzy-light.mjs'),
  'horizon-bright': () => import('shiki/themes/horizon-bright.mjs'),
};

export const darkThemes: Record<string, Theme> = {
  'github-dark': () => import('shiki/themes/github-dark.mjs'),
  'github-dark-default': () => import('shiki/themes/github-dark-default.mjs'),
  'github-dark-dimmed': () => import('shiki/themes/github-dark-dimmed.mjs'),
  'github-dark-high-contrast': () => import('shiki/themes/github-dark-high-contrast.mjs'),
  'dark-plus': () => import('shiki/themes/dark-plus.mjs'),
  'one-dark-pro': () => import('shiki/themes/one-dark-pro.mjs'),
  'vitesse-dark': () => import('shiki/themes/vitesse-dark.mjs'),
  'catppuccin-mocha': () => import('shiki/themes/catppuccin-mocha.mjs'),
  'catppuccin-macchiato': () => import('shiki/themes/catppuccin-macchiato.mjs'),
  dracula: () => import('shiki/themes/dracula.mjs'),
  nord: () => import('shiki/themes/nord.mjs'),
  'tokyo-night': () => import('shiki/themes/tokyo-night.mjs'),
  'night-owl': () => import('shiki/themes/night-owl.mjs'),
  monokai: () => import('shiki/themes/monokai.mjs'),
  'rose-pine': () => import('shiki/themes/rose-pine.mjs'),
  'rose-pine-moon': () => import('shiki/themes/rose-pine-moon.mjs'),
  'solarized-dark': () => import('shiki/themes/solarized-dark.mjs'),
  'everforest-dark': () => import('shiki/themes/everforest-dark.mjs'),
  'gruvbox-dark-medium': () => import('shiki/themes/gruvbox-dark-medium.mjs'),
  'kanagawa-wave': () => import('shiki/themes/kanagawa-wave.mjs'),
};

/** The manifest's default themes, used when a setting names no theme of this list. */
export const DEFAULT_LIGHT = 'github-light';
export const DEFAULT_DARK = 'github-dark';
