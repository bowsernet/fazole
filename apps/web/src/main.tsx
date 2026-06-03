import React from 'react';
import ReactDOM from 'react-dom/client';

import '@mantine/carousel/styles.css';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { DatesProvider } from '@mantine/dates';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { App } from './App';
import { AuthProvider } from './hooks/use-auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider>
      <DatesProvider settings={{ consistentWeeks: true }}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Notifications />
            <App />
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
          </AuthProvider>
        </QueryClientProvider>
      </DatesProvider>
    </MantineProvider>
  </React.StrictMode>
);
