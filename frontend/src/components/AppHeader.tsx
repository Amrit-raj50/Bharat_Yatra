import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, SPACING, TOUCH_MIN } from '@/theme/theme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  rightSlot?: React.ReactNode;
  showBrandMark?: boolean;
  extraBottomPadding?: number;
}

export function AppHeader({
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  rightSlot,
  showBrandMark = false,
  extraBottomPadding = 0,
}: AppHeaderProps): React.ReactElement {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, SPACING.md) + SPACING.xs,
          paddingBottom: SPACING.md + extraBottomPadding,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel={backLabel}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
            </Pressable>
          ) : showBrandMark ? (
            <Image
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              source={require('../../assets/icon.png')}
              style={styles.brandLogo}
            />
          ) : null}
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBtn: {
    minWidth: TOUCH_MIN,
    minHeight: TOUCH_MIN,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -SPACING.sm,
    borderRadius: RADII.pill,
  },
  brandLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 12,
    color: '#D6E4FF',
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
});
