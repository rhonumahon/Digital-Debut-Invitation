import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import App from './App.tsx';
import AdminPage from './components/AdminPage.tsx';
import RecordPage from './components/RecordPage.tsx';
import ProgramPage from './components/ProgramPage.tsx';
import './index.css';

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/record" element={<RecordPage />} />
        <Route path="/program" element={<ProgramPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
