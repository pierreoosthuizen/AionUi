import { useThemeContext } from '@/renderer/hooks/context/ThemeContext';
import { useConfig } from '@/renderer/hooks/config/useConfig';
import { CHAT_INPUT_ACCENT_MAP, DEFAULT_CHAT_INPUT_ACCENT, type ChatInputAccent } from '@/common/config/chatInputAccent';

export const useInputFocusRing = (accentOverride?: ChatInputAccent) => {
  const { theme } = useThemeContext();
  const isDarkTheme = theme === 'dark';

  // Chat input ring colour. An override (e.g. the active conversation's peer
  // colour) wins; otherwise the Appearance-settings accent, defaulting to cyan.
  // Mirrors the Claude Code session `/color` palette.
  const [accent] = useConfig('ui.chatInputAccent');
  const accentName = accentOverride ?? (accent as ChatInputAccent) ?? DEFAULT_CHAT_INPUT_ACCENT;
  const spec = CHAT_INPUT_ACCENT_MAP[accentName] ?? CHAT_INPUT_ACCENT_MAP[DEFAULT_CHAT_INPUT_ACCENT];
  const glowAlpha = isDarkTheme ? 0.4 : 0.55;

  return {
    activeBorderColor: isDarkTheme ? spec.borderDark : spec.borderLight,
    inactiveBorderColor: isDarkTheme ? '#3a3a4a' : '#c9cacf',
    activeShadow: `0px 2px 20px rgba(${spec.glowRgb}, ${glowAlpha})`,
  };
};
