import { useRouter, Stack } from 'expo-router';
import { SafeAreaView, StyleSheet } from 'react-native';
import ChildForm, { ChildFormValues } from '@/components/ChildForm';
import { useCreateChild } from '@/hooks/useChildren';

export default function NewChildScreen() {
  const router = useRouter();
  const createChildMutation = useCreateChild();

  const handleSave = (values: ChildFormValues) => {
    createChildMutation.mutate(values, {
      onSuccess: () => router.back(),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Додати дитину' }} />
      <ChildForm
        submitLabel='Зберегти дитину'
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
