import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { startOfWeek, endOfWeek, addWeeks, addDays, format, getISODay } from 'date-fns';
import { uk } from 'date-fns/locale';
import { ThemedText } from '@/components/themed-text';
import { useAllClubs } from '@/hooks/useClubs';
import { useChildren } from '@/hooks/useChildren';

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const TIME_LABELS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];

function hexToRgba(hex: string, alpha = 0.9) {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map(c => c + c)
          .join('')
      : normalized;

  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { data: allClubs = [], isLoading: isClubsLoading } = useAllClubs();
  const { data: children = [], isLoading: isChildrenLoading } = useChildren();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const todayIsoDay = getISODay(new Date());

  const weekLabel = useMemo(() => {
    const startDay = format(weekStart, 'd', { locale: uk });
    const endDay = format(weekEnd, 'd', { locale: uk });
    const monthName = capitalize(format(weekEnd, 'LLLL', { locale: uk }));
    return `${startDay}–${endDay} ${monthName}`;
  }, [weekEnd, weekStart]);

  const childMap = useMemo(() => new Map(children.map(child => [child.id, child.name])), [children]);

  const scheduleItemsByDay = useMemo(() => {
    const buckets = new Map<
      number,
      {
        clubId: number;
        clubName: string;
        clubEmoji: string;
        colorHex: string;
        childId: number;
        startTime: string;
        endTime: string;
      }[]
    >();

    for (let day = 1; day <= 7; day += 1) {
      buckets.set(day, []);
    }

    for (const club of allClubs) {
      for (const schedule of club.schedules) {
        buckets.get(schedule.day_of_week)?.push({
          clubId: club.id,
          clubName: club.name,
          clubEmoji: club.emoji,
          colorHex: club.color_hex,
          childId: club.child_id,
          startTime: schedule.start_time,
          endTime: schedule.end_time,
        });
      }
    }

    for (const [, items] of buckets) {
      items.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    return buckets;
  }, [allClubs]);

  const childLegend = useMemo(() => {
    const entries = new Map<number, { id: number; name: string; color: string }>();

    for (const club of allClubs) {
      if (!entries.has(club.child_id)) {
        entries.set(club.child_id, {
          id: club.child_id,
          name: childMap.get(club.child_id) ?? 'Дитина',
          color: club.color_hex,
        });
      }
    }

    return Array.from(entries.values());
  }, [allClubs, childMap]);

  const isLoading = isClubsLoading || isChildrenLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable
          style={({ pressed }) => [styles.weekButton, pressed && styles.weekButtonPressed]}
          onPress={() => setWeekStart(prev => addWeeks(prev, -1))}
        >
          <ThemedText style={styles.weekButtonText}>‹ Попередній</ThemedText>
        </Pressable>

        <View style={styles.weekLabelContainer}>
          <ThemedText style={styles.weekLabel}>{weekLabel}</ThemedText>
        </View>

        <Pressable
          style={({ pressed }) => [styles.weekButton, pressed && styles.weekButtonPressed]}
          onPress={() => setWeekStart(prev => addWeeks(prev, 1))}
        >
          <ThemedText style={styles.weekButtonText}>Наступний ›</ThemedText>
        </Pressable>
      </View>

      <View style={styles.gridContainer}>
        <View style={styles.timeAxis}>
          <View style={styles.timeAxisHeader}>
            <ThemedText style={styles.axisHeaderText}>Час</ThemedText>
          </View>
          {TIME_LABELS.map(label => (
            <View
              key={label}
              style={styles.timeAxisRow}
            >
              <ThemedText style={styles.timeLabel}>{label}</ThemedText>
            </View>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.columnsRow}>
            {DAY_LABELS.map((label, index) => {
              const isoDay = index + 1;
              const items = scheduleItemsByDay.get(isoDay) ?? [];
              const date = addDays(weekStart, index);
              const isToday = isoDay === todayIsoDay;

              return (
                <View
                  key={label}
                  style={[styles.column, isToday && styles.todayColumn]}
                >
                  <View style={[styles.dayHeader, isToday && styles.todayHeader]}>
                    <ThemedText style={styles.dayName}>{label}</ThemedText>
                    <ThemedText style={styles.dayDate}>{format(date, 'd', { locale: uk })}</ThemedText>
                  </View>

                  {items.length === 0 ? (
                    <View style={styles.emptyDay}>
                      <ThemedText style={styles.emptyDayText}>Немає занять</ThemedText>
                    </View>
                  ) : (
                    items.map(item => (
                      <Pressable
                        key={`${item.clubId}-${item.startTime}-${item.endTime}`}
                        style={({ pressed }) => [
                          styles.scheduleBlock,
                          {
                            backgroundColor: hexToRgba(item.colorHex, 0.9),
                            opacity: pressed ? 0.9 : 1,
                          },
                        ]}
                        onPress={() => router.push({ pathname: '/club/[id]', params: { id: item.clubId.toString() } })}
                      >
                        <View style={styles.blockTitleRow}>
                          <ThemedText style={styles.blockEmoji}>{item.clubEmoji}</ThemedText>
                          <ThemedText
                            style={styles.blockTitle}
                            numberOfLines={1}
                          >
                            {item.clubName}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.blockTime}>
                          {item.startTime} - {item.endTime}
                        </ThemedText>
                        <ThemedText
                          style={styles.blockChild}
                          numberOfLines={1}
                        >
                          {childMap.get(item.childId) ?? 'Дитина'}
                        </ThemedText>
                      </Pressable>
                    ))
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={styles.legendContainer}>
        <ThemedText style={styles.legendTitle}>Діти в розкладі</ThemedText>
        <View style={styles.legendChipsRow}>
          {childLegend.map(entry => (
            <View
              key={entry.id}
              style={styles.legendChip}
            >
              <View style={[styles.legendDot, { backgroundColor: hexToRgba(entry.color, 1) }]} />
              <ThemedText style={styles.legendText}>{entry.name}</ThemedText>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weekButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
  },
  weekButtonPressed: {
    opacity: 0.8,
  },
  weekButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  weekLabelContainer: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  timeAxis: {
    width: 64,
    marginRight: 8,
  },
  timeAxisHeader: {
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  axisHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeAxisRow: {
    height: 70,
    justifyContent: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    paddingRight: 6,
  },
  columnsRow: {
    flexDirection: 'row',
  },
  column: {
    minWidth: 128,
    paddingRight: 8,
  },
  todayColumn: {
    backgroundColor: '#FFF7E6',
    borderRadius: 12,
  },
  dayHeader: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  todayHeader: {
    backgroundColor: '#FEF3C7',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyDay: {
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  emptyDayText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  scheduleBlock: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    minHeight: 72,
    justifyContent: 'space-between',
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  blockEmoji: {
    marginRight: 6,
    fontSize: 16,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  blockTime: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  blockChild: {
    fontSize: 11,
    color: '#4B5563',
  },
  legendContainer: {
    marginTop: 16,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  legendChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
    marginBottom: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
