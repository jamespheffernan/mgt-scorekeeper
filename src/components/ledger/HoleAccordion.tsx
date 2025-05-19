import React from 'react';
const HoleAccordion: React.FC<{onSelectHole:(hole:number)=>void}> = ({onSelectHole}) => (
  <div style={{background:'#eef',padding:8}}>
    HoleAccordion (placeholder)
    <button onClick={()=>onSelectHole(2)}>Show PaperTrail for Hole 2</button>
  </div>
);
export default HoleAccordion; 