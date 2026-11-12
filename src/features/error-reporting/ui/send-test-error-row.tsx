import FlaskConical from 'lucide-react-native/icons/flask-conical';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { sendTestErrorReport } from '@/shared/lib';
import { SettingsRow } from '@/shared/ui';

type Outcome = 'idle' | 'queued' | 'off';

const DESCRIPTION_KEY = {
  idle: 'settings.about.testErrorDesc',
  queued: 'settings.about.testErrorQueued',
  off: 'settings.about.testErrorOff',
} as const;

/**
 * Development builds only: sends one sample report holding fake secrets, to check on a device
 * that reports arrive in GlitchTip with everything sensitive redacted.
 */
export function SendTestErrorRow() {
  const { t } = useTranslation();
  const [outcome, setOutcome] = useState<Outcome>('idle');
  return (
    <SettingsRow
      icon={FlaskConical}
      title={t('settings.about.testError')}
      description={t(DESCRIPTION_KEY[outcome])}
      onPress={() => setOutcome(sendTestErrorReport() ? 'queued' : 'off')}
      accessibilityRole="button"
    />
  );
}
