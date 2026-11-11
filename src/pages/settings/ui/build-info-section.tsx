import * as Clipboard from 'expo-clipboard';
import Check from 'lucide-react-native/icons/check';
import Clock from 'lucide-react-native/icons/clock';
import Copy from 'lucide-react-native/icons/copy';
import GitCommitHorizontal from 'lucide-react-native/icons/git-commit-horizontal';
import Package from 'lucide-react-native/icons/package';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { formatBuildReport, getAppInfo, getBuildInfo } from '@/shared/config';
import { formatDateTime, logger } from '@/shared/lib';
import { useAppearanceStore } from '@/shared/model';
import { ICON_SIZE, SettingsRow, SettingsSection, useThemeColors } from '@/shared/ui';

const COPIED_FEEDBACK_MS = 2_000;

/**
 * About > Build (D-72): the commit, time and channel this bundle was made from, and a copy
 * action for bug reports. The copied block is public build data: no address, no key, no node.
 */
export function BuildInfoSection() {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const timeFormat = useAppearanceStore((state) => state.timeFormat);
  const [isCopied, setIsCopied] = useState(false);
  const build = getBuildInfo();

  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);

  const copy = async () => {
    try {
      const platform = `${Platform.OS} ${Platform.Version}`;
      await Clipboard.setStringAsync(formatBuildReport({ app: getAppInfo(), build, platform }));
      setIsCopied(true);
    } catch (error) {
      logger.warn('Copying build info failed', { error });
    }
  };

  const unknown = t('settings.about.unknown');
  const commit = build.commitShort ?? unknown;
  const TrailingIcon = isCopied ? Check : Copy;
  return (
    <SettingsSection title={t('settings.about.buildInfo')}>
      <SettingsRow
        icon={GitCommitHorizontal}
        title={t('settings.about.commit')}
        value={build.isDirty ? t('settings.about.commitModified', { commit }) : commit}
      />
      <SettingsRow
        icon={Clock}
        title={t('settings.about.builtAt')}
        value={
          build.builtAt === null
            ? unknown
            : formatDateTime(Date.parse(build.builtAt), i18n.language, timeFormat)
        }
      />
      <SettingsRow
        icon={Package}
        title={t('settings.about.channel')}
        value={t(`settings.about.channels.${build.channel}`)}
      />
      <SettingsRow
        icon={Copy}
        title={t('settings.about.copyBuildInfo')}
        description={t(isCopied ? 'settings.about.copied' : 'settings.about.copyBuildInfoDesc')}
        onPress={() => void copy()}
        trailing={
          <TrailingIcon
            size={ICON_SIZE.sm}
            color={isCopied ? colors.success.strong : colors.content.secondary}
          />
        }
        accessibilityRole="button"
      />
    </SettingsSection>
  );
}
