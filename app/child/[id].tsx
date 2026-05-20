import { ClubCard } from '@/components/ClubCard';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useChild, useDeleteChild } from '@/hooks/useChildren';
import { useClubsByChild } from '@/hooks/useClubs';
import { getPlural } from '@/lib/i18n';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useLayoutEffect } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

export default function ChildProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const childId = parseInt(id || '0');

  const { data: child, isLoading: childLoading } = useChild(childId);
  const { data: clubs, isLoading: clubsLoading } = useClubsByChild(childId);
  const deleteChildMutation = useDeleteChild();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: child?.name ?? 'Дитина',
      headerBackTitle: 'Назад',
    });
  }, [navigation, child]);

  if (!id || childId <= 0) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.error}>ID дитини обов&apos;язковий.</ThemedText>
      </View>
    );
  }

  if (childLoading || clubsLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          size='large'
          color={colors.tint}
        />
      </View>
    );
  }

  if (!child) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.error}>Дитину не знайдено.</ThemedText>
      </View>
    );
  }

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
  const clubCount = clubs?.length || 0;
  const totalPrice = clubs?.reduce((sum, club) => sum + club.price, 0) || 0;

  const warningClubs =
    clubs?.filter(club => {
      if (!club.next_payment_date) return false;
      const paymentDate = new Date(club.next_payment_date);
      const now = new Date();
      const diffTime = paymentDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7 && diffDays >= 0;
    }) || [];

  const handleDelete = () => {
    Alert.alert('Видалити дитину?', 'Цю дію неможливо скасувати.', [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: () => {
          deleteChildMutation.mutate(childId, {
            onSuccess: () => router.back(),
          });
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <View style={styles.backButtonContent}>
              <Ionicons
                name='chevron-back'
                size={16}
                color='white'
              />
              <ThemedText style={styles.backButtonText}>Назад</ThemedText>
            </View>
          </Pressable>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push({ pathname: '/child/[id]/edit', params: { id } })}
              style={styles.headerIcon}
            >
              <Ionicons
                name='pencil'
                size={20}
                color='white'
              />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={styles.headerIcon}
            >
              <Ionicons
                name='trash'
                size={20}
                color='white'
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            {child.photo_uri ? (
              <Image
                source={{ uri: child.photo_uri }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                <ThemedText style={styles.initials}>{initials}</ThemedText>
              </View>
            )}
          </View>
          <View style={styles.nameContainer}>
            <ThemedText style={styles.childName}>{child.name}</ThemedText>
            <ThemedText style={styles.childAge}>
              {age} {getPlural(age, 'рік', 'роки', 'років')}
            </ThemedText>
          </View>
        </View>

        <View style={styles.statsChips}>
          <View style={styles.chip}>
            <ThemedText style={styles.chipText}>
              {clubCount} {getPlural(clubCount, 'гурток', 'гуртки', 'гуртків')}
            </ThemedText>
          </View>
          <View style={styles.chip}>
            <ThemedText style={styles.chipText}>{totalPrice} ₴/міс</ThemedText>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {warningClubs.map(club => (
          <View
            key={club.id}
            style={styles.warningBanner}
          >
            <View style={[styles.warningIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons
                name='warning'
                size={18}
                color='#D97706'
              />
            </View>
            <View style={styles.warningText}>
              <ThemedText style={styles.warningTitle}>Оплата за {club.name}</ThemedText>
              <ThemedText style={styles.warningDetails}>
                До {new Date(club.next_payment_date!).toLocaleDateString('uk-UA')} · {club.price} ₴
              </ThemedText>
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Гуртки</ThemedText>
          {clubs?.map(club => (
            <ClubCard
              key={club.id}
              club={club}
            />
          ))}
          {clubs?.length === 0 && (
            <View style={styles.emptyClubs}>
              <ThemedText style={styles.emptyClubsText}>Ще немає гуртків</ThemedText>
            </View>
          )}
        </View>
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={() => router.push(`/club/new?childId=${id}`)}
      >
        <Ionicons
          name='add'
          size={28}
          color='white'
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 6,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerIcon: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
  },
  nameContainer: {
    flex: 1,
  },
  childName: {
    fontSize: 22,
    fontWeight: '900',
    color: 'white',
  },
  childAge: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '700',
    marginTop: 2,
  },
  statsChips: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  warningIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  warningText: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  warningDetails: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.5,
    marginBottom: 12,
  },
  emptyClubs: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyClubsText: {
    fontSize: 14,
    opacity: 0.5,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  error: {
    fontSize: 18,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 50,
  },
});
