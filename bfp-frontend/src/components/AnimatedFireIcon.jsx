import React from 'react';
import './AnimatedFireIcon.css';

const AnimatedFireIcon = ({ size = 32 }) => {
  return (
    <div className="animated-fire-icon" style={{ width: size, height: size }}>
      <div className="fire-base">
        🔥
      </div>
      <div className="fire-glow"></div>
    </div>
  );
};

export default AnimatedFireIcon;