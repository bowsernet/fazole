import { ReactElement } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Fazole</div>} />
      </Routes>
    </BrowserRouter>
  );
}
