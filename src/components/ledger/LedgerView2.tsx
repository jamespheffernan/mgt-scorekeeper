import React, { useState } from 'react';
import TotalsRibbon from './TotalsRibbon';
import HoleAccordion from './HoleAccordion';
import PaperTrailDrawer from './PaperTrailDrawer';
import ExportButton from './ExportButton';

const LedgerView2: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedHole, setSelectedHole] = useState<number | null>(null);

  const handleSelectHole = (hole: number) => {
    setSelectedHole(hole);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedHole(null);
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '95vw',
        minWidth: 320,
        margin: '0 auto',
        padding: 16,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <TotalsRibbon />
      <HoleAccordion onSelectHole={handleSelectHole} />
      <ExportButton />
      <PaperTrailDrawer open={drawerOpen} hole={selectedHole} onClose={handleCloseDrawer} />
    </div>
  );
};

export default LedgerView2; 