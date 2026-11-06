import BookOpen from 'lucide-react-native/icons/book-open';
import Bug from 'lucide-react-native/icons/bug';
import CodeXml from 'lucide-react-native/icons/code-xml';
import ExternalLink from 'lucide-react-native/icons/external-link';
import Scale from 'lucide-react-native/icons/scale';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { network, useActiveRpcUrl } from '@/entities/network';
import { EXTERNAL_LINKS, getAppInfo } from '@/shared/config';
import { formatUrlHost, logger } from '@/shared/lib';
import { colors, ICON_SIZE, ListRow, ListSection } from '@/shared/ui';

type LinkRowProps = { icon: LucideIcon; title: string; description: string; url: string };

function LinkRow({ icon, title, description, url }: LinkRowProps) {
  const { t } = useTranslation();
  return (
    <ListRow
      icon={icon}
      title={title}
      description={description}
      onPress={() => {
        Linking.openURL(url).catch((error: unknown) =>
          logger.warn('Opening a link failed', { error, url }),
        );
      }}
      trailing={<ExternalLink size={ICON_SIZE.sm} color={colors.content.secondary} />}
      accessibilityRole="link"
      accessibilityHint={t('settings.about.opensBrowser')}
    />
  );
}

export function AboutSection() {
  const { t } = useTranslation();
  const rpcUrl = useActiveRpcUrl();
  const { version, build } = getAppInfo();
  return (
    <>
      <ListSection title={t('settings.about.title')}>
        <ListRow
          title="Muvo"
          value={t('settings.about.versionLine', {
            version,
            build: build ?? t('settings.about.devBuild'),
          })}
        />
        <ListRow title={t('settings.about.chainId')} value={String(network.chainId)} />
        <ListRow title={t('settings.about.rpcNode')} value={formatUrlHost(rpcUrl)} />
      </ListSection>
      <ListSection title={t('settings.about.links')}>
        <LinkRow
          icon={BookOpen}
          title={t('settings.about.documentationTitle')}
          description={t('settings.about.documentationDesc')}
          url={EXTERNAL_LINKS.documentation}
        />
        <LinkRow
          icon={CodeXml}
          title={t('settings.about.githubTitle')}
          description={formatUrlHost(EXTERNAL_LINKS.repository)}
          url={EXTERNAL_LINKS.repository}
        />
        <LinkRow
          icon={Bug}
          title={t('settings.about.reportIssueTitle')}
          description={t('settings.about.reportIssueDesc')}
          url={EXTERNAL_LINKS.reportIssue}
        />
        <LinkRow
          icon={Scale}
          title={t('settings.about.licenseTitle')}
          description={t('settings.about.licenseDesc')}
          url={EXTERNAL_LINKS.license}
        />
      </ListSection>
    </>
  );
}
