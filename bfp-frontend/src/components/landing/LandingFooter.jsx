import React from 'react';
import '../landing/landing.css';
import img39 from './images/v3_39.png';
import img43 from './images/v3_43.png';

export default function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="footer-inner">
        <div className="footer-left">
          <div style={{display:'flex', gap:12, alignItems:'center'}}>
            <img src={img39} alt="icon" />
            <img src={img43} alt="icon" />
          </div>
        </div>
        <div className="footer-right">
          <div style={{fontWeight:700, fontSize:14}}>BFP Mandaluyong</div>
          <div style={{fontSize:12, marginTop:4}}>
            <span style={{color:'var(--accent-yellow)'}}>bfpncrmandaluyong@gmail.com</span> &nbsp;•&nbsp; <a href="https://www.facebook.com/MANDALUYONGFIRE" target="_blank" rel="noreferrer">Facebook</a> &nbsp;•&nbsp; <a href="https://ncr.bfp.gov.ph/mandaluyong-2025/" target="_blank" rel="noreferrer">NCR BFP</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
 
