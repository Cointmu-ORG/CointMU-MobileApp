import { Image } from 'react-native';

// The desktop app's logo, also used by the native splash (app.json).
const LOGO = require('../../../assets/splash-icon.png');

type BrandMarkProps = {
  /** Width and height in dp. */
  size: number;
};

/** The Muvo / CointMU logo. Decorative: screens name the app in text. */
export function BrandMark({ size }: BrandMarkProps) {
  return (
    <Image
      source={LOGO}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
