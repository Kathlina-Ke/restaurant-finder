import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import styles from './AllergyWarning.module.css';

// Cache results so we don't re-call for the same restaurant + allergen combo
const cache = new Map();

function cacheKey(types, allergens) {
  return `${types.sort().join(',')}|${allergens.sort().join(',')}`;
}

export default function AllergyWarning({ cuisineTypes = [], allergens = [] }) {
  const key = cacheKey(cuisineTypes, allergens);

  // Initialise from cache synchronously so there's no flash when remounting
  const [result, setResult] = useState(() => cache.get(key) ?? null);
  const [open, setOpen]     = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!allergens.length || !cuisineTypes.length) {
      setResult(null);
      return;
    }

    const k = cacheKey(cuisineTypes, allergens);
    if (cache.has(k)) {
      setResult(cache.get(k));
      return;
    }

    // Debounce slightly so rapid re-renders don't spam the API
    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.post('/api/allergy/check', {
          cuisineTypes,
          allergens,
        });
        cache.set(k, data);
        if (mountedRef.current) setResult(data);
      } catch {
        // silently fail — don't block the UI
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [cuisineTypes.join(','), allergens.join(',')]);

  if (!result || result.risk === 'none') return null;

  const isHigh = result.risk === 'high';

  return (
    <div className={styles.wrapper}>
      <button
        className={`${styles.badge} ${isHigh ? styles.badgeHigh : styles.badgeLow}`}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        aria-label={`Allergy warning: ${result.warnings.join('. ')}`}
        aria-expanded={open}
      >
        {isHigh ? '⚠️' : '⚡'} Allergy
      </button>

      {open && (
        <div
          className={styles.tooltip}
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
        >
          <p className={styles.tooltipTitle}>
            {isHigh ? '⚠️ High Risk' : '⚡ Possible Risk'}
          </p>
          <ul className={styles.tooltipList}>
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <button
            className={styles.tooltipClose}
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
