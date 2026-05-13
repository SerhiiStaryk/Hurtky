import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Image, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { z } from 'zod';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const childSchema = z.object({
  name: z.string().min(1, 'Ім’я обов’язкове'),
  birth_date: z.string().min(1, 'Дата народження обов’язкова'),
  photo_uri: z.string().optional(),
  notes: z.string().optional(),
});

export type ChildFormValues = z.infer<typeof childSchema>;

const initialValues: ChildFormValues = {
  name: '',
  birth_date: new Date().toISOString(),
  photo_uri: '',
  notes: '',
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Оберіть дату';
  return date.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getAvatarLabel(name: string) {
  const text = name.trim();
  if (!text) return '👶';
  return text
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface ChildFormProps {
  defaultValues?: ChildFormValues;
  onSubmit: (values: ChildFormValues) => void;
  submitLabel: string;
  isLoading?: boolean;
}

export default function ChildForm({ defaultValues, onSubmit, submitLabel, isLoading }: ChildFormProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const surfaceColor = colorScheme === 'dark' ? '#1f2937' : '#fff';
  const inputBackground = colorScheme === 'dark' ? '#111827' : '#f9fafb';
  const placeholderColor = colorScheme === 'dark' ? '#9ca3af' : '#6b7280';
  const { setValue, handleSubmit, watch, reset, formState: { errors } } = useForm<ChildFormValues>({
    defaultValues: { ...initialValues, ...defaultValues },
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (defaultValues) {
      reset({ ...initialValues, ...defaultValues });
    }
  }, [defaultValues, reset]);

  const currentValues = watch();

  const handleImagePicker = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets.length > 0) {
      setValue('photo_uri', result.assets[0].uri || '', { shouldValidate: true });
    }
  };

  const handleSave = (values: ChildFormValues) => {
    const parsed = childSchema.safeParse(values);
    if (!parsed.success) {
      return;
    }

    onSubmit(parsed.data);
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: themeColors.background }]} keyboardShouldPersistTaps='handled'>
      <View style={[styles.card, { backgroundColor: surfaceColor }]}>
        <Pressable style={styles.avatarPicker} onPress={handleImagePicker}>
          {currentValues.photo_uri ? (
            <Image source={{ uri: currentValues.photo_uri }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: inputBackground }]}>
              <ThemedText style={styles.avatarEmoji}>{getAvatarLabel(currentValues.name)}</ThemedText>
            </View>
          )}
        </Pressable>
        <ThemedText style={styles.avatarLabel}>Натисніть, щоб вибрати фото</ThemedText>
      </View>

      <View style={[styles.field, { backgroundColor: surfaceColor }]}> 
        <ThemedText style={styles.label}>Ім’я</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: inputBackground, color: themeColors.text }]}
          value={currentValues.name}
          onChangeText={text => setValue('name', text)}
          placeholder='Ім’я дитини'
          placeholderTextColor={placeholderColor}
        />
        {errors.name && <ThemedText style={styles.errorText}>{errors.name.message}</ThemedText>}
      </View>

      <View style={[styles.field, { backgroundColor: surfaceColor }]}> 
        <ThemedText style={styles.label}>Дата народження</ThemedText>
        <Pressable style={[styles.input, styles.dateInput, { backgroundColor: inputBackground }]} onPress={() => setShowDatePicker(true)}>
          <ThemedText style={[styles.dateText, { color: themeColors.text }]}>{formatDate(currentValues.birth_date)}</ThemedText>
        </Pressable>
        {errors.birth_date && <ThemedText style={styles.errorText}>{errors.birth_date.message}</ThemedText>}
      </View>

      <View style={[styles.field, { backgroundColor: surfaceColor }]}> 
        <ThemedText style={styles.label}>Нотатки</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: inputBackground, color: themeColors.text }]}
          value={currentValues.notes}
          onChangeText={text => setValue('notes', text)}
          placeholder='Додаткові нотатки'
          placeholderTextColor={placeholderColor}
          multiline
        />
      </View>

      <Pressable
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit(handleSave)}
        disabled={isLoading}
      >
        <ThemedText style={styles.buttonText}>{submitLabel}</ThemedText>
      </Pressable>

      {showDatePicker && (
        <DateTimePicker
          mode='date'
          value={new Date(currentValues.birth_date)}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setValue('birth_date', selectedDate.toISOString(), { shouldValidate: true });
            }
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  avatarPicker: {
    width: 110,
    height: 110,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
  },
  avatarEmoji: {
    fontSize: 36,
  },
  avatarLabel: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  field: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateInput: {
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
  },
  button: {
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 8,
    color: '#dc2626',
    fontSize: 13,
  },
});
