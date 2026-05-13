import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useClub, useDeleteClub, useMarkAsPaid } from '@/hooks/useClubs';
import { ThemedText } from '@/components/themed-text';
import { getPlural } from '@/lib/i18n';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

function formatDuration(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const start = new Date();
  const end = new Date();
  start.setHours(startHour, startMinute, 0, 0);
  end.setHours(endHour, endMinute, 0, 0);
  const diff = (end.getTime() - start.getTime()) / 1000 / 60;

  if (diff <= 0) {
    return '—';
  }

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (hours > 0) {
    return `${hours} год ${minutes} хв`;
  }

  return `${minutes} хв`;
}

function formatPaymentDate(value?: string) {
  if (!value) {
    return 'Немає';
  }

  const date = new Date(value);
  return date.toLocaleDateString('uk-UA');
}

export default function ClubDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const clubId = Number(id ?? '0');
  const { data: club, isLoading } = useClub(clubId);
  const deleteClubMutation = useDeleteClub();
  const markAsPaidMutation = useMarkAsPaid();

  const copyScale = useRef(new Animated.Value(0)).current;
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  const handleDeleteClub = useCallback(() => {
    if (!club) {
      return;
    }

    Alert.alert('Видалити гурток?', 'Цю дію неможливо скасувати.', [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: () => {
          deleteClubMutation.mutate(club.id, {
            onSuccess: () => router.back(),
          });
        },
      },
    ]);
  }, [club, deleteClubMutation, router]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: club?.name ?? 'Гурток',
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerActionButton}
            onPress={() => club && router.push({ pathname: '/club/[id]/edit', params: { id: club.id.toString() } })}
          >
            <Ionicons
              name='pencil'
              size={22}
              color={colors.tint}
            />
          </Pressable>
          <Pressable
            style={styles.headerActionButton}
            onPress={handleDeleteClub}
          >
            <Ionicons
              name='trash'
              size={22}
              color='#ef4444'
            />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, club, router, colors.tint, handleDeleteClub]);

  useEffect(() => {
    if (!copiedMessage) {
      return;
    }

    Animated.spring(copyScale, {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 150,
      damping: 12,
    }).start();

    const timeout = setTimeout(() => {
      Animated.spring(copyScale, {
        toValue: 0,
        useNativeDriver: true,
        stiffness: 150,
        damping: 12,
      }).start(() => setCopiedMessage(null));
    }, 1200);

    return () => clearTimeout(timeout);
  }, [copiedMessage, copyScale]);

  const handleCopy = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    setCopiedMessage(label);
    copyScale.setValue(0);
  };

  const paymentStatus = useMemo(() => {
    if (!club?.next_payment_date) {
      return { label: 'Немає дати', color: '#9ca3af' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDate = new Date(club.next_payment_date);
    nextDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'Прострочено', color: '#dc2626' };
    }

    if (diffDays <= 7) {
      return { label: `Наступні ${diffDays} ${getPlural(diffDays, 'день', 'дні', 'днів')}`, color: '#f59e0b' };
    }

    return { label: 'Вчасно', color: '#16a34a' };
  }, [club?.next_payment_date]);

  const copyFeedback = useMemo(
    () => copiedMessage && `${copiedMessage === 'iban' ? 'IBAN' : 'Картка'} скопійовано!`,
    [copiedMessage],
  );

  if (!id || clubId <= 0) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ThemedText style={styles.errorText}>Потрібен ID гуртка.</ThemedText>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ActivityIndicator
          size='large'
          color={colors.tint}
        />
      </View>
    );
  }

  if (!club) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ThemedText style={styles.errorText}>Гурток не знайдено.</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backIcon, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#eef2ff' }]}
          >
            <Ionicons
              name='chevron-back'
              size={24}
              color={colors.tint}
            />
          </Pressable>
          <View style={styles.clubInfo}>
            <ThemedText style={[styles.emoji, { color: club.color_hex || colors.tint }]}>{club.emoji}</ThemedText>
            <ThemedText style={styles.clubName}>{club.name}</ThemedText>
            {club.teacher_name ? <ThemedText style={styles.clubMeta}>Викладач: {club.teacher_name}</ThemedText> : null}
            {club.location ? <ThemedText style={styles.clubMeta}>Місце: {club.location}</ThemedText> : null}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#fff' }]}>
          <ThemedText
            type='subtitle'
            style={styles.cardTitle}
          >
            Розклад
          </ThemedText>
          {club.schedules.length > 0 ? (
            club.schedules.map(slot => (
              <View
                key={slot.id}
                style={styles.scheduleRow}
              >
                <View style={[styles.dayChip, { backgroundColor: colorScheme === 'dark' ? '#334155' : '#e0f2fe' }]}>
                  <ThemedText style={[styles.dayChipText, { color: colorScheme === 'dark' ? '#cbd5e1' : '#0369a1' }]}>{dayNames[slot.day_of_week - 1]}</ThemedText>
                </View>
                <View style={styles.scheduleInfo}>
                  <ThemedText style={styles.scheduleTime}>
                    {slot.start_time} – {slot.end_time}
                  </ThemedText>
                  <ThemedText style={styles.scheduleDuration}>
                    {formatDuration(slot.start_time, slot.end_time)}
                  </ThemedText>
                </View>
              </View>
            ))
          ) : (
            <ThemedText style={styles.emptyText}>Розклад ще не додано.</ThemedText>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#fff' }]}>
          <ThemedText
            type='subtitle'
            style={styles.cardTitle}
          >
            Платіж
          </ThemedText>

          <View style={styles.detailRow}>
            <ThemedText>Вартість</ThemedText>
            <ThemedText style={styles.detailValue}>{club.price} ₴</ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText>Наступна оплата</ThemedText>
            <View style={[styles.badge, { backgroundColor: paymentStatus.color }]}>
              <ThemedText style={styles.badgeText}>{formatPaymentDate(club.next_payment_date)}</ThemedText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colorScheme === 'dark' ? '#334155' : '#e2e8f0' }]} />

          <View style={styles.copySection}>
            <ThemedText style={styles.copyLabel}>IBAN</ThemedText>
            <View style={styles.copyRow}>
              <ThemedText style={styles.monoText}>{club.payment_iban || '–'}</ThemedText>
              <Pressable
                style={styles.copyButton}
                onPress={() => (club.payment_iban ? handleCopy(club.payment_iban, 'iban') : null)}
              >
                <ThemedText style={styles.copyButtonText}>Копіювати</ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.copySection}>
            <ThemedText style={styles.copyLabel}>Номер картки</ThemedText>
            <View style={styles.copyRow}>
              <ThemedText style={styles.monoText}>{club.payment_card || '–'}</ThemedText>
              <Pressable
                style={styles.copyButton}
                onPress={() => (club.payment_card ? handleCopy(club.payment_card, 'card') : null)}
              >
                <ThemedText style={styles.copyButtonText}>Копіювати</ThemedText>
              </Pressable>
            </View>
          </View>

          {copyFeedback ? (
            <Animated.View style={[styles.copyToast, { transform: [{ scale: copyScale }] }]}>
              <Ionicons
                name='checkmark-circle'
                size={16}
                color='#fff'
              />
              <ThemedText style={styles.copyToastText}>{copyFeedback}</ThemedText>
            </Animated.View>
          ) : null}
        </View>

        <Pressable
          style={[styles.payButton, markAsPaidMutation.isPending && styles.disabledButton]}
          disabled={markAsPaidMutation.isPending}
          onPress={() => markAsPaidMutation.mutate({ clubId: club.id })}
        >
          <ThemedText style={styles.payButtonText}>Позначити як оплачено</ThemedText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  headerActions: {
    flexDirection: 'row',
    marginRight: 8,
  },
  headerActionButton: {
    padding: 8,
    marginRight: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  backIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  clubInfo: {
    flex: 1,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  clubName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  clubMeta: {
    fontSize: 15,
    opacity: 0.7,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 4,
  },
  cardTitle: {
    marginBottom: 14,
    fontSize: 18,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayChip: {
    minWidth: 56,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 12,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTime: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  scheduleDuration: {
    fontSize: 13,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 15,
    opacity: 0.6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailValue: {
    fontWeight: '700',
  },
  badge: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  copySection: {
    marginBottom: 14,
  },
  copyLabel: {
    marginBottom: 8,
    fontSize: 14,
    opacity: 0.6,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monoText: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
  copyButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  copyButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  copyToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a7ea4',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  copyToastText: {
    color: '#fff',
    fontWeight: '700',
  },
  payButton: {
    backgroundColor: '#16a34a',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  payButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorText: {
    fontSize: 17,
    color: '#dc2626',
    textAlign: 'center',
    marginTop: 30,
  },
});
