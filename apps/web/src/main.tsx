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

import { App } from './App';
import { AuthProvider } from './hooks/use-auth';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider>
      <DatesProvider settings={{ consistentWeeks: true }}>
        <AuthProvider>
          <Notifications />
          <App />
        </AuthProvider>
      </DatesProvider>
    </MantineProvider>
  </React.StrictMode>
);
