import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { Station } from '@/domain/types';
import { useAppStore } from '@/state/useAppStore';
import { COLORS, RADII, SPACING, TOUCH_MIN } from '@/theme/theme';

interface Props {
  visible: boolean;
  title: string;
  onSelect: (station: Station) => void;
  onClose: () => void;
}

export function StationPickerModal({
  visible,
  title,
  onSelect,
  onClose,
}: Props): React.ReactElement {
  const { t } = useTranslation();
  const searchStations = useAppStore((s) => s.searchStations);
  const searchStationsAsync = useAppStore((s) => s.searchStationsAsync);
  const recentSearches = useAppStore((s) => s.recentSearches);
  const [query, setQuery] = useState('');
  const [stations, setStations] = useState<Station[]>(() => searchStations(''));
  const [loading, setLoading] = useState(false);

  const recentCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const r of recentSearches) {
      codes.add(r.fromCode);
      codes.add(r.toCode);
    }
    return [...codes].slice(0, 5);
  }, [recentSearches]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setStations(searchStations(query));
    setLoading(true);
    const timer = setTimeout(() => {
      void searchStationsAsync(query).then((res) => {
        if (!cancelled) {
          setStations(res);
          setLoading(false);
        }
      });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, visible, searchStations, searchStationsAsync]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const hasClusterStation = useMemo(
    () => stations.some((s) => Boolean(s.cityClusterId)),
    [stations]
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={handleClose}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={20} color={COLORS.muted} />
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder={t('home.searchPlaceholder')}
              placeholderTextColor={COLORS.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => setQuery('')}
                style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.muted} />
              </Pressable>
            ) : null}
          </View>

          {!query && recentCodes.length > 0 ? (
            <View style={styles.recentWrap}>
              <Text style={styles.sectionLabel}>{t('home.recentStationsHeader')}</Text>
              <View style={styles.recentChips}>
                {recentCodes.map((code) => (
                  <Pressable
                    key={code}
                    style={styles.recentChip}
                    onPress={() => setQuery(code)}
                    accessibilityRole="button"
                    accessibilityLabel={code}
                  >
                    <Text style={styles.recentChipText}>{code}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {hasClusterStation ? (
            <View style={styles.hintStrip}>
              <MaterialCommunityIcons name="information-outline" size={15} color={COLORS.primary} />
              <Text style={styles.hintText}>{t('home.nearbyClusterHint')}</Text>
            </View>
          ) : null}

          <FlatList
            data={stations}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              loading ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginBottom: 8 }} />
              ) : undefined
            }
            ListEmptyComponent={
              loading ? undefined : <Text style={styles.empty}>{t('home.noStationsMatch')}</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => {
                  setQuery('');
                  onSelect(item);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${item.code}`}
              >
                <View style={styles.codePill}>
                  <Text style={styles.codeText}>{item.code}</Text>
                </View>
                <View style={styles.stationMeta}>
                  <Text style={styles.stationName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.stationCity} numberOfLines={1}>
                    {item.city}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  backBtn: {
    minWidth: TOUCH_MIN,
    minHeight: TOUCH_MIN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  body: {
    flex: 1,
    padding: SPACING.lg,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.divider,
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    minHeight: TOUCH_MIN,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
  },
  clearBtn: {
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentWrap: {
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  recentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  recentChip: {
    minHeight: 36,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.divider,
    borderWidth: 1,
    borderRadius: RADII.pill,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  recentChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  hintStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    marginBottom: SPACING.sm,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primaryDark,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.divider,
    borderWidth: 1,
    borderRadius: RADII.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    minHeight: TOUCH_MIN + 8,
    gap: SPACING.md,
  },
  codePill: {
    backgroundColor: COLORS.badgeBg,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
    minWidth: 62,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  stationMeta: {
    flex: 1,
  },
  stationName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  stationCity: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    color: COLORS.muted,
    marginTop: 24,
    fontSize: 14,
  },
});
