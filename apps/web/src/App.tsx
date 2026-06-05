import type { ReactElement } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

import { AppLayout, PageContainer } from './components/layout';
import { AdminGuard } from './components/ui';
import {
  BeanDetailPage,
  BeanEditPage,
  BeanListPage,
  GrowRecordEditPage,
  GrowRecordListPage,
  HomePage,
  NotFoundPage,
  SeasonsPage,
  SourcesPage,
  UsersPage,
} from './pages';

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {/* 1740px = 200 filter col + 20 gap + 1520 content (6 cards) */}
          <Route element={<PageContainer size={1740} />}>
            <Route path="beans" element={<BeanListPage />} />
          </Route>

          <Route element={<PageContainer size="lg" />}>
            <Route index element={<HomePage />} />
            <Route path="beans/:id" element={<BeanDetailPage />} />
            <Route
              path="beans/:id/edit"
              element={
                <AdminGuard>
                  <BeanEditPage />
                </AdminGuard>
              }
            />
            <Route
              path="beans/new"
              element={
                <AdminGuard>
                  <BeanEditPage />
                </AdminGuard>
              }
            />
            <Route path="grow-records" element={<GrowRecordListPage />} />
            <Route
              path="grow-records/:id/edit"
              element={
                <AdminGuard>
                  <GrowRecordEditPage />
                </AdminGuard>
              }
            />
            <Route
              path="grow-records/new"
              element={
                <AdminGuard>
                  <GrowRecordEditPage />
                </AdminGuard>
              }
            />
            <Route path="seasons" element={<SeasonsPage />} />
            <Route
              path="sources"
              element={
                <AdminGuard>
                  <SourcesPage />
                </AdminGuard>
              }
            />
            <Route
              path="users"
              element={
                <AdminGuard>
                  <UsersPage />
                </AdminGuard>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
