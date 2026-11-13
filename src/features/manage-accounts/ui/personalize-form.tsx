import { usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';

import type { AccountIcon } from '@/entities/wallet';
import { Button, Input, StickyFormScreen, Text } from '@/shared/ui';

import { isValidName, MAX_NAME_LENGTH, type CardLook } from '../model/accounts';
import { CardPreview } from './card-preview';
import { ColorSwatches } from './color-swatches';
import { IconPicker, isSameIcon } from './icon-picker';

/** Finds the scrolling part of the page in tests. */
export const PERSONALIZE_SCROLL_ID = 'personalize-scroll';

export type PersonalizeFormProps = {
  /** What is stored now. Save is offered once the form differs from it. */
  initial: CardLook;
  nameLabel: string;
  /** Shown in the field and on the preview while the name is empty. */
  defaultName: string;
  /** Second line of the preview card. */
  detail: string;
  /** Leave the icon out for something that has none of its own (a wallet being edited). */
  picksIcon: boolean;
  /** A step of a setup flow: Save is offered at once, to go on with the defaults. */
  isSetupStep: boolean;
  onSave: (look: CardLook) => void;
  /** Shown under the sections, e.g. the way to remove a wallet. */
  children?: ReactNode;
};

function IconSection({
  value,
  onChange,
}: {
  value: AccountIcon;
  onChange: (icon: AccountIcon) => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-2">
      <Text variant="label" tone="secondary">
        {t('wallets.icons.label')}
      </Text>
      <IconPicker value={value} onChange={onChange} />
    </View>
  );
}

/**
 * The one screen where a card gets its look: the preview stays at the top and Save at the
 * bottom (above the keyboard) while name, color and icon scroll between them. Nothing is saved
 * before Save; leaving with changes asks first.
 */
export function PersonalizeForm(props: PersonalizeFormProps) {
  const { initial, defaultName, isSetupStep, onSave } = props;
  const { t } = useTranslation();
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [icon, setIcon] = useState(initial.icon);
  const trimmed = name.trim();
  const isDirty =
    trimmed !== initial.name || color !== initial.color || !isSameIcon(icon, initial.icon);
  const isNameValid = isValidName(name);

  // The discard button needs the function this very hook returns, so it goes through a ref.
  const allowLeavingRef = useRef<() => void>(() => undefined);
  const allowLeaving = usePreventRemove(isDirty, ({ repeat }) => {
    Alert.alert(t('wallets.personalize.discardTitle'), t('wallets.personalize.discardBody'), [
      { text: t('wallets.personalize.keepEditing'), style: 'cancel' },
      {
        text: t('wallets.personalize.discard'),
        style: 'destructive',
        onPress: () => {
          allowLeavingRef.current();
          repeat();
        },
      },
    ]);
  });
  useEffect(() => {
    allowLeavingRef.current = allowLeaving;
  }, [allowLeaving]);

  const save = () => {
    allowLeaving();
    onSave({ name: trimmed, color, icon });
  };

  return (
    <StickyFormScreen
      scrollTestID={PERSONALIZE_SCROLL_ID}
      top={
        <CardPreview
          name={trimmed === '' ? defaultName : trimmed}
          detail={props.detail}
          color={color}
          icon={icon}
        />
      }
      bottom={
        <Button
          label={t('wallets.personalize.save')}
          onPress={save}
          isDisabled={!isNameValid || !(isDirty || isSetupStep)}
        />
      }
    >
      <Input
        label={props.nameLabel}
        placeholder={defaultName}
        value={name}
        onChangeText={setName}
        maxLength={MAX_NAME_LENGTH}
        returnKeyType="done"
        status={isNameValid ? 'default' : 'error'}
        message={t(
          isNameValid ? 'wallets.personalize.nameHint' : 'wallets.personalize.nameInvalid',
        )}
      />
      <ColorSwatches label={t('wallets.personalize.color')} value={color} onChange={setColor} />
      {props.picksIcon ? <IconSection value={icon} onChange={setIcon} /> : null}
      {props.children}
    </StickyFormScreen>
  );
}
