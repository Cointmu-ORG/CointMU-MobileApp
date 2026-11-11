import Fingerprint from 'lucide-react-native/icons/fingerprint-pattern';
import ScanFace from 'lucide-react-native/icons/scan-face';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { BiometricKind } from '@/entities/auth';

const FACE_KINDS: readonly BiometricKind[] = ['face-id', 'face'];

/** The sensor's name as the device calls it ("Face ID", "Fingerprint") and a matching icon. */
export function useBiometricLabel(kind: BiometricKind | null): { name: string; icon: LucideIcon } {
  const { t } = useTranslation();
  return {
    name: t(`settings.biometrics.kind.${kind ?? 'generic'}`),
    icon: kind !== null && FACE_KINDS.includes(kind) ? ScanFace : Fingerprint,
  };
}
