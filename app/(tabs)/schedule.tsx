import { useMemo, useState, useRef, useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { startOfWeek, endOfWeek, addWeeks, addDays, format, isSameDay, getISODay } from 'date-fns';
import { uk } from 'date-fns/locale';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAllClubs } from '@/hooks/useClubs';
import { useChildren } from '@/hooks/useChildren';

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const TIME_LABELS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

const HOUR_HEIGHT = 60;
const HEADER_HEIGHT = 60;
const START_HOUR = 8;
const GRID_HEIGHT = (21 - START_HOUR) * HOUR_HEIGHT;

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
  const horizontalScrollRef = useRef<ScrollView>(null);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const { data: allClubs = [], isLoading: isClubsLoading } = useAllClubs();
  const { data: children = [], isLoading: isChildrenLoading } = useChildren();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });


  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
  const weekButtonBg = useThemeColor({ light: '#F2F2F7', dark: '#2C2C2E' }, 'background');
  const todayColumnBg = useThemeColor({ light: '#FFF7E6', dark: '#2C2410' }, 'background');
  const dayHeaderBg = useThemeColor({ light: '#F3F4F6', dark: '#2C2C2E' }, 'background');
  const todayHeaderBg = useThemeColor({ light: '#FEF3C7', dark: '#3D331A' }, 'background');
  const emptyDayBg = useThemeColor({ light: '#F8FAFC', dark: '#1C1C1E' }, 'background');
  const legendChipBg = useThemeColor({ light: '#F8FAFC', dark: '#2C2C2E' }, 'background');
  const mutedTextColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const blockTimeColor = useThemeColor({ light: '#374151', dark: '#D1D5DB' }, 'text');
  const blockChildColor = useThemeColor({ light: '#4B5563', dark: '#9CA3AF' }, 'text');

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

  const getTimeMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const getBlockStyle = (startTime: string, endTime: string) => {
    const startMins = getTimeMinutes(startTime);
    const endMins = getTimeMinutes(endTime);
    const startOffset = startMins - (START_HOUR * 60);
    
    const top = (startOffset / 60) * HOUR_HEIGHT;
    const duration = (endMins - startMins) / 60;
    const height = Math.max(duration * HOUR_HEIGHT, 40); // min height for readability

    return {
      top,
      height: height - 4, // margin between blocks
    };
  };

  const goToToday = () => {
    const now = new Date();
    setWeekStart(startOfWeek(now, { weekStartsOn: 1 }));
    
    // Use a small timeout to ensure state update/render happens if week changed
    setTimeout(() => {
      const dayIndex = getISODay(now) - 1;
      horizontalScrollRef.current?.scrollTo({ x: dayIndex * 140, animated: true });
    }, 50);
  };

  // Initial scroll to today
  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        const dayIndex = getISODay(new Date()) - 1;
        horizontalScrollRef.current?.scrollTo({ x: dayIndex * 140, animated: false });
      }, 100);
    }
  }, [isLoading]);

  const renderGridView = () => (
    <ScrollView style={styles.verticalScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.gridContainer}>
        <View style={styles.timeAxis}>
          <View style={styles.timeAxisHeader}>
            <ThemedText style={styles.axisHeaderText}>Час</ThemedText>
          </View>
          <View style={styles.timeAxisContent}>
            {TIME_LABELS.map(label => (
              <View
                key={label}
                style={styles.timeAxisRow}
              >
                <ThemedText style={[styles.timeLabel, { color: mutedTextColor }]}>{label}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <ScrollView
          ref={horizontalScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.columnsRow}>
            {DAY_LABELS.map((label, index) => {
              const isoDay = index + 1;
              const items = scheduleItemsByDay.get(isoDay) ?? [];
              const date = addDays(weekStart, index);
              const isToday = isSameDay(date, new Date());

              return (
                <View
                  key={label}
                  style={[styles.column, isToday && { backgroundColor: todayColumnBg, borderRadius: 12 }]}
                >
                  <View style={[
                    styles.dayHeader,
                    { backgroundColor: dayHeaderBg },
                    isToday && { backgroundColor: todayHeaderBg }
                  ]}>
                    <ThemedText style={styles.dayName}>{label}</ThemedText>
                    <ThemedText style={styles.dayDate}>{format(date, 'd', { locale: uk })}</ThemedText>
                  </View>

                  <View style={styles.columnContent}>
                    {/* Grid Lines */}
                    {TIME_LABELS.map(t => (
                      <View 
                        key={t} 
                        style={[
                          styles.gridLine, 
                          { 
                            top: ((getTimeMinutes(t) - START_HOUR * 60) / 60) * HOUR_HEIGHT,
                            borderTopColor: dayHeaderBg 
                          }
                        ]} 
                      />
                    ))}

                    {items.map(item => {
                      const blockStyle = getBlockStyle(item.startTime, item.endTime);
                      return (
                        <Pressable
                          key={`${item.clubId}-${item.startTime}-${item.endTime}`}
                          style={({ pressed }) => [
                            styles.scheduleBlock,
                            {
                              backgroundColor: hexToRgba(item.colorHex, 0.9),
                              opacity: pressed ? 0.9 : 1,
                              top: blockStyle.top,
                              height: blockStyle.height,
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
                          <View>
                            <ThemedText style={[styles.blockTime, { color: blockTimeColor }]}>
                              {item.startTime} - {item.endTime}
                            </ThemedText>
                            <ThemedText
                              style={[styles.blockChild, { color: blockChildColor }]}
                              numberOfLines={1}
                            >
                              {childMap.get(item.childId) ?? 'Дитина'}
                            </ThemedText>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );

  const renderListView = () => (
    <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
      {DAY_LABELS.map((label, index) => {
        const isoDay = index + 1;
        const items = scheduleItemsByDay.get(isoDay) ?? [];
        const date = addDays(weekStart, index);
        const isToday = isSameDay(date, new Date());

        if (items.length === 0) return null;

        return (
          <View key={label} style={styles.listSection}>
            <View style={styles.listDayHeaderRow}>
              <ThemedText style={[styles.listDayName, isToday && { color: tintColor }]}>
                {label}
              </ThemedText>
              <ThemedText style={styles.listDayDate}>
                {format(date, 'd MMMM', { locale: uk })}
              </ThemedText>
            </View>
            {items.map(item => (
              <Pressable
                key={`${item.clubId}-${item.startTime}-${item.endTime}`}
                style={({ pressed }) => [
                  styles.listItem,
                  { 
                    backgroundColor: hexToRgba(item.colorHex, 0.12),
                    borderLeftColor: item.colorHex,
                    opacity: pressed ? 0.7 : 1
                  }
                ]}
                onPress={() => router.push({ pathname: '/club/[id]', params: { id: item.clubId.toString() } })}
              >
                <View style={styles.listItemTimeCol}>
                  <ThemedText style={styles.listItemStartTime}>{item.startTime}</ThemedText>
                  <ThemedText style={[styles.listItemEndTime, { color: mutedTextColor }]}>{item.endTime}</ThemedText>
                </View>
                <View style={styles.listItemContent}>
                  <View style={styles.listItemTitleRow}>
                    <ThemedText style={styles.listItemEmoji}>{item.clubEmoji}</ThemedText>
                    <ThemedText style={styles.listItemTitle} numberOfLines={1}>{item.clubName}</ThemedText>
                  </View>
                  <ThemedText style={[styles.listItemChild, { color: blockChildColor }]} numberOfLines={1}>
                    {childMap.get(item.childId) ?? 'Дитина'}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={mutedTextColor} />
              </Pressable>
            ))}
          </View>
        );
      })}
      {Array.from(scheduleItemsByDay.values()).every(arr => arr.length === 0) && (
        <View style={styles.emptyWeek}>
          <Ionicons name="calendar-outline" size={48} color={mutedTextColor} />
          <ThemedText style={{ color: mutedTextColor, marginTop: 12, textAlign: 'center' }}>
            На цьому тижні немає занять
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );

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
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={styles.headerRow}>
        <View style={styles.navGroup}>
          <Pressable
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: weekButtonBg },
              pressed && styles.weekButtonPressed
            ]}
            onPress={() => setWeekStart(prev => addWeeks(prev, -1))}
          >
            <Ionicons name="chevron-back" size={20} color={blockTimeColor} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.todayButton,
              { backgroundColor: weekButtonBg },
              pressed && styles.weekButtonPressed
            ]}
            onPress={goToToday}
          >
            <ThemedText style={styles.todayButtonText}>Сьогодні</ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: weekButtonBg },
              pressed && styles.weekButtonPressed
            ]}
            onPress={() => setWeekStart(prev => addWeeks(prev, 1))}
          >
            <Ionicons name="chevron-forward" size={20} color={blockTimeColor} />
          </Pressable>
        </View>

        <View style={styles.weekLabelContainer}>
          <ThemedText style={styles.weekLabel}>{weekLabel}</ThemedText>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            style={({ pressed }) => [
              styles.viewToggleButton,
              { backgroundColor: weekButtonBg },
              pressed && styles.weekButtonPressed
            ]}
            onPress={() => setViewType(prev => prev === 'grid' ? 'list' : 'grid')}
          >
            <Ionicons 
              name={viewType === 'grid' ? 'list-outline' : 'grid-outline'} 
              size={22} 
              color={tintColor} 
            />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              { opacity: pressed ? 0.7 : 1 }
            ]}
            onPress={() => {
              if (children.length >= 1) {
                router.push('/club/new');
              } else {
                router.push('/child/new');
              }
            }}
          >
            <Ionicons
              name="add-circle"
              size={32}
              color={tintColor}
            />
          </Pressable>
        </View>
      </View>

      {viewType === 'grid' ? renderGridView() : renderListView()}

      <View style={styles.legendContainer}>
        <ThemedText style={styles.legendTitle}>Діти в розкладі</ThemedText>
        <View style={styles.legendChipsRow}>
          {childLegend.map(entry => (
            <View
              key={entry.id}
              style={[styles.legendChip, { backgroundColor: legendChipBg }]}
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
    marginBottom: 16,
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  weekButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  weekLabelContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewToggleButton: {
    padding: 8,
    borderRadius: 8,
    marginRight: 4,
  },
  addButton: {
    padding: 4,
  },
  listContainer: {
    flex: 1,
  },
  listSection: {
    marginBottom: 24,
  },
  listDayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  listDayName: {
    fontSize: 20,
    fontWeight: '800',
    marginRight: 10,
  },
  listDayDate: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.6,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    marginBottom: 10,
  },
  listItemTimeCol: {
    width: 60,
    marginRight: 12,
  },
  listItemStartTime: {
    fontSize: 15,
    fontWeight: '700',
  },
  listItemEndTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  listItemEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  listItemChild: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyWeek: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  gridContainer: {
    flexDirection: 'row',
  },
  verticalScroll: {
    flex: 1,
  },
  timeAxis: {
    width: 64,
  },
  timeAxisHeader: {
    height: HEADER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeAxisContent: {
    height: GRID_HEIGHT,
  },
  axisHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeAxisRow: {
    height: HOUR_HEIGHT * 2,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  timeLabel: {
    fontSize: 12,
    marginTop: -8, // Center text on the grid line
  },
  columnsRow: {
    flexDirection: 'row',
  },
  column: {
    width: 140,
    paddingRight: 8,
  },
  columnContent: {
    height: GRID_HEIGHT,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    height: 1,
  },
  todayColumn: {
    borderRadius: 12,
  },
  dayHeader: {
    height: HEADER_HEIGHT,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayHeader: {
  },
  dayName: {
    fontSize: 12,
    fontWeight: '700',
  },
  dayDate: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyDay: {
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  emptyDayText: {
    fontSize: 12,
    textAlign: 'center',
  },
  scheduleBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 8,
    padding: 8,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  blockEmoji: {
    marginRight: 4,
    fontSize: 14,
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  blockTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  blockChild: {
    fontSize: 10,
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
