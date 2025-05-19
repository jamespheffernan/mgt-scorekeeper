import React, { useState } from 'react';

// Placeholder subcomponents
const TotalsRibbon = () => <div style={{background:'#fee',padding:8,marginBottom:8}}>TotalsRibbon (placeholder)</div>;
const HoleAccordion = ({onSelectHole}:{onSelectHole:(hole:number)=>void}) => (
  <div style={{background:'#eef',padding:8,marginBottom:8}}>
    HoleAccordion (placeholder)
    <button onClick={()=>onSelectHole(2)}>Show PaperTrail for Hole 2</button>
  </div>
);
const PaperTrailDrawer = ({open,onClose}:{open:boolean,onClose:()=>void}) => (
  open ? <div style={{background:'#ddd',padding:16,position:'fixed',bottom:0,left:0,right:0,zIndex:100}}>PaperTrailDrawer (placeholder) <button onClick={onClose}>Close</button></div> : null
);
const ExportButton = () => <button style={{marginTop:8}}>Export CSV (placeholder)</button>;

const LedgerView2: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <div style={{maxWidth:390,margin:'0 auto',padding:16}}>
      <TotalsRibbon />
      <HoleAccordion onSelectHole={()=>setDrawerOpen(true)} />
      <ExportButton />
      <PaperTrailDrawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} />
    </div>
  );
};

export default LedgerView2; 