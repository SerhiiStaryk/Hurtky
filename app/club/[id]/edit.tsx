import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import ClubForm, { ClubFormValues } from '@/components/ClubForm';
import { useClub, useUpdateClub } from '@/hooks/useClubs';
import { upsertSchedules } from '@/lib/repositories';

export default function EditClubScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clubId = Number(id ?? '0');
  const { data: club, isLoading } = useClub(clubId);
  const updateClubMutation = useUpdateClub(clubId);

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
      <SafeAreaView style={styles.container}>
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
    <SafeAreaView style={styles.container}>
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
    backgroundColor: '#fff',
  },
});
