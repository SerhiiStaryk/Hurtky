import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ClubForm, { ClubFormValues } from '@/components/ClubForm';
import { useCreateClub } from '@/hooks/useClubs';
import { upsertSchedules } from '@/lib/repositories';

export default function NewClubScreen() {
  const router = useRouter();
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  const createClubMutation = useCreateClub();
  const clubOwnerId = Number(childId ?? '0');

  const handleSave = async (values: ClubFormValues) => {
    createClubMutation.mutate({ ...values, child_id: clubOwnerId }, {
      onSuccess: async insertedClubId => {
        if (values.schedules.length > 0) {
          await upsertSchedules(insertedClubId, values.schedules);
        }
        router.back();
      },
    });
  };

  if (!childId || clubOwnerId <= 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Додати гурток' }} />
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>Потрібно вказати дитину для додавання гуртка.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Додати гурток' }} />
      <ClubForm
        submitLabel='Зберегти гурток'
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
  messageBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
  },
});
