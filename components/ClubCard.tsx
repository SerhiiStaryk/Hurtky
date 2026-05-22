import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ClubWithSchedules } from '@/lib/repositories';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';

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
    const sortedSchedules = [...schedules].sort((a, b) => a.day_of_week - b.day_of_week);

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
          backgroundColor: colors.surface,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      onPress={handlePress}
    >
      <View style={[styles.colorBar, { backgroundColor: club.color_hex }]} />
      <View style={styles.content}>
        <View style={styles.leftContent}>
          <View style={[styles.emojiContainer, { backgroundColor: club.color_hex + '10' }]}>
            <ThemedText style={styles.emoji}>{club.emoji}</ThemedText>
          </View>
          <View style={styles.textContent}>
            <ThemedText
              style={styles.name}
              numberOfLines={1}
            >
              {club.name}
            </ThemedText>
            <ThemedText
              style={styles.schedule}
              numberOfLines={1}
            >
              {getScheduleSummary(club.schedules)}
            </ThemedText>
          </View>
        </View>
        <View style={styles.chevronContainer}>
          <Ionicons
            name='chevron-forward'
            size={16}
            color={colors.icon + '80'}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    marginVertical: 5,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  colorBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 10,
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
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  emoji: {
    fontSize: 24,
    lineHeight: 44,
    textAlign: 'center',
    includeFontPadding: false,
  },
  textContent: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
  },
  schedule: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 1,
    fontWeight: '500',
  },
  chevronContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
