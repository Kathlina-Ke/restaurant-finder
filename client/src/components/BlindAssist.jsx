import React, { useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import styles from './BlindAssist.module.css';

const SCAN_INTERVAL_MS = 2500;

const SEVERITY_COLOR = {
  none:   '#4caf50',
  low:    '#8bc34a',
  medium: '#ff9800',
  high:   '#f44336',
};

const SEVERITY_LABEL = {
  none:   '✅ Path Clear',
  low:    '⚠️ Minor Obstacle',
  medium: '⚠️ Caution',
  high:   '🚨 Danger',
};

// ─── Mode tabs ────────────────────────────────────────────────────────────────
const MODES = [
  { id: 'obstacle', label: '🔍 Obstacle Scan', desc: 'Continuous real-time scanning' },
  { id: 'scene',    label: '🌐 Scene Describe', desc: 'Full scene description on demand' },
];

export default function BlindAssist() {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const intervalRef = useRef(null);

  const [mode, setMode]               = useState('obstacle');
  const [isActive, setIsActive]       = useState(false);
  const [result, setResult]           = useState(null);
  const [sceneResult, setSceneResult] = useState(null);
  const [error, setError]             = useState(null);
  const [scanning, setScanning]       = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [lastSpoken, setLastSpoken]   = useState('');
  const [scanCount, setScanCount]     = useState(0);
  const [history, setHistory]         = useState([]); // last 5 obstacle results

  // ── Speech ──────────────────────────────────────────────────────────────────
  const speak = useCallback((text, force = false) => {
    if (!speechEnabled || !window.speechSynthesis) return;
    // Avoid repeating the exact same message back-to-back
    if (!force && text === lastSpoken) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate  = 1.1;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
    setLastSpoken(text);
  }, [speechEnabled, lastSpoken]);

  // ── Capture frame from video ─────────────────────────────────────────────────
  const captureFrame = useCallback((quality = 0.6) => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return null;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', quality);
  }, []);

  // ── Obstacle scan (called on interval) ──────────────────────────────────────
  const scanObstacle = useCallback(async () => {
    const imageData = captureFrame(0.6);
    if (!imageData) return;

    setScanning(true);
    try {
      const { data } = await axios.post('/api/vision/detect-obstacles', { image: imageData });
      setResult(data);
      setScanCount((c) => c + 1);

      // Add to history (keep last 5)
      setHistory((prev) => [
        { ...data, ts: new Date().toLocaleTimeString() },
        ...prev.slice(0, 4),
      ]);

      // Speak only medium/high severity, or "path clear" every 5 scans
      if (data.severity === 'high' || data.severity === 'medium') {
        speak(data.action, true);
      } else if (data.severity === 'low') {
        speak(data.action);
      } else if (scanCount > 0 && scanCount % 5 === 0) {
        speak('Path is clear.');
      }
    } catch {
      // Silent fail — don't interrupt the user with error speech
    } finally {
      setScanning(false);
    }
  }, [captureFrame, speak, scanCount]);

  // ── Scene description (manual trigger) ──────────────────────────────────────
  const describeScene = useCallback(async () => {
    const imageData = captureFrame(0.85); // higher quality for scene description
    if (!imageData) {
      setError('Camera not active. Start the camera first.');
      return;
    }

    setScanning(true);
    setSceneResult(null);
    speak('Analyzing scene, please wait.', true);

    try {
      const { data } = await axios.post('/api/vision/describe-scene', { image: imageData });
      setSceneResult(data);

      // Speak full description
      const toSpeak = `${data.description} ${data.suggestions ?? ''}`.trim();
      speak(toSpeak, true);
    } catch {
      setError('Failed to describe scene. Check your connection.');
    } finally {
      setScanning(false);
    }
  }, [captureFrame, speak]);

  // ── Start camera ─────────────────────────────────────────────────────────────
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
      setResult(null);
      setSceneResult(null);
      setScanCount(0);
      speak('Blind assist activated.', true);

      if (mode === 'obstacle') {
        intervalRef.current = setInterval(scanObstacle, SCAN_INTERVAL_MS);
      }
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

  // ── Stop camera ───────────────────────────────────────────────────────────────
  const stopCamera = () => {
    clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsActive(false);
    setResult(null);
    setSceneResult(null);
    speak('Blind assist deactivated.', true);
    window.speechSynthesis.cancel();
  };

  // ── Re-register interval when mode or scanObstacle changes ───────────────────
  useEffect(() => {
    if (!isActive) return;
    clearInterval(intervalRef.current);
    if (mode === 'obstacle') {
      intervalRef.current = setInterval(scanObstacle, SCAN_INTERVAL_MS);
    }
    return () => clearInterval(intervalRef.current);
  }, [mode, isActive, scanObstacle]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);

  return (
    <div className={styles.container}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <h2 className={styles.title}>👁️ Blind Assist</h2>
        <p className={styles.subtitle}>AI-powered navigation assistance</p>
      </div>

      {/* ── Mode selector ── */}
      <div className={styles.modeRow} role="tablist" aria-label="Assist mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            className={`${styles.modeBtn} ${mode === m.id ? styles.modeBtnActive : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ── Controls ── */}
      <div className={styles.controls}>
        <button
          className={`${styles.toggleBtn} ${isActive ? styles.stopBtn : styles.startBtn}`}
          onClick={isActive ? stopCamera : startCamera}
          aria-label={isActive ? 'Stop blind assist' : 'Start blind assist'}
        >
          {isActive ? '⏹ Stop' : '▶ Start Camera'}
        </button>

        {mode === 'scene' && isActive && (
          <button
            className={styles.describeBtn}
            onClick={describeScene}
            disabled={scanning}
            aria-label="Describe current scene"
          >
            {scanning ? '⏳ Analyzing...' : '📸 Describe Scene'}
          </button>
        )}

        <button
          className={`${styles.speechBtn} ${speechEnabled ? styles.speechOn : styles.speechOff}`}
          onClick={() => setSpeechEnabled((v) => !v)}
          aria-pressed={speechEnabled}
          aria-label={speechEnabled ? 'Mute voice guidance' : 'Enable voice guidance'}
        >
          {speechEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      {error && (
        <div className={styles.error} role="alert">⚠️ {error}</div>
      )}

      {/* ── Camera feed ── */}
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

        {/* Severity overlay bar at top of camera */}
        {isActive && result && mode === 'obstacle' && (
          <div
            className={styles.severityBar}
            style={{ background: SEVERITY_COLOR[result.severity] ?? '#ccc' }}
            aria-hidden="true"
          />
        )}

        {scanning && (
          <div className={styles.scanningBadge} aria-live="polite">
            {mode === 'obstacle' ? '🔍 Scanning...' : '🌐 Analyzing...'}
          </div>
        )}

        {isActive && mode === 'obstacle' && (
          <div className={styles.scanCounter} aria-hidden="true">
            Scan #{scanCount}
          </div>
        )}
      </div>

      {/* ── Obstacle result ── */}
      {mode === 'obstacle' && result && (
        <div
          className={styles.result}
          style={{ borderColor: SEVERITY_COLOR[result.severity] ?? '#ccc' }}
          role="status"
          aria-live="polite"
          aria-label={`Obstacle detection: ${result.action}`}
        >
          <div className={styles.resultHeader}>
            <span
              className={styles.severityDot}
              style={{ background: SEVERITY_COLOR[result.severity] }}
              aria-hidden="true"
            />
            <span className={styles.severityLabel}>
              {SEVERITY_LABEL[result.severity] ?? result.severity}
            </span>
          </div>

          <p className={styles.action}>{result.action}</p>

          <div className={styles.resultMeta}>
            {result.obstacleType && (
              <span className={styles.metaTag}>🧱 {result.obstacleType}</span>
            )}
            {result.distance && (
              <span className={styles.metaTag}>📏 {result.distance}</span>
            )}
          </div>
        </div>
      )}

      {/* ── Scene description result ── */}
      {mode === 'scene' && sceneResult && (
        <div className={styles.sceneResult} role="status" aria-live="polite">
          <h3 className={styles.sceneTitle}>🌐 Scene Description</h3>
          <p className={styles.sceneDesc}>{sceneResult.description}</p>

          {sceneResult.landmarks?.length > 0 && (
            <div className={styles.landmarks}>
              <p className={styles.landmarksLabel}>Landmarks:</p>
              <ul className={styles.landmarkList}>
                {sceneResult.landmarks.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}

          {sceneResult.suggestions && (
            <div className={styles.suggestion}>
              💡 {sceneResult.suggestions}
            </div>
          )}

          <button
            className={styles.rereadBtn}
            onClick={() => speak(`${sceneResult.description} ${sceneResult.suggestions ?? ''}`, true)}
            aria-label="Read scene description aloud again"
          >
            🔊 Read Again
          </button>
        </div>
      )}

      {/* ── Scan history (obstacle mode) ── */}
      {mode === 'obstacle' && history.length > 0 && (
        <details className={styles.history}>
          <summary className={styles.historySummary}>
            🕐 Recent Scans ({history.length})
          </summary>
          <ul className={styles.historyList}>
            {history.map((h, i) => (
              <li key={i} className={styles.historyItem}>
                <span
                  className={styles.historyDot}
                  style={{ background: SEVERITY_COLOR[h.severity] }}
                  aria-hidden="true"
                />
                <span className={styles.historyText}>{h.action}</span>
                <span className={styles.historyTime}>{h.ts}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* ── Instructions (when inactive) ── */}
      {!isActive && (
        <div className={styles.instructions}>
          {mode === 'obstacle' ? (
            <>
              <h3>🔍 Obstacle Scan Mode</h3>
              <ol>
                <li>Tap <strong>Start Camera</strong> and allow camera access</li>
                <li>Point your phone camera forward as you walk</li>
                <li>AI scans every 2.5 seconds and speaks alerts</li>
                <li>Red bar = danger · Orange = caution · Green = clear</li>
              </ol>
            </>
          ) : (
            <>
              <h3>🌐 Scene Describe Mode</h3>
              <ol>
                <li>Tap <strong>Start Camera</strong> to activate</li>
                <li>Point camera at the scene you want described</li>
                <li>Tap <strong>Describe Scene</strong> for a full AI description</li>
                <li>The description will be read aloud automatically</li>
              </ol>
            </>
          )}
          <p className={styles.note}>
            💡 Works best with good lighting. Keep your phone at chest height.
          </p>
        </div>
      )}
    </div>
  );
}
