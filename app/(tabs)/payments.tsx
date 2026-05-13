import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { Swipeable } from 'react-native-gesture-handler';
import { ActivityIndicator, SafeAreaView, SectionList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAllClubs, useMarkAsPaid } from '@/hooks/useClubs';
import { useChildren } from '@/hooks/useChildren';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';

const STATUS_COLORS = {
  overdue: '#dc2626',
  week: '#f59e0b',
  future: '#16a34a',
  none: '#9ca3af',
};

function formatDate(value?: Date | null) {
  if (!value) {
    return 'Немає';
  }

  return value.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function PaymentsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { data: clubs = [], isLoading: isClubsLoading } = useAllClubs();
  const { data: children = [] } = useChildren();
  const markAsPaidMutation = useMarkAsPaid();
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  const childMap = useMemo(() => new Map(children.map(child => [child.id, child.name])), [children]);

  const now = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);

  const paymentItems = useMemo(() => {
    const items = clubs
      .map(club => {
        const nextPaymentDate = club.next_payment_date ? new Date(club.next_payment_date) : null;

        const diffDays = nextPaymentDate
          ? Math.ceil((nextPaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const status = nextPaymentDate ? (diffDays! < 0 ? 'overdue' : diffDays! <= 7 ? 'week' : 'future') : 'none';

        return {
          ...club,
          childName: childMap.get(club.child_id) ?? 'Дитина',
          nextPaymentDate,
          diffDays,
          status,
        };
      })
      .sort((a, b) => {
        if (!a.nextPaymentDate && !b.nextPaymentDate) {
          return 0;
        }
        if (!a.nextPaymentDate) {
          return 1;
        }
        if (!b.nextPaymentDate) {
          return -1;
        }
        return a.nextPaymentDate.getTime() - b.nextPaymentDate.getTime();
      });

    return items;
  }, [clubs, childMap, now]);

  const overdueItems = useMemo(() => paymentItems.filter(item => item.status === 'overdue'), [paymentItems]);

  const weekItems = useMemo(() => paymentItems.filter(item => item.status === 'week'), [paymentItems]);

  const futureItems = useMemo(
    () => paymentItems.filter(item => item.status === 'future' || item.status === 'none'),
    [paymentItems],
  );

  const sections = useMemo(
    () =>
      [
        { title: 'Прострочено', data: overdueItems },
        { title: 'Цього тижня', data: weekItems },
        { title: 'Наступного місяця', data: futureItems },
      ].filter(section => section.data.length > 0),
    [overdueItems, weekItems, futureItems],
  );

  const totalMonthlyCost = paymentItems.reduce((sum, item) => sum + item.price, 0);
  const nearestUpcoming = paymentItems.find(item => item.nextPaymentDate !== null);

  const handleCopy = async (value: string | undefined, label: string) => {
    if (!value) {
      return;
    }

    await Clipboard.setStringAsync(value);
    setCopiedMessage(`${label === 'iban' ? 'IBAN' : 'Картка'} скопійовано`);
    setTimeout(() => setCopiedMessage(null), 1400);
  };

  const handleMarkAsPaid = (clubId: number) => {
    markAsPaidMutation.mutate({ clubId });
  };

  const renderRightActions = (item: (typeof paymentItems)[number]) => (
    <Pressable
      style={styles.payAction}
      onPress={() => handleMarkAsPaid(item.id)}
    >
      <Ionicons
        name='checkmark'
        size={22}
        color='#fff'
      />
      <Text style={styles.payActionText}>Оплачено</Text>
    </Pressable>
  );

  const renderPaymentItem = ({ item }: { item: (typeof paymentItems)[number] }) => {
    const statusColor = STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.none;

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
      >
        <View style={[styles.itemCard, { backgroundColor: colors.background }]}>
          <View style={styles.itemRow}>
            <View style={styles.statusColumn}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            </View>
            <View style={styles.itemContent}>
              <View style={styles.itemHeader}>
                <ThemedText style={styles.emoji}>{item.emoji}</ThemedText>
                <View style={styles.metaTextContainer}>
                  <ThemedText style={styles.clubName}>{item.name}</ThemedText>
                  <ThemedText style={styles.childName}>{item.childName}</ThemedText>
                </View>
              </View>

              <View style={styles.paymentRow}>
                <View>
                  <ThemedText style={styles.paymentLabel}>Дата</ThemedText>
                  <ThemedText style={styles.paymentValue}>{formatDate(item.nextPaymentDate)}</ThemedText>
                </View>
                <View style={styles.amountContainer}>
                  <ThemedText style={styles.paymentLabel}>Сума</ThemedText>
                  <ThemedText style={styles.paymentValue}>{item.price} ₴</ThemedText>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.copyButton,
                    !item.payment_iban && styles.copyButtonDisabled,
                    pressed && styles.copyButtonPressed,
                  ]}
                  onPress={() => handleCopy(item.payment_iban, 'iban')}
                  disabled={!item.payment_iban}
                >
                  <ThemedText style={styles.copyButtonText}>IBAN</ThemedText>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.copyButton,
                    !item.payment_card && styles.copyButtonDisabled,
                    pressed && styles.copyButtonPressed,
                  ]}
                  onPress={() => handleCopy(item.payment_card, 'card')}
                  disabled={!item.payment_card}
                >
                  <ThemedText style={styles.copyButtonText}>Картка</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Swipeable>
    );
  };

  if (isClubsLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size='large'
            color={colors.tint}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#0a7ea4', '#06627b']}
        style={styles.summaryCard}
      >
        <View style={styles.summaryRow}>
          <View>
            <ThemedText style={styles.summaryTitle}>Загальна сума</ThemedText>
            <ThemedText style={styles.summaryAmount}>{totalMonthlyCost} ₴</ThemedText>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.statChip}>
              <ThemedText style={styles.statText}>{clubs.length} гуртків</ThemedText>
            </View>
            <View style={styles.statChip}>
              <ThemedText style={styles.statText}>{children.length} дітей</ThemedText>
            </View>
          </View>
        </View>
        <View style={styles.upcomingRow}>
          <View>
            <ThemedText style={styles.upcomingLabel}>Найближча оплата</ThemedText>
            <ThemedText style={styles.upcomingDate}>{formatDate(nearestUpcoming?.nextPaymentDate ?? null)}</ThemedText>
          </View>
          <ThemedText style={styles.upcomingAmount}>{nearestUpcoming ? `${nearestUpcoming.price} ₴` : '—'}</ThemedText>
        </View>
      </LinearGradient>

      {copiedMessage ? (
        <View style={[styles.copyToast, { backgroundColor: colors.tint }]}>
          <ThemedText style={styles.copyToastText}>{copiedMessage}</ThemedText>
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionHeaderText}>{title}</ThemedText>
          </View>
        )}
        renderItem={renderPaymentItem}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>Платежів не знайдено.</ThemedText>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryTitle: {
    color: '#e2f5ff',
    fontSize: 16,
    marginBottom: 8,
  },
  summaryAmount: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '700',
  },
  summaryStats: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statChip: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statText: {
    color: '#fff',
    fontSize: 14,
  },
  upcomingRow: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  upcomingLabel: {
    color: '#d6f4ff',
    fontSize: 14,
    marginBottom: 4,
  },
  upcomingDate: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  upcomingAmount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  copyToast: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 12,
  },
  copyToastText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '700',
  },
  itemCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(10,126,164,0.08)',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusColumn: {
    width: 12,
    marginRight: 12,
    justifyContent: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  emoji: {
    fontSize: 28,
    marginRight: 12,
  },
  metaTextContainer: {
    flex: 1,
  },
  clubName: {
    fontSize: 16,
    fontWeight: '700',
  },
  childName: {
    fontSize: 14,
    color: '#6b7280',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 14,
  },
  paymentLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  copyButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(10,126,164,0.16)',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  copyButtonDisabled: {
    opacity: 0.4,
  },
  copyButtonPressed: {
    opacity: 0.65,
  },
  copyButtonText: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  payAction: {
    width: 130,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    marginVertical: 6,
  },
  payActionText: {
    color: '#fff',
    marginTop: 8,
    fontWeight: '700',
  },
  emptyState: {
    marginTop: 48,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
  },
});
