import { ErrorReportingSettings } from '@/features/error-reporting';
import { FormScreen } from '@/shared/ui';

/** Settings > Privacy: whether error reports are sent, and what a report holds (D-77). */
export function PrivacyPage() {
  return (
    <FormScreen>
      <ErrorReportingSettings />
    </FormScreen>
  );
}
