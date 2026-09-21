import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Scan from './pages/Scan';
import AddData from './pages/AddData';
import Profile from './pages/Profile';
import LivestockDetail from './pages/LivestockDetail';
import { useNetworkSync } from './hooks/useNetworkSync';
import ScanRedirect from './pages/ScanRedirect';

export default function App() {
  useNetworkSync();

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/scan/:id" element={<ScanRedirect />} />
        <Route path="/add" element={<AddData />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/livestock/:id" element={<LivestockDetail />} />
      </Route>
    </Routes>
  );
}
