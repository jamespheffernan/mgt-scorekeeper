import React from 'react';
const PaperTrailDrawer: React.FC<{open:boolean,onClose:()=>void}> = ({open,onClose}) => (
  open ? <div style={{background:'#ddd',padding:16,position:'fixed',bottom:0,left:0,right:0,zIndex:100}}>
    PaperTrailDrawer (placeholder)
    <button onClick={onClose}>Close</button>
  </div> : null
);
export default PaperTrailDrawer; 