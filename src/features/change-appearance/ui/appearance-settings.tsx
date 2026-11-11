import Coins from 'lucide-react-native/icons/coins';
import EyeOff from 'lucide-react-native/icons/eye-off';
import PanelTop from 'lucide-react-native/icons/panel-top';
import Type from 'lucide-react-native/icons/type';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';

import {
  BALANCE_DECIMAL_OPTIONS,
  DENSITIES,
  MOTION_PREFERENCES,
  TIME_FORMATS,
  useAppearanceStore,
  type BalanceDecimals,
} from '@/shared/model';
import { SettingsChoiceRow, SettingsSection, SettingsSwitchRow, Text } from '@/shared/ui';

import { AccentPicker } from './accent-picker';
import { ThemePicker } from './theme-picker';

const { update } = useAppearanceStore.getState();

function LayoutSection() {
  const { t } = useTranslation();
  const density = useAppearanceStore((state) => state.density);
  const motion = useAppearanceStore((state) => state.motion);
  const followsSystemTextSize = useAppearanceStore((state) => state.followsSystemTextSize);
  return (
    <SettingsSection title={t('settings.appearance.layout')}>
      <SettingsChoiceRow
        title={t('settings.appearance.density')}
        description={t('settings.appearance.densityDesc')}
        options={DENSITIES.map((value) => ({
          value,
          label: t(`settings.appearance.densities.${value}`),
        }))}
        value={density}
        onChange={(value) => update({ density: value })}
      />
      <SettingsSwitchRow
        icon={Type}
        title={t('settings.appearance.textSize')}
        description={t('settings.appearance.textSizeDesc')}
        value={followsSystemTextSize}
        onValueChange={(next) => update({ followsSystemTextSize: next })}
      />
      <SettingsChoiceRow
        title={t('settings.appearance.motion')}
        description={t('settings.appearance.motionDesc')}
        options={MOTION_PREFERENCES.map((value) => ({
          value,
          label: t(`settings.appearance.motions.${value}`),
        }))}
        value={motion}
        onChange={(value) => update({ motion: value })}
      />
    </SettingsSection>
  );
}

function DisplaySection() {
  const { t } = useTranslation();
  const timeFormat = useAppearanceStore((state) => state.timeFormat);
  const balanceDecimals = useAppearanceStore((state) => state.balanceDecimals);
  const hidesZeroBalanceTokens = useAppearanceStore((state) => state.hidesZeroBalanceTokens);
  const decimalOptions = BALANCE_DECIMAL_OPTIONS.map((value) => ({
    value: String(value),
    label: value === 'full' ? t('settings.appearance.decimalsFull') : String(value),
  }));
  return (
    <SettingsSection title={t('settings.appearance.display')}>
      <SettingsChoiceRow
        title={t('settings.appearance.timeFormat')}
        description={t('settings.appearance.timeFormatDesc')}
        options={TIME_FORMATS.map((value) => ({
          value,
          label: t(`settings.appearance.timeFormats.${value}`),
        }))}
        value={timeFormat}
        onChange={(value) => update({ timeFormat: value })}
      />
      <SettingsChoiceRow
        title={t('settings.appearance.decimals')}
        description={t('settings.appearance.decimalsDesc')}
        options={decimalOptions}
        value={String(balanceDecimals)}
        onChange={(value) => {
          const next = BALANCE_DECIMAL_OPTIONS.find((option) => String(option) === value);
          if (next !== undefined) update({ balanceDecimals: next satisfies BalanceDecimals });
        }}
      />
      <SettingsSwitchRow
        icon={Coins}
        title={t('settings.appearance.hideZero')}
        description={t('settings.appearance.hideZeroDesc')}
        value={hidesZeroBalanceTokens}
        onValueChange={(next) => update({ hidesZeroBalanceTokens: next })}
      />
    </SettingsSection>
  );
}

function PrivacySection() {
  const { t } = useTranslation();
  const hidesBalances = useAppearanceStore((state) => state.hidesBalances);
  const hidesAppInSwitcher = useAppearanceStore((state) => state.hidesAppInSwitcher);
  return (
    <SettingsSection
      title={t('settings.appearance.privacy')}
      footer={t('settings.appearance.privacyFooter')}
    >
      <SettingsSwitchRow
        icon={EyeOff}
        title={t('settings.appearance.hideBalances')}
        description={t('settings.appearance.hideBalancesDesc')}
        value={hidesBalances}
        onValueChange={(next) => update({ hidesBalances: next })}
      />
      <SettingsSwitchRow
        icon={PanelTop}
        title={t('settings.appearance.hideInSwitcher')}
        description={t(
          Platform.OS === 'android'
            ? 'settings.appearance.hideInSwitcherDescAndroid'
            : 'settings.appearance.hideInSwitcherDesc',
        )}
        value={hidesAppInSwitcher}
        onValueChange={(next) => update({ hidesAppInSwitcher: next })}
      />
    </SettingsSection>
  );
}

/**
 * Settings > Appearance: theme, accent, layout, display and privacy. Every value is saved and
 * applied at once; nothing here needs a restart.
 */
export function AppearanceSettings() {
  const { t } = useTranslation();
  return (
    <View className="gap-6">
      <View className="gap-2">
        <Text variant="label" tone="secondary" className="px-1" accessibilityRole="header">
          {t('settings.appearance.theme')}
        </Text>
        <ThemePicker />
      </View>
      <SettingsSection>
        <AccentPicker />
      </SettingsSection>
      <LayoutSection />
      <DisplaySection />
      <PrivacySection />
    </View>
  );
}
