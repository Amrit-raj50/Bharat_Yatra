import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, ELEVATION, RADII, SPACING, TOUCH_MIN } from '@/theme/theme';

export interface EmptyStateAction {
  label: string;
  onPress: () => void;
  primary?: boolean;
}

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  body: string;
  actions?: EmptyStateAction[];
}

export function EmptyState({
  icon = 'train-variant',
  title,
  body,
  actions = [],
}: EmptyStateProps): React.ReactElement {
  return (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name={icon} size={32} color={COLORS.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((act) => (
            <Pressable
              key={act.label}
              onPress={act.onPress}
              style={[styles.btn, act.primary ? styles.btnPrimary : styles.btnSecondary]}
              accessibilityRole="button"
              accessibilityLabel={act.label}
            >
              <Text style={[styles.btnText, act.primary ? styles.btnTextPrimary : styles.btnTextSecondary]}>
                {act.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.divider,
    borderWidth: 1,
    borderRadius: RADII.card,
    padding: SPACING.xl,
    alignItems: 'center',
    ...ELEVATION.subtle,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  body: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  btn: {
    minHeight: TOUCH_MIN,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  btnSecondary: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: '#C5D8FA',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  btnTextPrimary: {
    color: COLORS.white,
  },
  btnTextSecondary: {
    color: COLORS.primary,
  },
});
