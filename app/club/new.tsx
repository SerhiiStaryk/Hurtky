import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import ClubForm, { ClubFormValues } from '@/components/ClubForm';
import { useCreateClub } from '@/hooks/useClubs';
import { useChildren } from '@/hooks/useChildren';
import { upsertSchedules } from '@/lib/repositories';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';

export default function NewClubScreen() {
  const router = useRouter();
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  const createClubMutation = useCreateClub();
  const clubOwnerId = Number(childId ?? '0');
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const { data: children = [] } = useChildren();
  const [selectedChildId, setSelectedChildId] = useState<number>(clubOwnerId);

  useEffect(() => {
    if (clubOwnerId > 0) {
      setSelectedChildId(clubOwnerId);
    } else if (children.length > 0 && selectedChildId === 0) {
      setSelectedChildId(children[0].id);
    }
  }, [clubOwnerId, children]);

  const handleSave = async (values: ClubFormValues) => {
    if (selectedChildId <= 0) {
      alert('Будь ласка, оберіть дитину');
      return;
    }

    createClubMutation.mutate({ ...values, child_id: selectedChildId }, {
      onSuccess: async insertedClubId => {
        if (values.schedules.length > 0) {
          await upsertSchedules(insertedClubId, values.schedules);
        }
        router.back();
      },
    });
  };

  const isLoading = createClubMutation.isPending || !children;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Stack.Screen options={{ title: 'Додати гурток' }} />
      
      {clubOwnerId <= 0 && children.length > 0 && (
        <View style={[styles.pickerSection, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#fff' }]}>
          <ThemedText style={styles.label}>Для кого створюємо гурток?</ThemedText>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedChildId}
              onValueChange={(itemValue) => setSelectedChildId(itemValue)}
              dropdownIconColor={themeColors.tint}
              style={{ color: themeColors.text }}
            >
              {children.map((child) => (
                <Picker.Item key={child.id} label={child.name} value={child.id} />
              ))}
            </Picker>
          </View>
        </View>
      )}

      {children.length === 0 && clubOwnerId <= 0 ? (
        <View style={styles.messageBox}>
          <ThemedText style={styles.messageText}>Потрібно спочатку додати дитину, щоб створити гурток.</ThemedText>
        </View>
      ) : (
        <ClubForm
          submitLabel='Зберегти гурток'
          onSubmit={handleSave}
          isLoading={createClubMutation.isPending}
        />
      )}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
  },
  pickerSection: {
    margin: 16,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
});
