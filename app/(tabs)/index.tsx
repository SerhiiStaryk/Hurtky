import { ChildCard } from '@/components/ChildCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useChildren } from '@/hooks/useChildren';
import { getPlural } from '@/lib/i18n';
import { getClubsByChildIds, getUpcomingLessonsForDays } from '@/lib/repositories';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { isClubOnVacation } from '@/lib/notifications';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface UpcomingLesson {
  id: string;
  childName: string;
  clubName: string;
  clubEmoji: string;
  startTime: string;
  endTime: string;
  dayLabel: string;
  colorHex: string;
  isVacation?: boolean;
  clubId: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { data: children = [], isLoading } = useChildren();
  const [childrenWithClubs, setChildrenWithClubs] = useState<Map<number, any>>(new Map());
  const [upcomingLessons, setUpcomingLessons] = useState<UpcomingLesson[]>([]);

  // Fetch clubs count for each child and upcoming lessons
  useEffect(() => {
    const loadChildrenData = async () => {
      try {
        const childIds = children.map(child => child.id);
        const clubsMap = await getClubsByChildIds(childIds);
        setChildrenWithClubs(clubsMap);

        const today = new Date();
        const todayDayOfWeek = today.getDay();
        const todayDay = todayDayOfWeek === 0 ? 7 : todayDayOfWeek;
        const tomorrowDay = todayDay === 7 ? 1 : todayDay + 1;

        const scheduleRows = await getUpcomingLessonsForDays([todayDay, tomorrowDay]);

        if (!scheduleRows || scheduleRows.length === 0) {
          setUpcomingLessons([]);
          return;
        }

        const lessonsData: UpcomingLesson[] = scheduleRows.slice(0, 3).map(schedule => {
          const onVacation = isClubOnVacation({
            is_vacation: schedule.is_vacation,
            vacation_end_date: schedule.vacation_end_date,
          });
          return {
            id: `${schedule.id}`,
            childName: schedule.child_name,
            clubName: schedule.club_name,
            clubEmoji: schedule.club_emoji,
            startTime: schedule.start_time,
            endTime: schedule.end_time,
            dayLabel: schedule.day_of_week === todayDay ? 'Сьогодні' : 'Завтра',
            colorHex: schedule.color_hex,
            isVacation: onVacation,
            clubId: `${schedule.club_id}`,
          };
        });

        setUpcomingLessons(lessonsData);
      } catch (err) {
        console.error('Error loading children data:', err);
      }
    };

    if (children.length > 0) {
      loadChildrenData();
    }
  }, [children]);

  const handleAddChild = () => {
    router.push('/child/new');
  };

  const renderHeader = () => (
    <View style={[styles.header]}>
      <View style={styles.headerTop}>
        <ThemedText style={styles.title}>
          Мої <ThemedText style={[styles.title, { color: colors.tint }]}>діти</ThemedText>
        </ThemedText>
        <View style={{ flexDirection: 'row' }}>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1, marginRight: 8 }]}
            onPress={() => {
              if (children.length >= 1) {
                router.push('/club/new');
              } else {
                Alert.alert('Спочатку додайте дитину');
              }
            }}
          >
            <Ionicons
              name='school-outline'
              size={20}
              color={colors.tint}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleAddChild}
          >
            <Ionicons
              name='person-add-outline'
              size={20}
              color={colors.tint}
            />
          </Pressable>
        </View>
      </View>
      {children.length > 0 && (
        <ThemedText style={styles.childCount}>
          {children.length} {getPlural(children.length, 'дитина', 'дитини', 'дітей')} · {upcomingLessons.length}{' '}
          {getPlural(upcomingLessons.length, 'заняття', 'заняття', 'занять')}
        </ThemedText>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name='person-add-outline'
        size={64}
        color={colors.icon}
        style={{ marginBottom: 16 }}
      />
      <ThemedText style={styles.emptyStateText}>Додайте першу дитину</ThemedText>
      <Pressable
        style={({ pressed }) => [
          styles.emptyStateButton,
          {
            backgroundColor: colors.tint,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={handleAddChild}
      >
        <ThemedText style={{ color: colorScheme === 'dark' ? 'black' : '#fff', fontWeight: '600' }}>
          Додати дитину
        </ThemedText>
      </Pressable>
    </View>
  );

  const renderUpcomingLesson = (lesson: UpcomingLesson) => (
    <Pressable
      key={lesson.id}
      style={({ pressed }) => [
        styles.lessonCard,
        {
          backgroundColor: colors.surface,
          borderLeftColor: lesson.isVacation ? '#9ca3af' : lesson.colorHex,
          opacity: lesson.isVacation ? 0.6 : (pressed ? 0.9 : 1),
        },
      ]}
      onPress={() => router.push({ pathname: '/club/[id]', params: { id: lesson.clubId } })}
    >
      <View style={styles.lessonContent}>
        <View style={styles.lessonInfo}>
          <ThemedText style={[styles.lessonClub, lesson.isVacation && { textDecorationLine: 'line-through', color: '#9ca3af' }]}>
            {lesson.clubEmoji} {lesson.clubName} {lesson.isVacation ? '(канікули)' : ''}
          </ThemedText>
          <ThemedText style={styles.lessonTime}>
            {lesson.dayLabel} · {lesson.startTime}–{lesson.endTime}
          </ThemedText>
        </View>
        <View
          style={[
            styles.dayBadge,
            { backgroundColor: lesson.isVacation ? (colorScheme === 'dark' ? '#374151' : '#f3f4f6') : (lesson.dayLabel === 'Сьогодні' ? colors.tint + '15' : colors.border + '50') },
          ]}
        >
          <ThemedText
            style={[
              styles.dayBadgeText,
              { color: lesson.isVacation ? '#9ca3af' : (lesson.dayLabel === 'Сьогодні' ? colors.tint : colors.text + '80') }
            ]}
          >
            {lesson.isVacation ? 'Канікули' : lesson.dayLabel}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );

  const renderUpcomingSection = () => {
    if (upcomingLessons.length === 0) {
      return null;
    }

    return (
      <View style={[styles.sectionContainer, { backgroundColor: colors.background }]}>
        <ThemedText style={styles.sectionTitle}>Найближчі заняття</ThemedText>
        <View style={styles.lessonsContainer}>{upcomingLessons.map(renderUpcomingLesson)}</View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centerContainer}>
          <ActivityIndicator
            size='large'
            color={colors.tint}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (children.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          {renderHeader()}
          {renderEmptyState()}
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={children}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => {
            const clubs = childrenWithClubs.get(item.id) || [];
            const clubColor = clubs.length > 0 ? clubs[0].color_hex : '#0a7ea4';
            return (
              <ChildCard
                child={item}
                clubCount={clubs.length}
                primaryColor={clubColor}
              />
            );
          }}
          ListHeaderComponent={renderHeader}
          extraData={upcomingLessons}
          ListFooterComponent={
            <View style={styles.footerContainer}>
              {renderUpcomingSection()}
              <View style={styles.bottomPadding} />
            </View>
          }
          scrollEnabled={true}
          contentContainerStyle={styles.listContent}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  childCount: {
    fontSize: 14,
    opacity: 0.5,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyStateButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 16,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.5,
    marginBottom: 12,
  },
  lessonsContainer: {
    gap: 10,
  },
  lessonCard: {
    borderLeftWidth: 4,
    borderRadius: 16,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  lessonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lessonInfo: {
    flex: 1,
  },
  lessonClub: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  lessonTime: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: '600',
  },
  dayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dayBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  footerContainer: {
    paddingTop: 8,
  },
  bottomPadding: {
    height: 30,
  },
});
