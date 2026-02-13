import { useState } from 'react';
import type { ReactElement } from 'react';

import {
  ActionIcon,
  Checkbox,
  Group,
  Image,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconPhoto, IconTrash, IconUpload, IconX } from '@tabler/icons-react';

import type { BeanImage, ImageType } from '@fazole/common';

import { deleteBeanImage, updateBeanImage, uploadBeanImage } from '../../lib/firestore/images';

interface BeanImageManagerProps {
  beanId: string;
  images: BeanImage[];
  onChanged: () => void;
}

const IMAGE_TYPE_OPTIONS: { value: ImageType; label: string }[] = [
  { value: 'source', label: 'Source' },
  { value: 'closeup', label: 'Closeup' },
  { value: 'bunch', label: 'Bunch' },
  { value: 'seedling', label: 'Seedling' },
  { value: 'flower', label: 'Flower' },
  { value: 'pod', label: 'Pod' },
  { value: 'plant', label: 'Plant' },
];

export function BeanImageManager({ beanId, images, onChanged }: BeanImageManagerProps): ReactElement {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDrop(files: File[]): Promise<void> {
    setUploading(true);
    try {
      for (const file of files) {
        await uploadBeanImage(beanId, file, {
          type: 'source',
          year: new Date().getFullYear(),
          primary: false,
        });
      }
      notifications.show({ title: 'Uploaded', message: `${files.length} image(s) uploaded.`, color: 'green' });
      onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      notifications.show({ title: 'Upload failed', message, color: 'red' });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(imageId: string): Promise<void> {
    setDeletingId(imageId);
    try {
      await deleteBeanImage(beanId, imageId);
      notifications.show({ title: 'Deleted', message: 'Image deleted.', color: 'green' });
      onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      notifications.show({ title: 'Error', message, color: 'red' });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleTypeChange(imageId: string, type: string | null): Promise<void> {
    if (!type) return;
    await updateBeanImage(beanId, imageId, { type: type as ImageType });
    onChanged();
  }

  async function handleYearChange(imageId: string, year: number | string): Promise<void> {
    if (typeof year !== 'number') return;
    await updateBeanImage(beanId, imageId, { year });
    onChanged();
  }

  async function handlePrimaryChange(imageId: string, primary: boolean): Promise<void> {
    await updateBeanImage(beanId, imageId, { primary });
    onChanged();
  }

  return (
    <Stack gap="md">
      <Title order={3}>Images</Title>

      <Dropzone
        onDrop={handleDrop}
        accept={IMAGE_MIME_TYPE}
        loading={uploading}
        maxSize={10 * 1024 * 1024}
      >
        <Group justify="center" gap="xl" mih={100} style={{ pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload size={40} stroke={1.5} />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size={40} stroke={1.5} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto size={40} stroke={1.5} />
          </Dropzone.Idle>
          <Text size="sm" c="dimmed">
            Drop images here or click to select (JPEG, PNG, WebP, AVIF)
          </Text>
        </Group>
      </Dropzone>

      {images.length > 0 && (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={60}>Preview</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Year</Table.Th>
              <Table.Th>Primary</Table.Th>
              <Table.Th w={60} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {images.map((img) => (
              <Table.Tr key={img.id}>
                <Table.Td>
                  <Image
                    src={img.urls.thumb_webp}
                    w={40}
                    h={40}
                    radius="sm"
                    fallbackSrc="https://placehold.co/160x160?text=-"
                    alt=""
                  />
                </Table.Td>
                <Table.Td>
                  <Select
                    data={IMAGE_TYPE_OPTIONS}
                    value={img.type}
                    onChange={(v) => handleTypeChange(img.id, v)}
                    size="xs"
                    w={120}
                  />
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    value={img.year}
                    onChange={(v) => handleYearChange(img.id, v)}
                    size="xs"
                    w={80}
                    min={2000}
                    max={2100}
                  />
                </Table.Td>
                <Table.Td>
                  <Checkbox
                    checked={img.primary}
                    onChange={(e) => handlePrimaryChange(img.id, e.currentTarget.checked)}
                  />
                </Table.Td>
                <Table.Td>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    loading={deletingId === img.id}
                    onClick={() => handleDelete(img.id)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}
