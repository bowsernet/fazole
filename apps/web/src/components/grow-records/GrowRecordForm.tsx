import { useState } from 'react';
import type { ReactElement } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button, Group, NumberInput, Select, Stack } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';

import type { Bean, GrowRecord } from '@fazole/common';

export interface GrowRecordFormValues {
  beanId: string | null;
  year: number | string;
  preplantDate: Date | null;
  plantDate: Date | null;
  sproutDate: Date | null;
  flowerDate: Date | null;
  harvestStartDate: Date | null;
  harvestEndDate: Date | null;
}

interface GrowRecordFormProps {
  record?: GrowRecord | null;
  beans: Bean[];
  defaultBeanId?: string | null;
  onSave: (values: GrowRecordFormValues) => Promise<string | void>;
  onCancel: () => void;
}

export function GrowRecordForm({ record, beans, defaultBeanId, onSave, onCancel }: GrowRecordFormProps): ReactElement {
  const [submitting, setSubmitting] = useState(false);
  const [saveAction, setSaveAction] = useState<'back' | 'stay'>('back');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<GrowRecordFormValues>({
    values: {
      beanId: record?.beanId ?? defaultBeanId ?? null,
      year: record?.year ?? new Date().getFullYear(),
      preplantDate: epochToDate(record?.preplantDate),
      plantDate: epochToDate(record?.plantDate),
      sproutDate: epochToDate(record?.sproutDate),
      flowerDate: epochToDate(record?.flowerDate),
      harvestStartDate: epochToDate(record?.harvestStartDate),
      harvestEndDate: epochToDate(record?.harvestEndDate),
    },
  });

  async function onSubmit(values: GrowRecordFormValues): Promise<void> {
    setSubmitting(true);
    try {
      const result = await onSave(values);
      const verb = record ? 'updated' : 'created';
      notifications.show({ title: 'Success', message: `Grow record ${verb}.`, color: 'green' });

      if (saveAction === 'back') {
        const recordId = typeof result === 'string' ? result : record?.id;
        if (recordId) {
          window.location.href = '/grow-records';
        } else {
          window.location.href = '/grow-records';
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      notifications.show({ title: 'Error', message, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  }

  const beanOptions = beans.map((b) => ({ value: b.id, label: b.name }));

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap="md">
        <Controller
          name="beanId"
          control={control}
          rules={{ required: 'Bean is required' }}
          render={({ field }) => (
            <Select
              label="Bean"
              placeholder="Select bean"
              data={beanOptions}
              searchable
              error={errors.beanId?.message}
              {...field}
            />
          )}
        />

        <Controller
          name="year"
          control={control}
          rules={{ required: 'Year is required' }}
          render={({ field }) => (
            <NumberInput
              label="Year"
              placeholder="e.g. 2025"
              min={2000}
              max={2100}
              error={errors.year?.message}
              {...field}
              onChange={(v) => field.onChange(v)}
            />
          )}
        />

        <Group grow>
          <Controller
            name="preplantDate"
            control={control}
            render={({ field }) => (
              <DatePickerInput label="Preplant Date" placeholder="Pick date" clearable {...field} />
            )}
          />
          <Controller
            name="plantDate"
            control={control}
            render={({ field }) => <DatePickerInput label="Plant Date" placeholder="Pick date" clearable {...field} />}
          />
        </Group>

        <Group grow>
          <Controller
            name="sproutDate"
            control={control}
            render={({ field }) => <DatePickerInput label="Sprout Date" placeholder="Pick date" clearable {...field} />}
          />
          <Controller
            name="flowerDate"
            control={control}
            render={({ field }) => <DatePickerInput label="Flower Date" placeholder="Pick date" clearable {...field} />}
          />
        </Group>

        <Group grow>
          <Controller
            name="harvestStartDate"
            control={control}
            render={({ field }) => (
              <DatePickerInput label="Harvest Start Date" placeholder="Pick date" clearable {...field} />
            )}
          />
          <Controller
            name="harvestEndDate"
            control={control}
            render={({ field }) => (
              <DatePickerInput label="Harvest End Date" placeholder="Pick date" clearable {...field} />
            )}
          />
        </Group>

        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting} onClick={() => setSaveAction('back')}>
            Save &amp; Go Back
          </Button>
          <Button type="submit" variant="light" loading={submitting} onClick={() => setSaveAction('stay')}>
            Save &amp; Stay
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function epochToDate(epoch?: number): Date | null {
  if (!epoch) return null;
  return new Date(epoch);
}
