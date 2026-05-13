import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useChild, useDeleteChild } from '@/hooks/useChildren';
import { useClubsByChild } from '@/hooks/useClubs';
import { ThemedText } from '@/components/themed-text';
import { getPlural } from '@/lib/i18n';
import { ClubCard } from '@/components/ClubCard';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ChildProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const childId = parseInt(id || '0');

  const { data: child, isLoading: childLoading } = useChild(childId);
  const { data: clubs, isLoading: clubsLoading } = useClubsByChild(childId);
  const deleteChildMutation = useDeleteChild();

  if (!id || childId <= 0) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.error}>ID дитини обов'язковий.</ThemedText>
      </View>
    );
  }

  if (childLoading || clubsLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
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

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const age = calculateAge(child.birth_date);
  const initials = getInitials(child.name);
  const clubCount = clubs?.length || 0;
  const totalPrice = clubs?.reduce((sum, club) => sum + club.price, 0) || 0;

  const warningClubs = clubs?.filter((club) => {
    if (!club.next_payment_date) return false;
    const paymentDate = new Date(club.next_payment_date);
    const now = new Date();
    const diffTime = paymentDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  }) || [];

  const handleDelete = () => {
    Alert.alert(
      'Видалити дитину?',
      'Цю дію неможливо скасувати.',
      [
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
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a7ea4', '#0a7ea4']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </Pressable>

          <View style={styles.centerHeader}>
            <View style={styles.avatarContainer}>
              {child.photo_uri ? (
                <Image
                  source={{ uri: child.photo_uri }}
                  style={styles.avatar}
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    styles.avatarPlaceholder,
                    { backgroundColor: '#ffffff' },
                  ]}
                >
                  <ThemedText style={styles.initials}>
                    {initials}
                  </ThemedText>
                </View>
              )}
            </View>
            <ThemedText style={styles.childName}>{child.name}</ThemedText>
            <ThemedText style={styles.childAge}>{age} {getPlural(age, 'рік', 'роки', 'років')}</ThemedText>
          </View>

          <View style={styles.headerRight}>
            <Pressable
              onPress={() => router.push({ pathname: '/child/[id]/edit', params: { id } })}
              style={styles.headerIcon}
            >
              <Ionicons name="pencil" size={24} color="white" />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={styles.headerIcon}
            >
              <Ionicons name="trash" size={24} color="white" />
            </Pressable>
          </View>
        </View>

        <View style={styles.statsChips}>
          <View style={styles.chip}>
            <ThemedText style={styles.chipText}>
              {clubCount} {getPlural(clubCount, 'гурток', 'гуртки', 'гуртків')}
            </ThemedText>
          </View>
          <View style={styles.chip}>
            <ThemedText style={styles.chipText}>
              {totalPrice} ₴/міс
            </ThemedText>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        {warningClubs.map((club) => (
          <View key={club.id} style={styles.warningBanner}>
            <Ionicons name="warning" size={20} color="#ff9500" />
            <View style={styles.warningText}>
              <ThemedText style={styles.warningTitle}>
                Оплата за {club.name}
              </ThemedText>
              <ThemedText style={styles.warningDetails}>
                {new Date(club.next_payment_date!).toLocaleDateString('uk-UA')} - {club.price} ₴
              </ThemedText>
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Гуртки</ThemedText>
          {clubs?.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </View>
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={() => router.push(`/club/new?childId=${id}`)}
      >
        <Ionicons name="add" size={24} color="white" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  centerHeader: {
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginBottom: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  childName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  childAge: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerIcon: {
    padding: 8,
    marginLeft: 8,
  },
  statsChips: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
  },
  chipText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
  },
  warningText: {
    marginLeft: 12,
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
  },
  warningDetails: {
    fontSize: 12,
    color: '#856404',
    opacity: 0.8,
    marginTop: 2,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  error: {
    fontSize: 18,
    color: '#b00',
    textAlign: 'center',
    marginTop: 50,
  },
});
