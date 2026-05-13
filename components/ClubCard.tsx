import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from './themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ClubWithSchedules } from '@/lib/repositories';

interface ClubCardProps {
  club: ClubWithSchedules;
}

export function ClubCard({ club }: ClubCardProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getScheduleSummary = (schedules: ClubWithSchedules['schedules']): string => {
    if (!schedules || schedules.length === 0) return 'Немає розкладу';

    const dayNames = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const sortedSchedules = schedules.sort((a, b) => a.day_of_week - b.day_of_week);

    const days = sortedSchedules.map(s => dayNames[s.day_of_week % 7]);
    const uniqueDays = [...new Set(days)];

    const time = sortedSchedules[0]?.start_time + '-' + sortedSchedules[0]?.end_time;

    return `${uniqueDays.join(', ')} ${time}`;
  };

  const handlePress = () => {
    router.push({ pathname: '/club/[id]', params: { id: club.id.toString() } });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.background,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={handlePress}
    >
      <View style={[styles.colorBar, { backgroundColor: club.color_hex }]} />
      <View style={styles.content}>
        <View style={styles.leftContent}>
          <ThemedText style={styles.emoji}>{club.emoji}</ThemedText>
          <View style={styles.textContent}>
            <ThemedText style={styles.name} numberOfLines={1}>
              {club.name}
            </ThemedText>
            <ThemedText style={styles.schedule} numberOfLines={1}>
              {getScheduleSummary(club.schedules)}
            </ThemedText>
          </View>
        </View>
        <ThemedText style={styles.chevron}>›</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    alignItems: 'center',
  },
  colorBar: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  schedule: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    opacity: 0.5,
  },
});