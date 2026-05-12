import React from 'react';
import './CSSFireAnimation.css';

const CSSFireAnimation = ({ alarmLevel = 'first-alarm', size = 32 }) => {
  // Determine animation speed based on alarm level
  const getAnimationClass = (level) => {
    switch (level) {
      case 'general-alarm':
      case 'General Alarm (All Available)': 
        return 'fire-urgent';
      case 'third-alarm':
      case 'Third Alarm (12 Trucks)': 
        return 'fire-high';
      case 'second-alarm':
      case 'Second Alarm (8 Trucks)': 
        return 'fire-medium';
      case 'first-alarm':
      case 'First Alarm (4 Trucks)':
      default: 
        return 'fire-normal';
    }
  };

  const animationClass = getAnimationClass(alarmLevel);
  const scale = size / 32; // Scale based on desired size

  return (
    <div 
      className={`fireplace ${animationClass}`} 
      style={{ 
        transform: `scale(${scale})`,
        transformOrigin: 'center center'
      }}
    >
      <div className="blur">
        <div className="fireplace__flame_big"></div>
      </div>
      
      <main className="fireplace__spark"></main>
      <main className="fireplace__spark"></main>
      <main className="fireplace__spark"></main>
      <main className="fireplace__spark"></main>
      
      <div className="blur fix">
        <div className="fireplace__flame"></div>
      </div>
    </div>
  );
};

export default CSSFireAnimation;