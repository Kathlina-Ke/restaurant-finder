import React, { useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import styles from './BlindAssist.module.css';

const SCAN_INTERVAL_MS = 2000; // scan every 2 seconds

export default function BlindAssist() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const [isActive, setIsActive] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);

  // Speak text aloud using Web Speech API
  const speak = useCallback((text) => {
    if (!speechEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // cancel any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }, [speechEnabled]);

  // Capture a frame from the video and send to backend
  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Compress to JPEG at 60% quality to reduce payload size
    const imageData = canvas.toDataURL('image/jpeg', 0.6);

    setScanning(true);
    try {
      const { data } = await axios.post('/api/vision/detect-obstacles', { image: imageData });
      setResult(data);

      // Speak the action instruction
      if (data.action) {
        speak(data.action);
      }
    } catch (err) {
      console.error('Vision error:', err);
      // Don't spam errors — just log
    } finally {
      setScanning(false);
    }
  }, [speak]);

  // Start camera
  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // rear camera on mobile
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsActive(true);
      speak('Blind assist activated. Scanning for obstacles.');

      // Start periodic scanning
      intervalRef.current = setInterval(captureAndAnalyze, SCAN_INTERVAL_MS);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
    }
  };

  // Stop camera
  const stopCamera = () => {
    clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setResult(null);
    speak('Blind assist deactivated.');
    window.speechSynthesis.cancel();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Re-register interval when captureAndAnalyze changes
  useEffect(() => {
    if (isActive) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(captureAndAnalyze, SCAN_INTERVAL_MS);
    }
  }, [captureAndAnalyze, isActive]);

  const severityColor = {
    none: '#4caf50',
    low: '#8bc34a',
    medium: '#ff9800',
    high: '#f44336',
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>👁️ Blind Assist</h2>
        <p className={styles.subtitle}>
          AI-powered obstacle detection using your camera
        </p>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <button
          className={`${styles.toggleBtn} ${isActive ? styles.stopBtn : styles.startBtn}`}
          onClick={isActive ? stopCamera : startCamera}
          aria-label={isActive ? 'Stop blind assist' : 'Start blind assist'}
        >
          {isActive ? '⏹ Stop Assist' : '▶ Start Assist'}
        </button>

        <button
          className={`${styles.speechBtn} ${speechEnabled ? styles.speechOn : styles.speechOff}`}
          onClick={() => setSpeechEnabled(!speechEnabled)}
          aria-pressed={speechEnabled}
          aria-label={speechEnabled ? 'Mute voice guidance' : 'Enable voice guidance'}
        >
          {speechEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
        </button>
      </div>

      {error && (
        <div className={styles.error} role="alert">
          ⚠️ {error}
        </div>
      )}

      {/* Camera feed */}
      <div className={styles.cameraWrapper}>
        <video
          ref={videoRef}
          className={styles.video}
          playsInline
          muted
          aria-label="Camera feed for obstacle detection"
        />
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

        {!isActive && (
          <div className={styles.cameraPlaceholder} aria-hidden="true">
            📷 Camera inactive
          </div>
        )}

        {scanning && (
          <div className={styles.scanningBadge} aria-live="polite">
            🔍 Scanning...
          </div>
        )}
      </div>

      {/* Result display */}
      {result && (
        <div
          className={styles.result}
          style={{ borderColor: severityColor[result.severity] || '#ccc' }}
          role="status"
          aria-live="polite"
          aria-label={`Obstacle detection result: ${result.action}`}
        >
          <div className={styles.resultHeader}>
            <span
              className={styles.severityDot}
              style={{ background: severityColor[result.severity] }}
              aria-hidden="true"
            />
            <span className={styles.severityLabel}>
              {result.hasObstacle ? `⚠️ Obstacle Detected` : '✅ Path Clear'}
            </span>
          </div>

          <p className={styles.action}>{result.action}</p>

          {result.obstacleType && (
            <p className={styles.detail}>Type: {result.obstacleType}</p>
          )}
          {result.distance && (
            <p className={styles.detail}>Distance: {result.distance}</p>
          )}
        </div>
      )}

      {/* Instructions */}
      {!isActive && (
        <div className={styles.instructions}>
          <h3>How to use</h3>
          <ol>
            <li>Tap <strong>Start Assist</strong> and allow camera access</li>
            <li>Point your phone camera forward as you walk</li>
            <li>The AI will scan every 2 seconds and speak alerts</li>
            <li>Voice guidance will warn you of obstacles ahead</li>
          </ol>
          <p className={styles.note}>
            💡 Works best with good lighting. Keep your phone at chest height.
          </p>
        </div>
      )}
    </div>
  );
}
