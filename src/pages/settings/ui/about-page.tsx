import BookOpen from 'lucide-react-native/icons/book-open';
import Bug from 'lucide-react-native/icons/bug';
import CodeXml from 'lucide-react-native/icons/code-xml';
import ExternalLink from 'lucide-react-native/icons/external-link';
import Hash from 'lucide-react-native/icons/hash';
import Layers from 'lucide-react-native/icons/layers';
import Newspaper from 'lucide-react-native/icons/newspaper';
import Scale from 'lucide-react-native/icons/scale';
import Server from 'lucide-react-native/icons/server';
import Tag from 'lucide-react-native/icons/tag';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { network, useActiveRpcUrl } from '@/entities/network';
import { EXTERNAL_LINKS, getAppInfo } from '@/shared/config';
import { formatUrlHost, logger } from '@/shared/lib';
import {
  BrandMark,
  FormScreen,
  ICON_SIZE,
  SettingsRow,
  SettingsSection,
  Text,
  useThemeColors,
} from '@/shared/ui';

import { BuildInfoSection } from './build-info-section';

const LOGO_SIZE = 72;

type LinkRowProps = { icon: LucideIcon; title: string; description: string; url: string };

/** Opens in the system browser, never inside the wallet. */
function LinkRow({ icon, title, description, url }: LinkRowProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  return (
    <SettingsRow
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

function AppHeader() {
  const { t } = useTranslation();
  const { version, codename, build } = getAppInfo();
  return (
    <View className="items-center gap-2 py-2">
      <BrandMark size={LOGO_SIZE} />
      <Text variant="title" accessibilityRole="header">
        {t('settings.about.appName')}
      </Text>
      <Text tone="secondary" className="text-center">
        {t('settings.about.tagline')}
      </Text>
      <Text variant="label" tone="secondary" className="text-center">
        {t('settings.about.versionLine', {
          version: codename ? `${version}-${codename}` : version,
          build: build ?? t('settings.about.devBuild'),
        })}
      </Text>
    </View>
  );
}

/** Settings > About: what this app is, which chain and node it talks to, and where to get help. */
export function AboutPage() {
  const { t } = useTranslation();
  const rpcUrl = useActiveRpcUrl();
  const { version, codename, build } = getAppInfo();

  return (
    <FormScreen>
      <AppHeader />
      <SettingsSection title={t('settings.about.app')}>
        <SettingsRow icon={Tag} title={t('settings.about.version')} value={version} />
        {codename ? (
          <SettingsRow icon={Layers} title={t('settings.about.codename')} value={codename} />
        ) : null}
        <SettingsRow
          icon={Hash}
          title={t('settings.about.build')}
          value={build ?? t('settings.about.devBuild')}
        />
      </SettingsSection>
      <BuildInfoSection />
      <SettingsSection title={t('settings.about.networkTitle')}>
        <SettingsRow icon={Layers} title={t('settings.about.network')} value={network.name} />
        <SettingsRow
          icon={Hash}
          title={t('settings.about.chainId')}
          value={String(network.chainId)}
        />
        <SettingsRow
          icon={Server}
          title={t('settings.about.rpcNode')}
          value={formatUrlHost(rpcUrl)}
        />
      </SettingsSection>
      <SettingsSection title={t('settings.about.links')}>
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
          icon={Newspaper}
          title={t('settings.about.releaseNotesTitle')}
          description={t('settings.about.releaseNotesDesc')}
          url={EXTERNAL_LINKS.releaseNotes}
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
      </SettingsSection>
      <View className="gap-1 px-1">
        <Text variant="caption" tone="secondary" className="text-center">
          {t('settings.about.copyright')}
        </Text>
        <Text variant="caption" tone="secondary" className="text-center">
          {t('settings.about.disclaimer')}
        </Text>
      </View>
    </FormScreen>
  );
}
