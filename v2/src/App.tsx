import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/ui/components/AppShell';
import { WelcomeRoute } from '@/routes/Welcome';
import { SetupRoute } from '@/routes/Setup';
import { HoleRoute } from '@/routes/Hole';
import { LedgerRoute } from '@/routes/Ledger';
import { SettlementRoute } from '@/routes/Settlement';
import { RosterRoute } from '@/routes/Roster';
import { CoursesRoute } from '@/routes/Courses';
import { HistoryRoute } from '@/routes/History';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<WelcomeRoute />} />
        <Route path="/setup" element={<SetupRoute />} />
        <Route path="/roster" element={<RosterRoute />} />
        <Route path="/courses" element={<CoursesRoute />} />
        <Route path="/history" element={<HistoryRoute />} />
        <Route path="/hole/:holeNumber" element={<HoleRoute />} />
        <Route path="/ledger" element={<LedgerRoute />} />
        <Route path="/settlement" element={<SettlementRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
