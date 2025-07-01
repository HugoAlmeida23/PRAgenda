import React, { useState } from 'react';

const Tooltip = ({ text, children }) => {
  const [visible, setVisible] = useState(false);

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{
          cursor: 'pointer',
          color: '#a3a3a3',
          marginLeft: 6,
          display: 'inline-flex',
          alignItems: 'center'
        }}
      >
        {children}
      </span>
      {visible && (
        <div
          style={{
            position: 'absolute',
            left: '120%',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#23272f',
            color: 'white',
            padding: '1em 1.2em',
            borderRadius: 10,
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            zIndex: 100,
            minWidth: 220,
            fontSize: '1em',
            whiteSpace: 'pre-line',
            border: '1px solid #444',
            fontWeight: 400,
            lineHeight: 1.4,
          }}
        >
          {text}
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              left: -10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderRight: '10px solid #23272f',
              filter: 'drop-shadow(-1px 0 0 #444)'
            }}
          />
        </div>
      )}
    </span>
  );
};

export default Tooltip;