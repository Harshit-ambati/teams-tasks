import React, { useEffect } from 'react';
import logo from '../assets/logo.png';
import '../styles/Splash.css';

export default function Splash({ onComplete }) {
  useEffect(() => {
    let timer;

    const measureTarget = () => {
      const logoEl = document.querySelector('[data-splash-target="logo"]');
      if (!logoEl) return;

      const rect = logoEl.getBoundingClientRect();
      const targetCenterX = rect.left + rect.width / 2;
      const targetCenterY = rect.top + rect.height / 2;
      const viewportCenterX = window.innerWidth / 2;
      const viewportCenterY = window.innerHeight / 2;

      const deltaX = targetCenterX - viewportCenterX;
      const deltaY = targetCenterY - viewportCenterY;

      document.documentElement.style.setProperty('--splash-dx', `${deltaX}px`);
      document.documentElement.style.setProperty('--splash-dy', `${deltaY}px`);
      document.documentElement.style.setProperty('--splash-target-width', `${rect.width}px`);
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(measureTarget);
    });

    timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 2600);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="splash-screen">
      <img src={logo} alt="Teams & Tasks" className="splash-logo" />
      <div className="splash-vignette" />
    </div>
  );
}
