import React from 'react';
import './DealerHeader.css';

const DealerHeader = React.memo(function DealerHeader({ dealer = null }) {
  return (
    <header className="dealerHeader" aria-label="Sección del dealer Javi">
      <h2 className="dealerTitle">Javi</h2>
      {dealer?.total !== undefined && (
        <div className="dealerTotals">
          <span className="dealerTotalLabel">Total: </span>
          <strong className="dealerTotalValue">{dealer.total}</strong>
        </div>
      )}
    </header>
  );
});

export default DealerHeader;