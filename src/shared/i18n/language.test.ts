import AsyncStorage from '@react-native-async-storage/async-storage';

import { i18n } from './i18n';
import { restoreLanguage, setLanguage } from './language';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('language preference', () => {
  it('switches now and is restored on the next launch', async () => {
    await setLanguage('id');
    await i18n.changeLanguage('en'); // a new launch starts from the device language
    await restoreLanguage();
    expect(i18n.language).toBe('id');
  });

  it('ignores a missing or unknown stored value', async () => {
    await AsyncStorage.setItem('muvo.language', 'xx');
    await restoreLanguage();
    expect(i18n.language).toBe('en');
  });
});
