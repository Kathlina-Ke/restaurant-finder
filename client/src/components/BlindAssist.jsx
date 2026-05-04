import React, { useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import styles from './BlindAssist.module.css';

const SCAN_INTERVAL_MS = 2000;

const MANEUVER_ICON = (m = '') => {
  if (m.includes('left'))        return '↰';
  if (m.includes('right'))       return '↱';
  if (m.includes('uturn'))       return '↩';
  if (m.includes('roundabout'))  return '↻';
  return '↑';
};

export default function BlindAssist({ navState }) {
  // navState: { steps, currentStep, summary, destinationName } | null
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const intervalRef = useRef(null);

  const [isActive, setIsActive]       = useState(false);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState(null);
  const [scanning, setScanning]       = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);

  const speak = useCallback((text) => {
    if (!speechEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.1;
    window.speechSynthesis.speak(u);
  }, [speechEnabled]);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.6);

    setScanning(true);
    try {
      const { data } = await axios.post('/api/vision/detect-obstacles', { image: imageData });
      setResult(data);
      if (data.action) speak(data.action);
    } catch (err) {
      console.error('Vision error:', err);
    } finally {
      setScanning(false);
    }
  }, [speak]);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
      speak('Blind assist activated. Scanning for obstacles.');
      intervalRef.current = setInterval(captureAndAnalyze, SCAN_INTERVAL_MS);
    } catch (err) {
      if (err.name === 'NotAllowedError') setError('Camera access denied.');
      else if (err.name === 'NotFoundError') setError('No camera found on this device.');
      else setError(`Camera error: ${err.message}`);
    }
  };

  const stopCamera = () => {
    clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsActive(false);
    setResult(null);
    window.speechSynthesis?.cancel();
  };

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (isActive) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(captureAndAnalyze, SCAN_INTERVAL_MS);
    }
  }, [captureAndAnalyze, isActive]);

  // Auto-speak current nav step when it changes
  useEffect(() => {
    if (navState?.steps?.length && isActive) {
      const step = navState.steps[navState.currentStep];
      if (step) speak(`Navigation: ${step.instruction}`);
    }
  }, [navState?.currentStep]);

  const severityColor = { none: '#4caf50', low: '#8bc34a', medium: '#ff9800', high: '#f44336' };

  const currentNavStep = navState?.steps?.[navState.currentStep];

  return (
    <div className={styles.container}>

      {/* ── Navigation status bar ── */}
      {navState && (
        <div className={styles.navBar}>
          <div className={styles.navDest}>
            <span className={styles.navDestLabel}>Navigating to</span>
            <span className={styles.navDestName}>{navState.destinationName}</span>
          </div>
          {navState.summary && (
            <div className={styles.navSummary}>
              <span>📏 {navState.summary.distance}</span>
              <span>⏱ {navState.summary.duration}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Current step (big, easy to read) ── */}
      {currentNavStep && (
        <div className={styles.currentStep}>
          <span className={styles.currentStepIcon} aria-hidden="true">
            {MANEUVER_ICON(currentNavStep.maneuver)}
          </span>
          <div className={styles.currentStepBody}>
            <p className={styles.currentStepText}>{currentNavStep.instruction}</p>
            <p className={styles.currentStepDist}>{currentNavStep.distance}</p>
          </div>
          <button
            className={styles.speakStepBtn}
            onClick={() => speak(currentNavStep.instruction)}
            aria-label="Read step aloud"
          >🔊</button>
        </div>
      )}

      {/* ── Step list (compact) ── */}
      {navState?.steps?.length > 0 && (
        <div className={styles.stepList}>
          {navState.steps.map((s, i) => (
            <div
              key={i}
              className={`${styles.stepRow} ${i === navState.currentStep ? styles.stepRowActive : ''}`}
            >
              <span className={styles.stepRowIcon}>{MANEUVER_ICON(s.maneuver)}</span>
              <span className={styles.stepRowText}>{s.instruction}</span>
              <span className={styles.stepRowDist}>{s.distance}</span>
            </div>
          ))}
          <div className={styles.stepRow}>
            <span className={styles.stepRowIcon}>🏁</span>
            <span className={styles.stepRowText}>Arrive at {navState.destinationName}</span>
          </div>
        </div>
      )}

      {/* ── Camera controls ── */}
      <div className={styles.controls}>
        <button
          className={`${styles.toggleBtn} ${isActive ? styles.stopBtn : styles.startBtn}`}
          onClick={isActive ? stopCamera : startCamera}
          aria-label={isActive ? 'Stop obstacle detection' : 'Start obstacle detection'}
        >
          {isActive ? '⏹ Stop Camera' : '📷 Start Camera'}
        </button>
        <button
          className={`${styles.speechBtn} ${speechEnabled ? styles.speechOn : styles.speechOff}`}
          onClick={() => setSpeechEnabled(!speechEnabled)}
          aria-pressed={speechEnabled}
        >
          {speechEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      {error && <div className={styles.error} role="alert">⚠️ {error}</div>}

      {/* ── Camera feed ── */}
      <div className={styles.cameraWrapper}>
        <video ref={videoRef} className={styles.video} playsInline muted aria-label="Camera feed" />
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        {!isActive && (
          <div className={styles.cameraPlaceholder}>📷 Camera inactive</div>
        )}
        {scanning && (
          <div className={styles.scanningBadge} aria-live="polite">🔍 Scanning...</div>
        )}
      </div>

      {/* ── Obstacle result ── */}
      {result && (
        <div
          className={styles.result}
          style={{ borderColor: severityColor[result.severity] || '#ccc' }}
          role="status"
          aria-live="polite"
        >
          <div className={styles.resultHeader}>
            <span className={styles.severityDot} style={{ background: severityColor[result.severity] }} aria-hidden="true" />
            <span className={styles.severityLabel}>
              {result.hasObstacle ? '⚠️ Obstacle Detected' : '✅ Path Clear'}
            </span>
          </div>
          <p className={styles.action}>{result.action}</p>
          {result.obstacleType && <p className={styles.detail}>Type: {result.obstacleType}</p>}
          {result.distance     && <p className={styles.detail}>Distance: {result.distance}</p>}
        </div>
      )}
    </div>
  );
}
