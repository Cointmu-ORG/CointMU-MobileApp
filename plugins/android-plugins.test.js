const { generateKeyPairSync, X509Certificate } = require('node:crypto');
const { execFileSync } = require('node:child_process');

const { toVersionCode, setVersionName } = require('./android-version');
const { addReleaseSigning, hasSigningEnv } = require('./android-signing');
const { planNetworkSecurity, renderNetworkSecurityConfig } = require('./android-network-security');

// The relevant part of android/app/build.gradle from the Expo SDK 58 template.
const TEMPLATE_GRADLE = `android {
    defaultConfig {
        versionCode 1001000
        versionName "1.1.0"
    }
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}
`;

describe('toVersionCode', () => {
  it.each([
    ['1.1.0', 1_001_000],
    ['1.1.0-FelisCatus', 1_001_000],
    ['1.2.3-beta.4', 1_002_003],
    ['0.0.1', 1],
    ['12.345.678', 12_345_678],
  ])('%s → %d', (version, expected) => {
    expect(toVersionCode(version)).toBe(expected);
  });

  it('grows with every release step', () => {
    const order = ['1.0.999', '1.1.0', '1.1.1', '1.999.999', '2.0.0'].map(toVersionCode);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it.each(['1.1', 'v1.1.0', '1.1.0.4', '1.1000.0', '1.0.1000', '2101.0.0', ''])(
    'refuses %s',
    (version) => {
      expect(() => toVersionCode(version)).toThrow('Cannot derive versionCode');
    },
  );
});

describe('setVersionName', () => {
  it('writes the full version, prerelease included', () => {
    expect(setVersionName(TEMPLATE_GRADLE, '1.2.0-beta.1')).toContain('versionName "1.2.0-beta.1"');
  });

  it('fails when the template has no versionName', () => {
    expect(() => setVersionName('android {}', '1.0.0')).toThrow('no versionName');
  });
});

describe('release signing', () => {
  const env = {
    ANDROID_KEYSTORE_PATH: '/tmp/release.keystore',
    ANDROID_KEYSTORE_PASSWORD: 'store-secret',
    ANDROID_KEY_ALIAS: 'muvo',
    ANDROID_KEY_PASSWORD: 'key-secret',
  };

  it('is off with no variable and on with all four', () => {
    expect(hasSigningEnv({})).toBe(false);
    expect(hasSigningEnv(env)).toBe(true);
  });

  it('refuses a partial config and names only the missing variables', () => {
    const partial = { ...env, ANDROID_KEY_PASSWORD: '' };
    expect(() => hasSigningEnv(partial)).toThrow('missing ANDROID_KEY_PASSWORD.');
    expect(() => hasSigningEnv(partial)).not.toThrow(/secret/);
  });

  it('signs release with the release key and leaves debug alone', () => {
    const gradle = addReleaseSigning(TEMPLATE_GRADLE);
    const [, buildTypes] = gradle.split('buildTypes {');
    expect(buildTypes.match(/signingConfig signingConfigs\.\w+/g)).toEqual([
      'signingConfig signingConfigs.debug',
      'signingConfig signingConfigs.release',
    ]);
    expect(gradle).toContain("storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))");
  });

  it('writes variable names only, never a value', () => {
    const gradle = addReleaseSigning(TEMPLATE_GRADLE);
    for (const value of Object.values(env)) expect(gradle).not.toContain(value);
  });

  it('fails loudly when the template changed', () => {
    expect(() => addReleaseSigning('android {}')).toThrow('does not match the Expo template');
  });
});

describe('network security config', () => {
  const rpcUrls = 'http://10.0.0.1:8585, http://10.0.0.2:8585,https://rpc.example.invalid';

  /** A throwaway self-signed certificate; skipped where openssl is missing. */
  function selfSignedCert() {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const key = privateKey.export({ type: 'pkcs8', format: 'pem' });
    return execFileSync(
      'openssl',
      ['req', '-x509', '-new', '-key', '/dev/stdin', '-subj', '/CN=test', '-days', '1'],
      { input: key, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
    );
  }

  it('allows cleartext only for the http hosts known at build time', () => {
    const plan = planNetworkSecurity({ rpcUrls, dsn: 'http://key@10.0.0.9/1' });
    expect(plan).toEqual({
      cleartextHosts: ['10.0.0.1', '10.0.0.2', '10.0.0.9'],
      pinnedHost: null,
    });
  });

  it('is HTTPS-only with nothing configured', () => {
    const xml = renderNetworkSecurityConfig(planNetworkSecurity({}));
    expect(xml).toContain('<base-config cleartextTrafficPermitted="false">');
    expect(xml).not.toContain('domain-config');
  });

  it('never trusts user CAs and never permits cleartext globally', () => {
    const xml = renderNetworkSecurityConfig(
      planNetworkSecurity({ rpcUrls, dsn: 'http://key@10.0.0.9/1' }),
    );
    expect(xml).not.toContain('src="user"');
    expect(xml).toContain('<base-config cleartextTrafficPermitted="false">');
    expect(xml.match(/<domain /g)).toHaveLength(3);
  });

  it('ignores a certificate when the DSN is not https', () => {
    const plan = planNetworkSecurity({ dsn: 'http://key@10.0.0.9/1', certPem: 'anything' });
    expect(plan.pinnedHost).toBeNull();
  });

  it('refuses a certificate that is not one', () => {
    expect(() =>
      planNetworkSecurity({ dsn: 'https://key@10.0.0.9/1', certPem: 'not a certificate' }),
    ).toThrow('GLITCHTIP_CERT_PEM is not a PEM certificate');
  });

  it('trusts the certificate for the https DSN host only', () => {
    let certPem;
    try {
      certPem = selfSignedCert();
    } catch {
      // No openssl on this machine: the pinned path is covered in CI.
      return;
    }
    expect(new X509Certificate(certPem).subject).toBe('CN=test');
    const plan = planNetworkSecurity({ rpcUrls, dsn: 'https://key@10.0.0.9/1', certPem });
    expect(plan).toEqual({ cleartextHosts: ['10.0.0.1', '10.0.0.2'], pinnedHost: '10.0.0.9' });
    const xml = renderNetworkSecurityConfig(plan);
    const pinned = xml.slice(xml.lastIndexOf('<domain-config'));
    expect(pinned).toContain('<domain includeSubdomains="false">10.0.0.9</domain>');
    expect(pinned).toContain('<certificates src="@raw/glitchtip_cert" />');
    expect(pinned).not.toContain('src="system"');
  });
});
