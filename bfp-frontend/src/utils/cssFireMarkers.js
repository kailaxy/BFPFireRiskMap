// CSS Fire Animation Markers for Google Maps
// Converts the CSS fire animation to data URIs for use with Google Maps markers

import { renderToString } from 'react-dom/server';
import CSSFireAnimation from '../components/CSSFireAnimation';

// Create an animated fire marker using HTML Canvas
export async function createCSSFireMarker(alarmLevel = 'first-alarm', size = 32) {
  // Since we can't easily animate Canvas, we'll create an animated SVG
  // that mimics the CSS animation
  
  const getAnimationSpeed = (level) => {
    switch (level) {
      case 'general-alarm':
      case 'General Alarm (All Available)': 
        return '0.6s';
      case 'third-alarm':
      case 'Third Alarm (12 Trucks)': 
        return '0.9s';
      case 'second-alarm':
      case 'Second Alarm (8 Trucks)': 
        return '1.2s';
      case 'first-alarm':
      case 'First Alarm (4 Trucks)':
      default: 
        return '1.5s';
    }
  };

  const speed = getAnimationSpeed(alarmLevel);
  const isUrgent = alarmLevel.includes('general') || alarmLevel.includes('General');
  
  // Create an SVG that mimics the CSS fire animation
  const svgContent = `
    <svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Fire gradient -->
        <linearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="10%" stop-color="${isUrgent ? '#FF0000' : '#ECDD42'}">
            <animate attributeName="stop-color" 
              values="${isUrgent ? '#FF0000;#FF4500;#FF6500;#FF0000' : '#ECDD42;#ED9E34;#ED6434;#ECDD42'}" 
              dur="${speed}" repeatCount="indefinite"/>
          </stop>
          <stop offset="15%" stop-color="${isUrgent ? '#FF4500' : '#EDAE34'}">
            <animate attributeName="stop-color" 
              values="${isUrgent ? '#FF4500;#FF6500;#FF8C00;#FF4500' : '#EDAE34;#ED6434;#FA4708;#EDAE34'}" 
              dur="${speed}" repeatCount="indefinite"/>
          </stop>
          <stop offset="50%" stop-color="${isUrgent ? '#FF6500' : '#ED6434'}">
            <animate attributeName="stop-color" 
              values="${isUrgent ? '#FF6500;#FF8C00;#FFA500;#FF6500' : '#ED6434;#FA4708;#FF8C00;#ED6434'}" 
              dur="${speed}" repeatCount="indefinite"/>
          </stop>
          <stop offset="59%" stop-color="${isUrgent ? '#FF0000' : '#FA4708'}"/>
        </linearGradient>
        
        <!-- Glow effect -->
        <radialGradient id="fireGlow" cx="50%" cy="70%" r="60%">
          <stop offset="0%" stop-color="rgba(255,69,0,0.8)">
            <animate attributeName="stop-color" 
              values="rgba(255,69,0,0.8);rgba(255,140,0,1);rgba(255,200,0,0.6);rgba(255,69,0,0.8)" 
              dur="${speed}" repeatCount="indefinite"/>
          </stop>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
      </defs>
      
      <!-- Glow background -->
      <ellipse cx="16" cy="24" rx="14" ry="8" fill="url(#fireGlow)" opacity="0.6">
        <animate attributeName="rx" values="12;18;14;12" dur="${speed}" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.4;0.8;0.6;0.4" dur="${speed}" repeatCount="indefinite"/>
      </ellipse>
      
      <!-- Main flame body -->
      <path d="M16,6 C12,8 10,12 10,18 C10,24 13,28 16,30 C19,28 22,24 22,18 C22,12 20,8 16,6 Z" 
            fill="url(#fireGrad)" opacity="0.9">
        <!-- Wild morphing animation -->
        <animate attributeName="d" 
          values="M16,6 C12,8 10,12 10,18 C10,24 13,28 16,30 C19,28 22,24 22,18 C22,12 20,8 16,6 Z;
                  M16,5 C11,7 9,13 11,19 C12,25 14,29 17,30 C20,29 21,25 21,19 C23,13 21,7 16,5 Z;
                  M16,7 C13,9 12,14 9,19 C8,24 12,27 15,29 C18,27 24,24 23,19 C20,14 19,9 16,7 Z;
                  M16,6 C14,8 11,11 12,17 C13,23 15,28 16,30 C17,28 19,23 20,17 C21,11 18,8 16,6 Z;
                  M16,6 C12,8 10,12 10,18 C10,24 13,28 16,30 C19,28 22,24 22,18 C22,12 20,8 16,6 Z" 
          dur="${speed}" repeatCount="indefinite"/>
        <animateTransform attributeName="transform" 
          type="scale" 
          values="1,1;1.1,0.9;0.95,1.1;1.05,0.95;1,1" 
          dur="${speed}" repeatCount="indefinite"/>
      </path>
      
      <!-- Inner flame -->
      <path d="M16,10 C14,11 13,14 13,17 C13,21 15,24 16,26 C17,24 19,21 19,17 C19,14 18,11 16,10 Z" 
            fill="#FFD700" opacity="0.8">
        <animate attributeName="d" 
          values="M16,10 C14,11 13,14 13,17 C13,21 15,24 16,26 C17,24 19,21 19,17 C19,14 18,11 16,10 Z;
                  M16,9 C13,10 12,15 14,18 C15,22 16,25 17,26 C18,25 17,22 18,18 C20,15 19,10 16,9 Z;
                  M16,11 C15,12 14,16 12,18 C11,21 14,23 16,25 C18,23 21,21 20,18 C18,16 17,12 16,11 Z;
                  M16,10 C14,11 13,14 13,17 C13,21 15,24 16,26 C17,24 19,21 19,17 C19,14 18,11 16,10 Z" 
          dur="${speed}" repeatCount="indefinite"/>
      </path>
      
      <!-- Hot white center -->
      <ellipse cx="16" cy="18" rx="2" ry="4" fill="#FFFFFF" opacity="0.7">
        <animate attributeName="opacity" values="0.4;0.9;0.6;0.4" dur="${speed}" repeatCount="indefinite"/>
        <animateTransform attributeName="transform" 
          type="scale" 
          values="1,1;1.2,0.8;0.9,1.1;1,1" 
          dur="${speed}" repeatCount="indefinite"/>
      </ellipse>
      
      <!-- Flying sparks -->
      <circle cx="12" cy="15" r="1" fill="#FFD700" opacity="0.8">
        <animate attributeName="cy" values="15;8;15" dur="1s" repeatCount="indefinite"/>
        <animate attributeName="cx" values="12;10;14;12" dur="1.2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0.8;0.4;0" dur="1s" repeatCount="indefinite"/>
      </circle>
      <circle cx="20" cy="17" r="0.8" fill="#FF8C00" opacity="0.7">
        <animate attributeName="cy" values="17;9;17" dur="0.8s" repeatCount="indefinite"/>
        <animate attributeName="cx" values="20;22;18;20" dur="1s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0.7;0.3;0" dur="0.8s" repeatCount="indefinite"/>
      </circle>
      <circle cx="16" cy="12" r="0.6" fill="#FFFF00" opacity="0.6">
        <animate attributeName="cy" values="12;5;12" dur="0.6s" repeatCount="indefinite"/>
        <animate attributeName="cx" values="16;18;14;16" dur="0.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0.6;0.2;0" dur="0.6s" repeatCount="indefinite"/>
      </circle>
    </svg>
  `;

  // Convert SVG to data URI
  const dataUri = 'data:image/svg+xml;base64,' + btoa(svgContent);
  
  return {
    url: dataUri,
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size),
    origin: new window.google.maps.Point(0, 0)
  };
}

// Helper function to get the appropriate animated fire marker
export function getCSSFireIcon(alarmLevel, size = 32) {
  return createCSSFireMarker(alarmLevel, size);
}