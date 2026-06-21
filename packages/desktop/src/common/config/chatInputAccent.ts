/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Accent colours for the chat input focus ring, mirroring the Claude Code
 * session `/color` palette. Selected in Appearance settings and consumed by
 * `useInputFocusRing`.
 */
export const CHAT_INPUT_ACCENTS = ['default', 'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'] as const;

export type ChatInputAccent = (typeof CHAT_INPUT_ACCENTS)[number];

export const DEFAULT_CHAT_INPUT_ACCENT: ChatInputAccent = 'cyan';

type AccentSpec = {
  /** Solid colour shown as the picker swatch. */
  swatch: string;
  /** Focused border, light theme. */
  borderLight: string;
  /** Focused border, dark theme. */
  borderDark: string;
  /** "r, g, b" channel triplet for the focus glow. */
  glowRgb: string;
};

export const CHAT_INPUT_ACCENT_MAP: Record<ChatInputAccent, AccentSpec> = {
  default: { swatch: '#C9C7FF', borderLight: '#E1E0FF', borderDark: '#4D4B87', glowRgb: '225, 224, 255' },
  red: { swatch: '#F87171', borderLight: '#F5B5B5', borderDark: '#6E2C2C', glowRgb: '248, 113, 113' },
  blue: { swatch: '#60A5FA', borderLight: '#B3D4FB', borderDark: '#2C4A6E', glowRgb: '96, 165, 250' },
  green: { swatch: '#4ADE80', borderLight: '#B3E6C0', borderDark: '#2C6E3F', glowRgb: '74, 222, 128' },
  yellow: { swatch: '#FACC15', borderLight: '#F3E3A3', borderDark: '#6E5E2C', glowRgb: '250, 204, 21' },
  purple: { swatch: '#A78BFA', borderLight: '#D6C9FB', borderDark: '#4A3C6E', glowRgb: '167, 139, 250' },
  orange: { swatch: '#FB923C', borderLight: '#FBD3A8', borderDark: '#6E4A2C', glowRgb: '251, 146, 60' },
  pink: { swatch: '#F472B6', borderLight: '#F8C4E0', borderDark: '#6E2C52', glowRgb: '244, 114, 182' },
  cyan: { swatch: '#67E8F9', borderLight: '#A0E9E5', borderDark: '#2C6E6B', glowRgb: '103, 232, 249' },
};
