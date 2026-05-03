import React, { useState, useRef, useEffect } from 'react';
import BlindAssist from './BlindAssist';
import styles from './AccessibilityPanel.module.css';

export default function AccessibilityPanel({ onFontScale, onHighContrast, highContrast }) {
  const [open, setOpen] = useState(false);
  const [blindAssistOpen, setBlindAssistOpen] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const panelRef = useRef(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleFontScale = (scale) => {
    setFontScale(scale);
    onFontScale?.(scale);
    document.documentElement.style.fontSize = `${scale * 16}px`;
  };

  const handleHighContrast = () => {
    onHighContrast?.(!highContrast);
  };

  return (
    <>
      {/* Floating trigger button */}
      <div className={styles.wrapper} ref={panelRef}>
        <button
          className={`${styles.trigger} ${open ? styles.triggerActive : ''}`}
          onClick={() => setOpen(!open)}
          aria-label="Accessibility options"
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          ♿
        </button>

        {/* Dropdown panel */}
        {open && (
          <div
            className={styles.panel}
            role="dialog"
            aria-label="Accessibility settings"
          >
            <h3 className={styles.panelTitle}>Accessibility</h3>

            {/* Blind Assist */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>👁️</span>
                <div>
                  <p className={styles.sectionLabel}>Blind Assist</p>
                  <p className={styles.sectionDesc}>AI obstacle detection via camera</p>
                </div>
                <button
                  className={`${styles.toggle} ${blindAssistOpen ? styles.toggleOn : ''}`}
                  onClick={() => {
                    setBlindAssistOpen(!blindAssistOpen);
                    setOpen(false);
                  }}
                  aria-pressed={blindAssistOpen}
                >
                  {blindAssistOpen ? 'On' : 'Off'}
                </button>
              </div>
            </div>

            {/* High contrast */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>🌗</span>
                <div>
                  <p className={styles.sectionLabel}>High Contrast</p>
                  <p className={styles.sectionDesc}>Increase color contrast</p>
                </div>
                <button
                  className={`${styles.toggle} ${highContrast ? styles.toggleOn : ''}`}
                  onClick={handleHighContrast}
                  aria-pressed={highContrast}
                >
                  {highContrast ? 'On' : 'Off'}
                </button>
              </div>
            </div>

            {/* Font size */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>🔤</span>
                <div>
                  <p className={styles.sectionLabel}>Text Size</p>
                </div>
              </div>
              <div className={styles.fontButtons}>
                {[
                  { scale: 0.875, label: 'A', size: 13 },
                  { scale: 1,     label: 'A', size: 16 },
                  { scale: 1.25,  label: 'A', size: 20 },
                  { scale: 1.5,   label: 'A', size: 24 },
                ].map(({ scale, label, size }) => (
                  <button
                    key={scale}
                    className={`${styles.fontBtn} ${fontScale === scale ? styles.fontBtnActive : ''}`}
                    style={{ fontSize: size }}
                    onClick={() => handleFontScale(scale)}
                    aria-pressed={fontScale === scale}
                    aria-label={`Set text size to ${Math.round(scale * 100)}%`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Blind Assist overlay — shown on top of everything when active */}
      {blindAssistOpen && (
        <div className={styles.blindOverlay} role="dialog" aria-label="Blind assist active">
          <div className={styles.blindOverlayHeader}>
            <span>👁️ Blind Assist Active</span>
            <button
              className={styles.blindCloseBtn}
              onClick={() => setBlindAssistOpen(false)}
              aria-label="Close blind assist"
            >
              ✕
            </button>
          </div>
          <div className={styles.blindOverlayContent}>
            <BlindAssist />
          </div>
        </div>
      )}
    </>
  );
}
