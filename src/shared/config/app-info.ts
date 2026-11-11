import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { codename, version as packageVersion } from '../../../package.json';

export type AppInfo = {
  /** Release version from the app config (D-40). */
  readonly version: string;
  /** Release codename stamped into package.json by the version script (D-40); '' if unset. */
  readonly codename: string;
  /** Native build number; null in Expo Go and dev clients, which report their own. */
  readonly build: string | null;
};

/** True in Expo Go, which runs our JS inside its own native app (its Info.plist, not ours). */
export function isRunningInExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export function getAppInfo(): AppInfo {
  const isClientApp = isRunningInExpoGo();
  return {
    // package.json carries the same release version as app.json (D-40).
    version:
      Constants.expoConfig?.version ?? Application.nativeApplicationVersion ?? packageVersion,
    codename,
    build: isClientApp ? null : Application.nativeBuildVersion,
  };
}
