import { useEffect } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ClubForm, { ClubFormValues } from '@/components/ClubForm';
import { useClub, useUpdateClub } from '@/hooks/useClubs';
import { upsertSchedules } from '@/lib/repositories';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function EditClubScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clubId = Number(id ?? '0');
  const { data: club, isLoading } = useClub(clubId);
  const updateClubMutation = useUpdateClub(clubId);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    if (!id || clubId <= 0) {
      router.back();
    }
  }, [clubId, id, router]);

  if (!id || clubId <= 0) {
    return null;
  }

  if (isLoading || !club) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size='large' />
      </SafeAreaView>
    );
  }

  const handleSave = async (values: ClubFormValues) => {
    updateClubMutation.mutate(values, {
      onSuccess: async () => {
        await upsertSchedules(clubId, values.schedules);
        router.back();
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Stack.Screen options={{ title: 'Редагувати гурток' }} />
      <ClubForm
        defaultValues={club}
        submitLabel='Зберегти зміни'
        onSubmit={handleSave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
