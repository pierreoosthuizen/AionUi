/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, Menu, Tooltip } from '@arco-design/web-react';
import { ArrowCircleLeft, CloseOne, Computer, Moon, SettingTwo, SunOne } from '@icon-park/react';
import classNames from 'classnames';
import { iconColors } from '@renderer/styles/colors';
import { AGORA_VERSION } from '@/common/agoraVersion';
import { DARK_THEME_ID, LIGHT_THEME_ID, SYSTEM_THEME_ID } from '@/common/theme/constants';
import type { SiderTooltipProps } from '@renderer/utils/ui/siderTooltip';
import PlanUsageBars from './PlanUsageBars';

interface SiderFooterProps {
  isMobile: boolean;
  isSettings: boolean;
  collapsed?: boolean;
  /** Raw selected theme id from config: 'light' | 'dark' | 'system'. */
  activeThemeId: string | null;
  siderTooltipProps: SiderTooltipProps;
  onSettingsClick: () => void;
  onSelectTheme: (id: string) => void;
  showLogout?: boolean;
  onLogoutClick?: () => void;
}

const SiderFooter: React.FC<SiderFooterProps> = ({
  isMobile,
  isSettings,
  collapsed = false,
  activeThemeId,
  siderTooltipProps,
  onSettingsClick,
  onSelectTheme,
  showLogout = false,
  onLogoutClick,
}) => {
  const { t } = useTranslation();

  const settingsIcon = isSettings ? (
    <ArrowCircleLeft
      theme='outline'
      size='16'
      fill='currentColor'
      className='block leading-none'
      style={{ lineHeight: 0 }}
    />
  ) : (
    <SettingTwo
      theme='outline'
      size='16'
      fill='currentColor'
      className='block leading-none'
      style={{ lineHeight: 0 }}
    />
  );
  const showThemeToggle = isSettings && !collapsed;
  const themeOptions = [
    {
      id: LIGHT_THEME_ID,
      label: t('settings.lightMode'),
      icon: <SunOne theme='outline' size='16' fill='currentColor' />,
    },
    { id: DARK_THEME_ID, label: t('settings.darkMode'), icon: <Moon theme='outline' size='16' fill='currentColor' /> },
    {
      id: SYSTEM_THEME_ID,
      label: t('settings.cssTheme.followSystem', { defaultValue: 'Follow System' }),
      icon: <Computer theme='outline' size='16' fill='currentColor' />,
    },
  ];
  const currentTheme = themeOptions.find((o) => o.id === activeThemeId) ?? themeOptions[0];

  return (
    <div className='shrink-0 sider-footer mt-auto pt-8px pb-8px border-t border-solid border-[var(--color-border-2)] border-l-0 border-r-0 border-b-0'>
      {/* Plan usage (session + weekly) — hidden when collapsed (see component) */}
      <PlanUsageBars collapsed={collapsed} />
      <div className={classNames('flex', collapsed ? 'flex-col gap-2px' : 'items-center gap-2px')}>
        <Tooltip {...siderTooltipProps} content={isSettings ? t('common.back') : t('common.settings')} position='right'>
          <div
            onClick={onSettingsClick}
            className={classNames(
              'group h-34px flex items-center rd-0.5rem cursor-pointer transition-colors',
              collapsed ? 'w-full justify-center' : 'flex-1 min-w-0 justify-start gap-8px pl-10px pr-8px',
              isMobile && 'sider-footer-btn-mobile',
              {
                'bg-fill-3': isSettings,
                'hover:bg-fill-3 active:bg-fill-4': !isSettings,
              }
            )}
          >
            <span className='size-22px flex items-center justify-center shrink-0 text-t-secondary'>{settingsIcon}</span>
            <span className='collapsed-hidden text-t-primary text-14px font-[500] leading-24px truncate'>
              {isSettings ? t('common.back') : t('common.settings')}
            </span>
          </div>
        </Tooltip>
        {showLogout && onLogoutClick && (
          <Tooltip {...siderTooltipProps} content={t('settings.googleLogout')} position='right'>
            <div
              onClick={onLogoutClick}
              className={classNames(
                'h-32px flex items-center rd-0.5rem cursor-pointer transition-colors hover:bg-[rgba(var(--primary-6),0.14)] active:bg-fill-2',
                collapsed ? 'w-full justify-center' : 'flex-1 min-w-0 justify-start gap-10px px-14px',
                isMobile && 'sider-footer-btn-mobile'
              )}
            >
              <span className='size-20px flex items-center justify-center shrink-0'>
                <CloseOne
                  theme='outline'
                  size='16'
                  fill={iconColors.primary}
                  className='block leading-none'
                  style={{ lineHeight: 0 }}
                />
              </span>
              <span className='collapsed-hidden text-t-primary text-14px font-[500] leading-24px truncate'>
                {t('settings.googleLogout')}
              </span>
            </div>
          </Tooltip>
        )}
        {/* Theme selector — light / dark / follow-system, only inside Settings page (not collapsed) */}
        {showThemeToggle && (
          <Dropdown
            trigger='click'
            position='tr'
            droplist={
              <Menu selectedKeys={[currentTheme.id]} onClickMenuItem={(key) => onSelectTheme(key)}>
                {themeOptions.map((o) => (
                  <Menu.Item key={o.id}>
                    <span className='flex items-center gap-8px'>
                      {o.icon}
                      {o.label}
                    </span>
                  </Menu.Item>
                ))}
              </Menu>
            }
          >
            <div
              className={classNames(
                'h-32px w-40px shrink-0 flex items-center justify-center cursor-pointer rd-0.5rem transition-colors text-t-secondary hover:bg-fill-2 hover:text-t-primary active:bg-fill-3',
                isMobile && 'sider-footer-btn-mobile'
              )}
              aria-label={currentTheme.label}
              title={currentTheme.label}
            >
              <span className='w-28px h-28px flex items-center justify-center shrink-0'>{currentTheme.icon}</span>
            </div>
          </Dropdown>
        )}
      </div>
      {/* Agora version — under the settings button */}
      <div
        className={classNames(
          'mt-4px text-t-tertiary text-10px leading-none select-none',
          collapsed ? 'text-center' : 'pl-12px'
        )}
      >
        v{AGORA_VERSION}
      </div>
    </div>
  );
};

export default SiderFooter;
