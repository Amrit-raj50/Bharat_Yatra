import React, { useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { Station } from '@/domain/types';
import { useAppStore } from '@/state/useAppStore';

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
  const [query, setQuery] = useState('');
  const [stations, setStations] = useState<Station[]>(() => searchStations(''));
  const [loading, setLoading] = useState(false);

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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={handleClose} style={styles.closeButton} accessibilityRole="button">
            <Text style={styles.closeText}>{t('common.close')}</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={t('home.searchPlaceholder')}
          placeholderTextColor="#64748B"
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
        />

        <FlatList
          data={stations}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            loading ? (
              <ActivityIndicator size="small" color="#1D4ED8" style={{ marginBottom: 8 }} />
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
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    minHeight: 44,
    minWidth: 64,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  closeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 48,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 56,
    marginBottom: 8,
  },
  codePill: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 58,
    alignItems: 'center',
    marginRight: 12,
  },
  codeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
  },
  stationMeta: {
    flex: 1,
  },
  stationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  stationCity: {
    fontSize: 13,
    color: '#475569',
  },
  empty: {
    textAlign: 'center',
    color: '#475569',
    marginTop: 24,
    fontSize: 14,
  },
});
