/**
 * Expo config plugin: network security config for Android release builds (D-87).
 *
 * Release builds are HTTPS-only, with two build-time exceptions and nothing else:
 * - cleartext (http://) only for the hosts of the http:// URLs in EXPO_PUBLIC_RPC_URLS and
 *   EXPO_PUBLIC_GLITCHTIP_DSN;
 * - when the DSN is https:// and GLITCHTIP_CERT_PEM holds the server's (public) certificate,
 *   that certificate is the only trust anchor for the DSN host. No other host trusts it, user
 *   CAs are never trusted, and hostname verification stays on.
 *
 * Everything is written under android/app/src/release, so debug builds (which load the bundle
 * from Metro over http) are untouched. src/shared/config's isCleartextAllowed mirrors the
 * cleartext rule for the node screen.
 */
const { X509Certificate } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

const CONFIG_RESOURCE = 'network_security_config';
const CERT_RESOURCE = 'glitchtip_cert';
const RELEASE_MANIFEST = `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:networkSecurityConfig="@xml/${CONFIG_RESOURCE}" />
</manifest>
`;

/**
 * @param {string} value - A URL, possibly empty or invalid.
 * @returns {URL | null} The parsed URL, or null.
 */
function parseUrl(value) {
  try {
    return new URL(value.trim());
  } catch {
    // Not a URL: it names no host, so it adds no exception.
    return null;
  }
}

/** URL.hostname keeps the brackets of an IPv6 literal; Android wants it bare. */
function hostOf(url) {
  return url.hostname.replace(/^\[|\]$/g, '');
}

/**
 * @typedef {Object} NetworkSecurityPlan
 * @property {string[]} cleartextHosts - Hosts allowed to use http://.
 * @property {string | null} pinnedHost - Host that trusts only the provided certificate.
 */

/**
 * Works out the exceptions from the build environment.
 * @param {Object} input
 * @param {string} [input.rpcUrls] - EXPO_PUBLIC_RPC_URLS.
 * @param {string} [input.dsn] - EXPO_PUBLIC_GLITCHTIP_DSN.
 * @param {string} [input.certPem] - GLITCHTIP_CERT_PEM.
 * @returns {NetworkSecurityPlan} The exceptions.
 * @throws {Error} When the certificate is not a valid X.509 certificate.
 */
function planNetworkSecurity({ rpcUrls = '', dsn = '', certPem = '' }) {
  const dsnUrl = parseUrl(dsn);
  const urls = [...rpcUrls.split(',').map(parseUrl), dsnUrl].filter(Boolean);
  const cleartextHosts = [...new Set(urls.filter((u) => u.protocol === 'http:').map(hostOf))];
  if (!certPem.trim() || dsnUrl?.protocol !== 'https:') return { cleartextHosts, pinnedHost: null };
  try {
    new X509Certificate(certPem);
  } catch (error) {
    throw new Error('android-network-security: GLITCHTIP_CERT_PEM is not a PEM certificate.', {
      cause: error,
    });
  }
  return { cleartextHosts, pinnedHost: hostOf(dsnUrl) };
}

const domain = (host) => `    <domain includeSubdomains="false">${host}</domain>`;

/**
 * Renders res/xml/network_security_config.xml.
 * @param {NetworkSecurityPlan} plan - The exceptions.
 * @returns {string} The XML.
 */
function renderNetworkSecurityConfig({ cleartextHosts, pinnedHost }) {
  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<network-security-config>',
    '  <base-config cleartextTrafficPermitted="false">',
    '    <trust-anchors>',
    '      <certificates src="system" />',
    '    </trust-anchors>',
    '  </base-config>',
  ];
  if (cleartextHosts.length > 0) {
    lines.push(
      '  <domain-config cleartextTrafficPermitted="true">',
      ...cleartextHosts.map(domain),
      '  </domain-config>',
    );
  }
  if (pinnedHost !== null) {
    lines.push(
      '  <domain-config cleartextTrafficPermitted="false">',
      domain(pinnedHost),
      '    <trust-anchors>',
      `      <certificates src="@raw/${CERT_RESOURCE}" />`,
      '    </trust-anchors>',
      '  </domain-config>',
    );
  }
  return [...lines, '</network-security-config>', ''].join('\n');
}

function withAndroidNetworkSecurity(config) {
  return withDangerousMod(config, [
    'android',
    (modConfig) => {
      const certPem = process.env.GLITCHTIP_CERT_PEM ?? '';
      const plan = planNetworkSecurity({
        rpcUrls: process.env.EXPO_PUBLIC_RPC_URLS,
        dsn: process.env.EXPO_PUBLIC_GLITCHTIP_DSN,
        certPem,
      });
      const release = path.join(modConfig.modRequest.platformProjectRoot, 'app/src/release');
      const write = (file, content) => {
        fs.mkdirSync(path.dirname(path.join(release, file)), { recursive: true });
        fs.writeFileSync(path.join(release, file), content);
      };
      write('AndroidManifest.xml', RELEASE_MANIFEST);
      write(`res/xml/${CONFIG_RESOURCE}.xml`, renderNetworkSecurityConfig(plan));
      if (plan.pinnedHost !== null) write(`res/raw/${CERT_RESOURCE}.pem`, `${certPem.trim()}\n`);
      return modConfig;
    },
  ]);
}

module.exports = withAndroidNetworkSecurity;
module.exports.planNetworkSecurity = planNetworkSecurity;
module.exports.renderNetworkSecurityConfig = renderNetworkSecurityConfig;
