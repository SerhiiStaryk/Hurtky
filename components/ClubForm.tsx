import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { z } from 'zod';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const clubSchema = z.object({
  name: z.string().min(1, 'Назва гуртка обов’язкова'),
  teacher_name: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  emoji: z.string().min(1, 'Емодзі обов’язкове'),
  color_hex: z.string().min(1, 'Колір обов’язковий'),
  price: z.number().min(0, 'Вартість повинна бути числом'),
  next_payment_date: z.string().nullable().optional(),
  payment_iban: z.string().nullable().optional(),
  payment_card: z.string().nullable().optional(),
  schedules: z.array(
    z.object({
      day_of_week: z.number().min(1).max(7),
      start_time: z.string().min(1, 'Початковий час обов’язковий'),
      end_time: z.string().min(1, 'Кінцевий час обов’язковий'),
    }),
  ).min(1, 'Додайте принаймні один слот розкладу'),
});

export type ClubFormValues = z.infer<typeof clubSchema>;

const initialValues: ClubFormValues = {
  name: '',
  teacher_name: '',
  location: '',
  emoji: '🎭',
  color_hex: '#4F46E5',
  price: 0,
  next_payment_date: '',
  payment_iban: '',
  payment_card: '',
  schedules: [],
};

const emojiOptions = ['🎭', '🎨', '🤸', '🎻', '⚽', '🎹', '🧩', '🏀', '🎤', '💻', '🧪', '🧘', '💃', '🧪', '📚', '🏸', '🥋'];
const colorOptions = ['#4F46E5', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e', '#ec4899', '#06b6d4', '#f97316'];
const dayOptions = [
  { label: 'Пн', value: 1 },
  { label: 'Вт', value: 2 },
  { label: 'Ср', value: 3 },
  { label: 'Чт', value: 4 },
  { label: 'Пт', value: 5 },
  { label: 'Сб', value: 6 },
  { label: 'Нд', value: 7 },
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Оберіть дату';
  return date.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseTime(value: string) {
  const [hours = '0', minutes = '00'] = value.split(':');
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date;
}

interface ClubFormProps {
  defaultValues?: ClubFormValues;
  onSubmit: (values: ClubFormValues) => void;
  submitLabel: string;
  isLoading?: boolean;
}

export default function ClubForm({ defaultValues, onSubmit, submitLabel, isLoading }: ClubFormProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const surfaceColor = colorScheme === 'dark' ? '#1f2937' : '#fff';
  const inputBackground = colorScheme === 'dark' ? '#111827' : '#f9fafb';
  const placeholderColor = colorScheme === 'dark' ? '#9ca3af' : '#6b7280';
  const { control, setValue, handleSubmit, watch, reset, formState: { errors } } = useForm<ClubFormValues>({
    defaultValues: { ...initialValues, ...defaultValues },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'schedules' });
  const [activeTimePicker, setActiveTimePicker] = useState<{
    index: number;
    field: 'start_time' | 'end_time';
  } | null>(null);
  const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);

  useEffect(() => {
    if (defaultValues) {
      reset({ ...initialValues, ...defaultValues });
    }
  }, [defaultValues, reset]);

  const formValues = watch();
  const currentEmoji = formValues.emoji || initialValues.emoji;
  const currentColor = formValues.color_hex || initialValues.color_hex;

  const handleSave = (values: ClubFormValues) => {
    const parsed = clubSchema.safeParse(values);
    if (!parsed.success) {
      console.error('Validation failed:', parsed.error.format());
      return;
    }

    onSubmit(parsed.data);
  };

  const selectNextEmoji = () => {
    const currentIndex = emojiOptions.indexOf(currentEmoji);
    const next = emojiOptions[(currentIndex + 1) % emojiOptions.length];
    setValue('emoji', next);
  };

  const addScheduleSlot = () => {
    append({ day_of_week: 1, start_time: '16:00', end_time: '17:00' });
  };

  const handleTimeChange = (_: any, selectedDate?: Date) => {
    if (!activeTimePicker) {
      return;
    }
    if (!selectedDate) {
      setActiveTimePicker(null);
      return;
    }

    setValue(
      `schedules.${activeTimePicker.index}.${activeTimePicker.field}`,
      formatTime(selectedDate),
    );
    setActiveTimePicker(null);
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: themeColors.background }]} keyboardShouldPersistTaps='handled'>
      <View style={[styles.section, { backgroundColor: surfaceColor }]}>
        <ThemedText style={styles.sectionTitle}>Емодзі</ThemedText>
        <Pressable style={[styles.emojiButton, { borderColor: currentColor }]} onPress={selectNextEmoji}>
          <ThemedText style={[styles.emojiText, { color: currentColor }]}>{currentEmoji}</ThemedText>
        </Pressable>
      </View>

      <View style={[styles.section, { backgroundColor: surfaceColor }]}>
        <ThemedText style={styles.sectionTitle}>Колір</ThemedText>
        <View style={styles.colorRow}>
          {colorOptions.map(color => (
            <Pressable
              key={color}
              style={[styles.colorDot, { backgroundColor: color, borderColor: color === currentColor ? (colorScheme === 'dark' ? '#fff' : '#111') : 'transparent' }]}
              onPress={() => setValue('color_hex', color)}
            />
          ))}
        </View>
      </View>

      <View style={[styles.field, { backgroundColor: surfaceColor }]}>
        <ThemedText style={styles.label}>Назва гуртка</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: inputBackground, color: themeColors.text, borderColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }]}
          value={formValues.name}
          onChangeText={text => setValue('name', text)}
          placeholder='Назва гуртка'
          placeholderTextColor={placeholderColor}
        />
        {errors.name && <ThemedText style={styles.errorText}>{errors.name.message}</ThemedText>}
      </View>

      <View style={[styles.field, { backgroundColor: surfaceColor }]}>
        <ThemedText style={styles.label}>Викладач</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: inputBackground, color: themeColors.text, borderColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }]}
          value={formValues.teacher_name}
          onChangeText={text => setValue('teacher_name', text)}
          placeholder='Ім’я викладача'
          placeholderTextColor={placeholderColor}
        />
      </View>

      <View style={[styles.field, { backgroundColor: surfaceColor }]}>
        <ThemedText style={styles.label}>Місце</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: inputBackground, color: themeColors.text, borderColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }]}
          value={formValues.location}
          onChangeText={text => setValue('location', text)}
          placeholder='Локація'
          placeholderTextColor={placeholderColor}
        />
      </View>

      <View style={[styles.field, { backgroundColor: surfaceColor }]}>
        <ThemedText style={styles.label}>Вартість</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: inputBackground, color: themeColors.text, borderColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }]}
          value={String(formValues.price ?? '')}
          onChangeText={text => {
            const cleaned = text.replace(/[^0-9.,]/g, '').replace(',', '.');
            setValue('price', cleaned === '' ? 0 : Number(cleaned));
          }}
          placeholder='0'
          placeholderTextColor={placeholderColor}
          keyboardType='numeric'
        />
        {errors.price && <ThemedText style={styles.errorText}>{errors.price.message}</ThemedText>}
      </View>

      <View style={[styles.field, { backgroundColor: surfaceColor }]}>
        <ThemedText style={styles.label}>Наступна оплата</ThemedText>
        <Pressable style={[styles.input, styles.dateInput, { backgroundColor: inputBackground, borderColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }]} onPress={() => setShowPaymentDatePicker(true)}>
          <ThemedText style={[styles.dateText, { color: themeColors.text }]}>{formValues.next_payment_date ? formatDate(formValues.next_payment_date) : 'Додайте дату'}</ThemedText>
        </Pressable>
        {formValues.next_payment_date ? (
          <Pressable onPress={() => setValue('next_payment_date', '')} style={styles.clearButton}>
            <ThemedText style={styles.clearButtonText}>Очистити</ThemedText>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.section, { backgroundColor: surfaceColor }]}>
        <ThemedText style={styles.sectionTitle}>Розклад</ThemedText>
        <Pressable style={styles.addSlotButton} onPress={addScheduleSlot}>
          <ThemedText style={styles.addSlotText}>+ Додати слот</ThemedText>
        </Pressable>
        {errors.schedules && <ThemedText style={styles.errorText}>{errors.schedules.message}</ThemedText>}
        {fields.length === 0 && !errors.schedules ? (
          <ThemedText style={styles.emptyText}>Додайте принаймні один слот розкладу.</ThemedText>
        ) : null}
        {fields.map((field, index) => {
          const slot = formValues.schedules?.[index] ?? { day_of_week: 1, start_time: '16:00', end_time: '17:00' };
          return (
            <View key={field.id} style={[styles.scheduleCard, { backgroundColor: surfaceColor }]}>
              <View style={styles.scheduleRow}>
                <ThemedText style={styles.label}>День</ThemedText>
                <View style={[styles.pickerWrapper, { borderColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }]}>
                  <Picker
                    selectedValue={slot.day_of_week}
                    onValueChange={value => setValue(`schedules.${index}.day_of_week`, value)}
                    style={styles.picker}
                  >
                    {dayOptions.map(option => (
                      <Picker.Item key={option.value} label={option.label} value={option.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.timeRow}>
                <View style={styles.timeBlock}>
                  <ThemedText style={styles.label}>Початок</ThemedText>
                  <Pressable style={[styles.input, styles.timeInput, { backgroundColor: inputBackground, borderColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }]} onPress={() => setActiveTimePicker({ index, field: 'start_time' })}>
                    <ThemedText style={[styles.timeText, { color: themeColors.text }]}>{slot.start_time}</ThemedText>
                  </Pressable>
                </View>
                <View style={styles.timeBlock}>
                  <ThemedText style={styles.label}>Кінець</ThemedText>
                  <Pressable style={[styles.input, styles.timeInput, { backgroundColor: inputBackground, borderColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }]} onPress={() => setActiveTimePicker({ index, field: 'end_time' })}>
                    <ThemedText style={[styles.timeText, { color: themeColors.text }]}>{slot.end_time}</ThemedText>
                  </Pressable>
                </View>
              </View>

              <Pressable style={styles.removeSlotButton} onPress={() => remove(index)}>
                <ThemedText style={styles.removeSlotText}>Видалити слот</ThemedText>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={[styles.section, { backgroundColor: surfaceColor }]}>
        <ThemedText style={styles.sectionTitle}>Платіжні дані</ThemedText>
        <View style={styles.fieldBlock}>
          <ThemedText style={styles.label}>IBAN</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: inputBackground, color: themeColors.text, borderColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }]}
            value={formValues.payment_iban}
            onChangeText={text => setValue('payment_iban', text)}
            placeholder='IBAN'
            placeholderTextColor={placeholderColor}
          />
        </View>
        <View style={styles.fieldBlock}>
          <ThemedText style={styles.label}>Картка</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: inputBackground, color: themeColors.text, borderColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }]}
            value={formValues.payment_card}
            onChangeText={text => setValue('payment_card', text)}
            placeholder='Номер картки'
            placeholderTextColor={placeholderColor}
          />
        </View>
      </View>

      <Pressable
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit(handleSave)}
        disabled={isLoading}
      >
        <ThemedText style={styles.buttonText}>{submitLabel}</ThemedText>
      </Pressable>

      {showPaymentDatePicker && (
        <DateTimePicker
          mode='date'
          value={formValues.next_payment_date ? new Date(formValues.next_payment_date) : new Date()}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_, selectedDate) => {
            setShowPaymentDatePicker(false);
            if (selectedDate) {
              setValue('next_payment_date', selectedDate.toISOString());
            }
          }}
        />
      )}
      {activeTimePicker !== null && (
        <DateTimePicker
          mode='time'
          value={parseTime(formValues.schedules?.[activeTimePicker.index]?.[activeTimePicker.field] ?? '16:00')}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
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
  section: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  emojiButton: {
    width: 72,
    height: 72,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 32,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 12,
    marginBottom: 12,
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  dateInput: {
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
  },
  clearButton: {
    marginTop: 8,
  },
  clearButtonText: {
    color: '#0a7ea4',
    fontSize: 14,
  },
  addSlotButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#0a7ea4',
    alignSelf: 'flex-start',
  },
  addSlotText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 12,
    opacity: 0.6,
  },
  scheduleCard: {
    borderRadius: 16,
    marginTop: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  scheduleRow: {
    marginBottom: 12,
  },
  pickerWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeBlock: {
    flex: 1,
    marginRight: 8,
  },
  timeInput: {
    marginTop: 4,
  },
  timeText: {
    fontSize: 16,
  },
  removeSlotButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  removeSlotText: {
    fontSize: 14,
    color: '#ef4444',
  },
  fieldBlock: {
    marginTop: 12,
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
