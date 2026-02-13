import { useState } from 'react';
import type { ReactElement } from 'react';

import { Button, Group, Modal, Select, Stack, TextInput, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Controller, useForm } from 'react-hook-form';

import type { Source } from '@fazole/common';

import { createSource, updateSource } from '../../lib/firestore/sources';

const SOURCE_COLORS = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'lime', label: 'Lime' },
  { value: 'grape', label: 'Grape' },
  { value: 'orange', label: 'Orange' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'teal', label: 'Teal' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'violet', label: 'Violet' },
  { value: 'pink', label: 'Pink' },
];

interface SourceFormValues {
  name: string;
  color: string;
  link: string;
  description: string;
}

interface SourceFormProps {
  opened: boolean;
  source: Source | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function SourceForm({ opened, source, onClose, onSuccess }: SourceFormProps): ReactElement {
  const [submitting, setSubmitting] = useState(false);
  const isEdit = source !== null;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SourceFormValues>({
    values: {
      name: source?.name ?? '',
      color: source?.color ?? 'green',
      link: source?.link ?? '',
      description: source?.description ?? '',
    },
  });

  async function onSubmit(values: SourceFormValues): Promise<void> {
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateSource(source.id, values);
        notifications.show({ title: 'Updated', message: `Source "${values.name}" updated.`, color: 'green' });
      } else {
        await createSource(values);
        notifications.show({ title: 'Created', message: `Source "${values.name}" created.`, color: 'green' });
      }
      reset();
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      notifications.show({ title: 'Error', message, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose(): void {
    reset();
    onClose();
  }

  return (
    <Modal opened={opened} onClose={handleClose} title={isEdit ? 'Edit Source' : 'Add Source'}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="md">
          <Controller
            name="name"
            control={control}
            rules={{ required: 'Name is required' }}
            render={({ field }) => (
              <TextInput label="Name" placeholder="Source name" error={errors.name?.message} {...field} />
            )}
          />

          <Controller
            name="color"
            control={control}
            rules={{ required: 'Color is required' }}
            render={({ field }) => (
              <Select
                label="Color"
                data={SOURCE_COLORS}
                error={errors.color?.message}
                {...field}
              />
            )}
          />

          <Controller
            name="link"
            control={control}
            rules={{ required: 'Link is required' }}
            render={({ field }) => (
              <TextInput label="Link" placeholder="https://..." error={errors.link?.message} {...field} />
            )}
          />

          <Controller
            name="description"
            control={control}
            rules={{ required: 'Description is required' }}
            render={({ field }) => (
              <Textarea
                label="Description"
                placeholder="Describe this source"
                minRows={3}
                error={errors.description?.message}
                {...field}
              />
            )}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Save' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
