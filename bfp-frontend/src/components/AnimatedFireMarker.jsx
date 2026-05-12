import React, { useState, useEffect } from 'react';
import { Marker } from '@react-google-maps/api';
import { getCSSFireIcon } from '../utils/cssFireMarkers';
import firesIconUrl from '../assets/fireIcon.png';

const AnimatedFireMarker = ({ position, alarmLevel, size = 32, ...props }) => {
  const [icon, setIcon] = useState({
    url: firesIconUrl,
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size)
  });

  useEffect(() => {
    const loadAnimatedIcon = async () => {
      try {
        const animatedIcon = await getCSSFireIcon(alarmLevel, size);
        setIcon(animatedIcon);
      } catch (error) {
        console.warn('Failed to load animated fire icon, using fallback:', error);
        // Keep the default static icon
      }
    };

    loadAnimatedIcon();
  }, [alarmLevel, size]);

  return (
    <Marker 
      position={position}
      icon={icon}
      {...props}
    />
  );
};

export default AnimatedFireMarker;