import React, { useEffect } from "react";
import logo from "../assets/logo.png";
import "../styles/Splash.css";

/**
 * A full‑screen splash animation shown once when the app first loads.
 * After the animation completes the parent should unmount the component.
 */
export default function Splash({ onFinish }) {
  useEffect(() => {
    // compute final navbar logo position and expose as CSS vars
    const logoEl = document.querySelector('.app-navbar .logo');
    if (logoEl) {
      const rect = logoEl.getBoundingClientRect();
      document.documentElement.style.setProperty(
        '--splash-final-top',
        `${rect.top}px`
      );
      document.documentElement.style.setProperty(
        '--splash-final-left',
        `${rect.left}px`
      );
    }

    // total duration must cover the delay + animation + fade‑out buffer
    const TOTAL = 3000;
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, TOTAL);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="splash-screen">
      <img src={logo} alt="Teams & Tasks" className="splash-logo" />
    </div>
  );
}
