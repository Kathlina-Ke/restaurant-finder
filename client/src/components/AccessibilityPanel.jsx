import React, { useState, useRef, useEffect } from 'react';
import BlindAssist from './BlindAssist';
import styles from './AccessibilityPanel.module.css';

export default function AccessibilityPanel({ onHighContrast, highContrast, onBlindAssistChange, navState }) {
  const [open, setOpen]                   = useState(false);
  const [blindAssistOn, setBlindAssistOn] = useState(false);
  const [fontScale, setFontScale] = useState('normal');
  const [showOverlay, setShowOverlay]     = useState(false);
  const panelRef = useRef(null);

  const isNavigating = !!navState; // only allow blind assist during navigation

  // If navigation ends while blind assist is on, close it
  useEffect(() => {
    if (!isNavigating && blindAssistOn) {
      setBlindAssistOn(false);
      setShowOverlay(false);
      onBlindAssistChange?.(false);
    }
  }, [isNavigating]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleBlindAssist = () => {
    if (!isNavigating) return; // guard
    const next = !blindAssistOn;
    setBlindAssistOn(next);
    onBlindAssistChange?.(next);
    if (next) setShowOverlay(true);
    setOpen(false);
  };

  const closeOverlay = () => {
    setShowOverlay(false);
    setBlindAssistOn(false);
    onBlindAssistChange?.(false);
  };

  const FONT_SCALES = [
    { scale: 'small',  label: 'A', size: 12, aria: 'Small' },
    { scale: 'normal', label: 'A', size: 15, aria: 'Normal' },
    { scale: 'large',  label: 'A', size: 18, aria: 'Large' },
    { scale: 'xl',     label: 'A', size: 22, aria: 'Extra Large' },
  ];

  const handleFontScale = (scale) => {
    setFontScale(scale);
    document.body.setAttribute('data-font-scale', scale);
  };

  return (
    <>
      <div className={styles.wrapper} ref={panelRef}>
        {/* Trigger */}
        <button
          className={`${styles.trigger} ${open ? styles.triggerActive : ''} ${blindAssistOn ? styles.triggerEnabled : ''}`}
          onClick={() => setOpen(!open)}
          aria-label="Accessibility options"
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          ♿
        </button>

        {/* Dropdown */}
        {open && (
          <div className={styles.panel} role="dialog" aria-label="Accessibility settings">
            <h3 className={styles.panelTitle}>Accessibility</h3>

            {/* Blind Assist */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>👁️</span>
                <div>
                  <p className={styles.sectionLabel}>Blind Assist</p>
                  <p className={styles.sectionDesc}>
                    {isNavigating
                      ? 'AI obstacle detection via camera'
                      : 'Start navigation first to use'}
                  </p>
                </div>
                <button
                  className={`${styles.toggle} ${blindAssistOn ? styles.toggleOn : ''} ${!isNavigating ? styles.toggleDisabled : ''}`}
                  onClick={toggleBlindAssist}
                  disabled={!isNavigating}
                  aria-pressed={blindAssistOn}
                  aria-disabled={!isNavigating}
                >
                  {blindAssistOn ? 'On' : 'Off'}
                </button>
              </div>
              {!isNavigating && (
                <p className={styles.disabledHint}>🧭 Navigate to a restaurant to use</p>
              )}
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
                  onClick={() => onHighContrast?.(!highContrast)}
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
                <div><p className={styles.sectionLabel}>Text Size</p></div>
              </div>
              <div className={styles.fontButtons}>
                {FONT_SCALES.map(({ scale, label, size, aria }) => (
                  <button
                    key={scale}
                    className={`${styles.fontBtn} ${fontScale === scale ? styles.fontBtnActive : ''}`}
                    style={{ fontSize: size }}
                    onClick={() => handleFontScale(scale)}
                    aria-pressed={fontScale === scale}
                    aria-label={`Text size: ${aria}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full-screen Blind Assist overlay — passes navState for step display */}
      {showOverlay && (
        <div className={styles.blindOverlay} role="dialog" aria-label="Blind assist active">
          <div className={styles.blindOverlayHeader}>
            <span>👁️ Blind Assist</span>
            <button className={styles.blindCloseBtn} onClick={closeOverlay} aria-label="Close blind assist">✕</button>
          </div>
          <div className={styles.blindOverlayContent}>
            <BlindAssist navState={navState} />
          </div>
        </div>
      )}
    </>
  );
}
