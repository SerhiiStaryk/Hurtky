import { ChildCard } from '@/components/ChildCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useChildren } from '@/hooks/useChildren';
import { getDatabase } from '@/lib/db';
import { getPlural } from '@/lib/i18n';
import { Child, Club, Schedule } from '@/lib/repositories';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
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
        const db = await getDatabase();
        const clubsMap = new Map<number, any>();

        // Get clubs count for each child
        for (const child of children) {
          const clubs = await db.getAllAsync(
            'SELECT * FROM clubs WHERE child_id = ?',
            [child.id]
          );
          clubsMap.set(child.id, clubs || []);
        }

        setChildrenWithClubs(clubsMap);

        // Get upcoming lessons for today and tomorrow
        const today = new Date();
        const todayDayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        // Convert to 1=Monday, 7=Sunday format
        const todayDay = todayDayOfWeek === 0 ? 7 : todayDayOfWeek;
        const tomorrowDay = todayDay === 7 ? 1 : todayDay + 1;

        // Get all schedules for today and tomorrow
        const schedules = await db.getAllAsync<Schedule>(
          'SELECT * FROM schedules WHERE day_of_week IN (?, ?)',
          [todayDay, tomorrowDay]
        );

        if (schedules && schedules.length > 0) {
          const lessonsData: UpcomingLesson[] = [];

          for (const schedule of schedules) {
            // Get club info
            const club = await db.getFirstAsync<Club>(
              'SELECT * FROM clubs WHERE id = ?',
              [schedule.club_id]
            );

            if (club) {
              // Get child info
              const child = await db.getFirstAsync<Child>(
                'SELECT * FROM children WHERE id = ?',
                [club.child_id]
              );

              if (child) {
                lessonsData.push({
                  id: `${schedule.id}`,
                  childName: child.name,
                  clubName: club.name,
                  clubEmoji: club.emoji,
                  startTime: schedule.start_time,
                  endTime: schedule.end_time,
                  dayLabel:
                    schedule.day_of_week === todayDay
                      ? 'Сьогодні'
                      : 'Завтра',
                  colorHex: club.color_hex,
                });
              }
            }
          }

          // Sort by time and limit to 3
          lessonsData.sort((a, b) => {
            const timeA = parseInt(a.startTime.replace(':', ''), 10);
            const timeB = parseInt(b.startTime.replace(':', ''), 10);
            return timeA - timeB;
          });

          setUpcomingLessons(lessonsData.slice(0, 3));
        }
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
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <View style={styles.headerTop}>
        <ThemedText style={styles.title}>Мої діти</ThemedText>
        <View style={{ flexDirection: 'row' }}>
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              { opacity: pressed ? 0.7 : 1, marginRight: 8 },
            ]}
            onPress={() => {
              if (children.length >= 1) {
                router.push('/club/new');
              } else {
                Alert.alert('Спочатку додайте дитину');
              }
            }}
          >
            <Ionicons
              name="school-outline"
              size={28}
              color={colors.tint}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={handleAddChild}
          >
            <Ionicons
              name="person-add-outline"
              size={28}
              color={colors.tint}
            />
          </Pressable>
        </View>
      </View>
      {children.length > 0 && (
        <ThemedText style={styles.childCount}>
          {children.length} {getPlural(children.length, 'дитина', 'дитини', 'дітей')}
        </ThemedText>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="person-add-outline"
        size={64}
        color={colors.icon}
        style={{ marginBottom: 16 }}
      />
      <ThemedText style={styles.emptyStateText}>
        Додайте першу дитину
      </ThemedText>
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
    <View
      key={lesson.id}
      style={[
        styles.lessonCard,
        {
          backgroundColor: colors.background,
          borderLeftColor: lesson.colorHex,
        },
      ]}
    >
      <View style={styles.lessonContent}>
        <View style={styles.lessonEmoji}>
          <ThemedText style={styles.lessonEmojiText}>
            {lesson.clubEmoji}
          </ThemedText>
        </View>
        <View style={styles.lessonInfo}>
          <ThemedText style={styles.lessonClub}>
            {lesson.clubName}
          </ThemedText>
          <ThemedText style={styles.lessonChild}>
            {lesson.childName}
          </ThemedText>
          <ThemedText style={styles.lessonTime}>
            {lesson.startTime} - {lesson.endTime}
          </ThemedText>
        </View>
      </View>
    </View>
  );

  const renderUpcomingSection = () => {
    if (upcomingLessons.length === 0) {
      return null;
    }

    return (
      <View style={[styles.sectionContainer, { backgroundColor: colors.background }]}>
        <ThemedText style={styles.sectionTitle}>
          Найближчі заняття
        </ThemedText>
        <View style={styles.lessonsContainer}>
          {upcomingLessons.map(renderUpcomingLesson)}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centerContainer}>
          <ActivityIndicator
            size="large"
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
          keyExtractor={(item) => item.id.toString()}
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
    marginTop: 40,
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
    paddingVertical: 16,
    paddingTop: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  addButton: {
    padding: 8,
  },
  childCount: {
    fontSize: 14,
    opacity: 0.6,
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
    borderRadius: 8,
    marginTop: 16,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  lessonsContainer: {
    gap: 12,
  },
  lessonCard: {
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  lessonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonEmoji: {
    fontSize: 24,
    marginRight: 12,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonEmojiText: {
    fontSize: 20,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonClub: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  lessonChild: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  lessonTime: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: '500',
  },
  footerContainer: {
    paddingTop: 8,
  },
  bottomPadding: {
    height: 20,
  },
});
