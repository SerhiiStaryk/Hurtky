import { useEffect } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import ChildForm, { ChildFormValues } from '@/components/ChildForm';
import { useChild, useUpdateChild } from '@/hooks/useChildren';

export default function EditChildScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const childId = Number(id ?? '0');
  const { data: child, isLoading } = useChild(childId);
  const updateChildMutation = useUpdateChild(childId);

  useEffect(() => {
    if (!id || childId <= 0) {
      router.back();
    }
  }, [childId, id, router]);

  if (!id || childId <= 0) {
    return null;
  }

  if (isLoading || !child) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size='large' />
      </SafeAreaView>
    );
  }

  const handleSave = (values: ChildFormValues) => {
    updateChildMutation.mutate(values, {
      onSuccess: () => router.back(),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Редагувати дитину' }} />
      <ChildForm
        defaultValues={child}
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
