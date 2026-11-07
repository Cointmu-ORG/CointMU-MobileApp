import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/shared/ui';

export type ImportMode = 'mnemonic' | 'private-key';

type ImportModeToggleProps = {
  mode: ImportMode;
  onChange: (mode: ImportMode) => void;
};

export function ImportModeToggle({ mode, onChange }: ImportModeToggleProps) {
  const { t } = useTranslation();
  return (
    <SegmentedControl
      accessibilityLabel={t('onboarding.import.modeLabel')}
      options={[
        { value: 'mnemonic', label: t('onboarding.import.modeMnemonic') },
        { value: 'private-key', label: t('onboarding.import.modePrivateKey') },
      ]}
      value={mode}
      onChange={onChange}
    />
  );
}
