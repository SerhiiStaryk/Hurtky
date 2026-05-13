import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Child } from '@/lib/repositories';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';

interface ChildCardProps {
  child: Child;
  clubCount: number;
  primaryColor?: string;
}

export function ChildCard({ child, clubCount, primaryColor = '#0a7ea4' }: ChildCardProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const calculateAge = (birthDateStr: string): number => {
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const age = calculateAge(child.birth_date);
  const initials = getInitials(child.name);

  const handlePress = () => {
    router.push({ pathname: '/child/[id]', params: { id: child.id.toString() } });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.background,
          opacity: pressed ? 0.7 : 1,
        },
        Platform.OS === 'ios' && styles.shadowIOS,
        Platform.OS === 'android' && styles.shadowAndroid,
      ]}
      onPress={handlePress}
    >
      <View style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {child.photo_uri ? (
            <Image
              source={{ uri: child.photo_uri }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: primaryColor }]}>
              <ThemedText style={[styles.initials, { color: '#fff' }]}>{initials}</ThemedText>
            </View>
          )}
        </View>

        {/* Center: Name, Age, Club Count */}
        <View style={styles.centerContent}>
          <ThemedText
            style={styles.name}
            numberOfLines={1}
          >
            {child.name}
          </ThemedText>
          <View style={styles.metaContainer}>
            <ThemedText style={styles.meta}>{age} років</ThemedText>
            <ThemedText style={[styles.meta, styles.metaDot]}>•</ThemedText>
            <ThemedText style={styles.meta}>
              {clubCount} {clubCount === 1 ? 'клуб' : 'клубів'}
            </ThemedText>
          </View>
        </View>

        {/* Right: Club Count Badge & Add Club Button */}
        <View style={styles.rightContent}>
          <View style={[styles.badge, { backgroundColor: primaryColor }]}>
            <ThemedText style={[styles.badgeText, { color: '#fff' }]}>{clubCount}</ThemedText>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.addClubButton,
              { opacity: pressed ? 0.6 : 1 }
            ]}
            onPress={(e) => {
              e.stopPropagation();
              router.push({ pathname: '/club/new', params: { childId: child.id.toString() } });
            }}
          >
            <Ionicons name="add-circle" size={32} color={primaryColor} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
  },
  shadowIOS: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  shadowAndroid: {
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    fontSize: 13,
    opacity: 0.7,
  },
  metaDot: {
    marginHorizontal: 6,
    opacity: 0.5,
  },
  badge: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  addClubButton: {
    marginLeft: 8,
    padding: 4,
  },
});
