import { useState } from 'react';
import type { ReactElement } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button, Group, NumberInput, Select, Stack, TextInput, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import type { Bean, Source } from '@fazole/common';
import { BEAN_COLORS } from '@fazole/common';

export interface BeanFormValues {
  name: string;
  species: string;
  podType: string;
  plantType: string;
  beansPerPod: number | string;
  beanSize: number | string;
  beanWeight: number | string;
  beanColor1: string | null;
  beanColor2: string | null;
  beanColor3: string | null;
  sourceId: string | null;
  description: string;
  sourceDescription: string;
}

interface BeanFormProps {
  bean?: Bean | null;
  sources: Source[];
  onSave: (values: BeanFormValues) => Promise<string | void>;
  onCancel: () => void;
}

const SPECIES_OPTIONS = [
  { value: 'vulgaris', label: 'Vulgaris' },
  { value: 'lima', label: 'Lima' },
  { value: 'scarlet', label: 'Scarlet' },
];

const POD_TYPE_OPTIONS = [
  { value: 'snap', label: 'Snap' },
  { value: 'dry', label: 'Dry' },
];

const PLANT_TYPE_OPTIONS = [
  { value: 'bush', label: 'Bush' },
  { value: 'semi', label: 'Semi' },
  { value: 'runner', label: 'Runner' },
];

const COLOR_OPTIONS = BEAN_COLORS.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));

export function BeanForm({ bean, sources, onSave, onCancel }: BeanFormProps): ReactElement {
  const [submitting, setSubmitting] = useState(false);
  const [saveAction, setSaveAction] = useState<'back' | 'stay'>('back');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BeanFormValues>({
    values: {
      name: bean?.name ?? '',
      species: bean?.species ?? 'vulgaris',
      podType: bean?.podType ?? 'dry',
      plantType: bean?.plantType ?? 'bush',
      beansPerPod: bean?.beansPerPod ?? '',
      beanSize: bean?.beanSize ?? '',
      beanWeight: bean?.beanWeight ?? '',
      beanColor1: bean?.beanColor1 ?? null,
      beanColor2: bean?.beanColor2 ?? null,
      beanColor3: bean?.beanColor3 ?? null,
      sourceId: bean?.sourceId ?? null,
      description: bean?.description ?? '',
      sourceDescription: bean?.sourceDescription ?? '',
    },
  });

  async function onSubmit(values: BeanFormValues): Promise<void> {
    setSubmitting(true);
    try {
      const result = await onSave(values);
      const verb = bean ? 'updated' : 'created';
      notifications.show({ title: 'Success', message: `Bean "${values.name}" ${verb}.`, color: 'green' });

      if (saveAction === 'back') {
        const beanId = typeof result === 'string' ? result : bean?.id;
        if (beanId) {
          window.location.href = `/beans/${beanId}`;
        } else {
          window.location.href = '/beans';
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      notifications.show({ title: 'Error', message, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap="md">
        <Controller
          name="name"
          control={control}
          rules={{ required: 'Name is required' }}
          render={({ field }) => (
            <TextInput label="Name" placeholder="Bean name" error={errors.name?.message} {...field} />
          )}
        />

        <Group grow>
          <Controller
            name="species"
            control={control}
            rules={{ required: 'Species is required' }}
            render={({ field }) => (
              <Select label="Species" data={SPECIES_OPTIONS} error={errors.species?.message} {...field} />
            )}
          />
          <Controller
            name="podType"
            control={control}
            rules={{ required: 'Pod type is required' }}
            render={({ field }) => (
              <Select label="Pod Type" data={POD_TYPE_OPTIONS} error={errors.podType?.message} {...field} />
            )}
          />
          <Controller
            name="plantType"
            control={control}
            rules={{ required: 'Plant type is required' }}
            render={({ field }) => (
              <Select label="Plant Type" data={PLANT_TYPE_OPTIONS} error={errors.plantType?.message} {...field} />
            )}
          />
        </Group>

        <Group grow>
          <Controller
            name="beansPerPod"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Beans per Pod"
                placeholder="e.g. 5"
                min={0}
                {...field}
                onChange={(v) => field.onChange(v)}
              />
            )}
          />
          <Controller
            name="beanSize"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Bean Size (mm)"
                placeholder="e.g. 15"
                min={0}
                {...field}
                onChange={(v) => field.onChange(v)}
              />
            )}
          />
          <Controller
            name="beanWeight"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Bean Weight (g)"
                placeholder="e.g. 0.5"
                min={0}
                decimalScale={2}
                {...field}
                onChange={(v) => field.onChange(v)}
              />
            )}
          />
        </Group>

        <Group grow>
          <Controller
            name="beanColor1"
            control={control}
            render={({ field }) => (
              <Select label="Color 1" data={COLOR_OPTIONS} clearable placeholder="None" {...field} />
            )}
          />
          <Controller
            name="beanColor2"
            control={control}
            render={({ field }) => (
              <Select label="Color 2" data={COLOR_OPTIONS} clearable placeholder="None" {...field} />
            )}
          />
          <Controller
            name="beanColor3"
            control={control}
            render={({ field }) => (
              <Select label="Color 3" data={COLOR_OPTIONS} clearable placeholder="None" {...field} />
            )}
          />
        </Group>

        <Controller
          name="sourceId"
          control={control}
          render={({ field }) => (
            <Select
              label="Source"
              data={sources.map((s) => ({ value: s.id, label: s.name }))}
              clearable
              placeholder="Select source"
              {...field}
            />
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field }) => <Textarea label="Description" placeholder="Your description" minRows={3} {...field} />}
        />

        <Controller
          name="sourceDescription"
          control={control}
          render={({ field }) => (
            <Textarea label="Source Description" placeholder="Description from source" minRows={3} {...field} />
          )}
        />

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
