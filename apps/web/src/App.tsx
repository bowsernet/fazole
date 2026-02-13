import type { ReactElement } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

import { AppLayout } from './components/layout';
import {
  BeanDetailPage,
  BeanEditPage,
  BeanListPage,
  GrowRecordEditPage,
  GrowRecordListPage,
  HomePage,
  SeasonsPage,
  SourcesPage,
  UsersPage,
} from './pages';

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="beans" element={<BeanListPage />} />
          <Route path="beans/:id" element={<BeanDetailPage />} />
          <Route path="beans/:id/edit" element={<BeanEditPage />} />
          <Route path="beans/new" element={<BeanEditPage />} />
          <Route path="grow-records" element={<GrowRecordListPage />} />
          <Route path="grow-records/:id/edit" element={<GrowRecordEditPage />} />
          <Route path="grow-records/new" element={<GrowRecordEditPage />} />
          <Route path="seasons" element={<SeasonsPage />} />
          <Route path="sources" element={<SourcesPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
