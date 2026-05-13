import { useRouter, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChildForm, { ChildFormValues } from '@/components/ChildForm';
import { useCreateChild } from '@/hooks/useChildren';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function NewChildScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const createChildMutation = useCreateChild();

  const handleSave = (values: ChildFormValues) => {
    createChildMutation.mutate(values, {
      onSuccess: () => router.back(),
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Stack.Screen options={{ title: 'Додати дитину' }} />
      <ChildForm
        submitLabel='Зберегти дитину'
        onSubmit={handleSave}
        isLoading={createChildMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
