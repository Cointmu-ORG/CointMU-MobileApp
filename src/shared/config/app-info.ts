import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export type AppInfo = {
  /** Release version from the app config (D-40). */
  readonly version: string;
  /** Native build number; null in Expo Go and dev clients, which report their own. */
  readonly build: string | null;
};

export function getAppInfo(): AppInfo {
  const isClientApp = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  return {
    version: Constants.expoConfig?.version ?? Application.nativeApplicationVersion ?? '',
    build: isClientApp ? null : Application.nativeBuildVersion,
  };
}
