import type { ReactElement } from 'react';

import { Alert, Button, Stack } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps): ReactElement {
  return (
    <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
      <Stack gap="sm">
        {message}
        {onRetry && (
          <Button variant="light" color="red" size="xs" onClick={onRetry}>
            Retry
          </Button>
        )}
      </Stack>
    </Alert>
  );
}
