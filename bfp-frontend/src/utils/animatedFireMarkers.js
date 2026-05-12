// Animated Fire Marker for Google Maps
// Creates animated SVG data URIs for use with Google Maps markers

export function createAnimatedFireMarker(alarmLevel = 'first-alarm', size = 32) {
  // Determine animation speed based on alarm level - much faster and wilder
  const getAnimationDuration = (level) => {
    switch (level) {
      case 'general-alarm': return '0.2s';
      case 'third-alarm': return '0.3s';
      case 'second-alarm': return '0.4s';
      case 'first-alarm': 
      default: return '0.5s';
    }
  };

  const duration = getAnimationDuration(alarmLevel);
  
  const svgContent = `
    <svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Intense animated radial gradient for wild glow effect -->
        <radialGradient id="fireGlow" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="rgba(255,0,0,0.9)">
            <animate attributeName="stop-color" 
              values="rgba(255,0,0,0.9);rgba(255,69,0,1);rgba(255,140,0,0.8);rgba(255,200,0,0.7);rgba(255,0,0,0.9)" 
              dur="${duration}" repeatCount="indefinite"/>
          </stop>
          <stop offset="30%" stop-color="rgba(255,69,0,0.6)">
            <animate attributeName="stop-color" 
              values="rgba(255,69,0,0.6);rgba(255,140,0,0.8);rgba(255,200,0,0.5);rgba(255,100,0,0.7);rgba(255,69,0,0.6)" 
              dur="${duration}" repeatCount="indefinite"/>
          </stop>
          <stop offset="70%" stop-color="rgba(255,140,0,0.3)">
            <animate attributeName="stop-color" 
              values="rgba(255,140,0,0.3);rgba(255,200,0,0.5);rgba(255,69,0,0.2);rgba(255,100,0,0.4);rgba(255,140,0,0.3)" 
              dur="${duration}" repeatCount="indefinite"/>
          </stop>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
        
        <!-- Chaotic fire gradient -->
        <linearGradient id="fireGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#CC0000">
            <animate attributeName="stop-color" 
              values="#CC0000;#FF0000;#FF4500;#FF6500;#CC0000" 
              dur="${duration}" repeatCount="indefinite"/>
          </stop>
          <stop offset="30%" stop-color="#FF4500">
            <animate attributeName="stop-color" 
              values="#FF4500;#FF6500;#FF8C00;#FFA500;#FF4500" 
              dur="${duration}" repeatCount="indefinite"/>
          </stop>
          <stop offset="70%" stop-color="#FF8C00">
            <animate attributeName="stop-color" 
              values="#FF8C00;#FFD700;#FFA500;#FF6500;#FF8C00" 
              dur="${duration}" repeatCount="indefinite"/>
          </stop>
          <stop offset="100%" stop-color="#FFD700">
            <animate attributeName="stop-color" 
              values="#FFD700;#FFFFFF;#FFFF00;#FFD700" 
              dur="${duration}" repeatCount="indefinite"/>
          </stop>
        </linearGradient>
      </defs>
      
      <!-- Animated glow background - much more intense -->
      <circle cx="16" cy="16" r="18" fill="url(#fireGlow)" opacity="0.8">
        <animate attributeName="r" values="12;25;15;22;18;12" dur="${duration}" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.3;1;0.7;0.9;0.5;0.3" dur="${duration}" repeatCount="indefinite"/>
        <animateTransform attributeName="transform" 
          type="rotate" 
          values="0 16 16;15 16 16;-10 16 16;20 16 16;-5 16 16;0 16 16" 
          dur="${duration}" repeatCount="indefinite"/>
      </circle>
      
      <!-- Multiple wild fire layers -->
      <g transform="translate(16,16)">
        <!-- Main chaotic fire body -->
        <path d="M0,-14 C-5,-12 -8,-8 -7,-2 C-8,2 -6,8 -2,12 C0,10 2,12 4,8 C7,5 8,-1 6,-6 C8,-9 5,-12 0,-14 Z" 
              fill="url(#fireGradient)" opacity="0.9">
          <!-- Extreme flickering and morphing -->
          <animateTransform attributeName="transform" 
            type="scale" 
            values="1,1;1.3,0.7;0.8,1.4;1.2,0.9;0.9,1.3;1.4,0.8;1,1" 
            dur="${duration}" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;1;0.8;0.9;0.7;1;0.6" dur="${duration}" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" 
            type="rotate" 
            values="0;8;-12;15;-8;5;0" 
            dur="${duration}" repeatCount="indefinite" additive="sum"/>
        </path>
        
        <!-- Wild left flame tongue -->
        <path d="M-3,-10 C-7,-8 -9,-5 -8,-1 C-9,2 -6,6 -3,4 C-2,2 -1,0 -3,-10 Z" 
              fill="#FF4500" opacity="0.8">
          <animateTransform attributeName="transform" 
            type="scale" 
            values="1,1;0.6,1.5;1.2,0.8;0.8,1.3;1.3,0.7;1,1" 
            dur="${duration}" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" 
            type="rotate" 
            values="0;-20;10;-15;25;0" 
            dur="${duration}" repeatCount="indefinite" additive="sum"/>
        </path>
        
        <!-- Wild right flame tongue -->
        <path d="M3,-10 C7,-8 9,-5 8,-1 C9,2 6,6 3,4 C2,2 1,0 3,-10 Z" 
              fill="#FF6500" opacity="0.8">
          <animateTransform attributeName="transform" 
            type="scale" 
            values="1,1;1.4,0.6;0.7,1.3;1.1,0.9;0.9,1.2;1,1" 
            dur="${duration}" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" 
            type="rotate" 
            values="0;25;-10;20;-30;0" 
            dur="${duration}" repeatCount="indefinite" additive="sum"/>
        </path>
        
        <!-- Chaotic inner flame -->
        <path d="M0,-9 C-3,-8 -4,-5 -3,-1 C-4,3 -2,7 0,8 C2,7 4,3 3,-1 C4,-5 3,-8 0,-9 Z" 
              fill="#FFD700" opacity="0.9">
          <animateTransform attributeName="transform" 
            type="scale" 
            values="1,1;0.7,1.4;1.3,0.8;0.9,1.2;1.2,0.9;1,1" 
            dur="${duration}" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" 
            type="skewX" 
            values="0;15;-20;10;-15;0" 
            dur="${duration}" repeatCount="indefinite" additive="sum"/>
        </path>
        
        <!-- Intense white hot center -->
        <ellipse cx="0" cy="1" rx="1.2" ry="4" fill="#FFFFFF" opacity="0.8">
          <animate attributeName="opacity" values="0.3;1;0.6;0.9;0.4;1;0.3" dur="${duration}" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" 
            type="scale" 
            values="1,1;1.5,0.8;0.8,1.3;1.2,1;0.9,1.1;1,1" 
            dur="${duration}" repeatCount="indefinite"/>
        </ellipse>
      </g>
      
      <!-- Wild sparks and embers flying everywhere -->
      <circle cx="6" cy="10" r="1.2" fill="#FFD700" opacity="0.9">
        <animate attributeName="cy" values="10;2;10" dur="0.6s" repeatCount="indefinite"/>
        <animate attributeName="cx" values="6;4;8;6" dur="0.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;1;0.8;0" dur="0.6s" repeatCount="indefinite"/>
        <animate attributeName="r" values="1.2;0.5;1.2" dur="0.6s" repeatCount="indefinite"/>
      </circle>
      <circle cx="26" cy="14" r="1" fill="#FF6500" opacity="0.8">
        <animate attributeName="cy" values="14;6;14" dur="0.7s" repeatCount="indefinite"/>
        <animate attributeName="cx" values="26;28;24;26" dur="0.9s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0.8;0.6;0" dur="0.7s" repeatCount="indefinite"/>
      </circle>
      <circle cx="10" cy="26" r="0.8" fill="#FF4500" opacity="0.7">
        <animate attributeName="cy" values="26;20;26" dur="0.8s" repeatCount="indefinite"/>
        <animate attributeName="cx" values="10;8;12;10" dur="1s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0.7;0.4;0" dur="0.8s" repeatCount="indefinite"/>
      </circle>
      <circle cx="22" cy="8" r="0.6" fill="#FFD700" opacity="0.6">
        <animate attributeName="cy" values="8;3;8" dur="0.5s" repeatCount="indefinite"/>
        <animate attributeName="cx" values="22;25;20;22" dur="0.7s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0.6;0.3;0" dur="0.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="14" cy="6" r="0.4" fill="#FF8C00" opacity="0.5">
        <animate attributeName="cy" values="6;1;6" dur="0.4s" repeatCount="indefinite"/>
        <animate attributeName="cx" values="14;16;12;14" dur="0.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0.5;0.2;0" dur="0.4s" repeatCount="indefinite"/>
      </circle>
      <circle cx="18" cy="28" r="0.5" fill="#FF4500" opacity="0.4">
        <animate attributeName="cy" values="28;22;28" dur="0.9s" repeatCount="indefinite"/>
        <animate attributeName="cx" values="18;20;16;18" dur="1.1s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0.4;0.2;0" dur="0.9s" repeatCount="indefinite"/>
      </circle>
    </svg>
  `;

  // Convert SVG to data URI
  const dataUri = 'data:image/svg+xml;base64,' + btoa(svgContent);
  
  return {
    url: dataUri,
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size / 2),
    origin: new window.google.maps.Point(0, 0)
  };
}

// Helper function to get the appropriate animated marker based on alarm level
export function getAnimatedFireIcon(alarmLevel, size = 32) {
  // Map alarm level text to animation intensity
  const levelMap = {
    'First Alarm (4 Trucks)': 'first-alarm',
    'Second Alarm (8 Trucks)': 'second-alarm', 
    'Third Alarm (12 Trucks)': 'third-alarm',
    'General Alarm (All Available)': 'general-alarm',
    'first_alarm': 'first-alarm',
    'second_alarm': 'second-alarm',
    'third_alarm': 'third-alarm', 
    'general_alarm': 'general-alarm'
  };

  const mappedLevel = levelMap[alarmLevel] || 'first-alarm';
  return createAnimatedFireMarker(mappedLevel, size);
}

// Urgent emergency animation (fastest)
export function getUrgentFireIcon(size = 32) {
  return createAnimatedFireMarker('general-alarm', size);
}