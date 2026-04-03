/**
 * DevLab — the gardener's shed. Admin-only workspace on the spinner.
 * First tool: Physics Tuner — real-time slider control of SpaceSpinner spring physics.
 * Future tools: Theme Editor, Entity Inspector, Organism Health.
 */
import React, { useState, useCallback, useRef } from 'react';
import { RotateCcw, Copy, Check, FlaskConical, Zap } from 'lucide-react';
import { DEFAULT_PHYSICS, setPhysicsOverride, clearPhysicsOverrides } from './SpaceSpinner';

const THEMES = [
  { key: 'dark', label: 'Gold Standard', accent: 'hsl(var(--primary))' },
  { key: 'light', label: 'Cloud', accent: '#b45309' },
  { key: 'fallout', label: 'Fallout', accent: '#00ff41' },
];

const SLIDERS = [
  { key: 'stiffness', label: 'Stiffness', min: 30, max: 500, step: 5, desc: 'Higher = snappier snap-to-position' },
  { key: 'damping', label: 'Damping', min: 1, max: 50, step: 1, desc: 'Lower = more bounce/overshoot' },
  { key: 'mass', label: 'Mass', min: 0.3, max: 4.0, step: 0.1, desc: 'Higher = heavier, slower to move' },
  { key: 'friction', label: 'Friction', min: 20, max: 400, step: 5, desc: 'Higher = flicks travel farther' },
];

function dampingRatio(s, d, m) {
  return d / (2 * Math.sqrt(s * m));
}

function dampingLabel(ratio) {
  if (ratio < 0.3) return { text: 'very bouncy', color: '#ef4444' };
  if (ratio < 0.5) return { text: 'bouncy', color: '#f59e0b' };
  if (ratio < 0.8) return { text: 'smooth', color: '#22c55e' };
  if (ratio < 1.05) return { text: 'critically damped', color: '#3b82f6' };
  return { text: 'overdamped', color: '#8b5cf6' };
}

function PhysicsSliderSet({ themeKey, label, accent, values, onChange, onReset, onTestSpin }) {
  const ratio = dampingRatio(values.stiffness, values.damping, values.mass);
  const ratioInfo = dampingLabel(ratio);

  return (
    <div style={{
      background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
      borderRadius: 10, padding: 16, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, color: accent }}>{label}</span>
          <span style={{
            marginLeft: 10, fontSize: 11, padding: '2px 8px', borderRadius: 8,
            background: ratioInfo.color + '22', color: ratioInfo.color,
          }}>
            {ratioInfo.text} ({ratio.toFixed(2)})
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onTestSpin} title="Test spin"
            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid hsl(var(--border))',
              background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap style={{ width: 12, height: 12, color: accent }} strokeWidth={2} />
          </button>
          <button onClick={onReset} title="Reset to defaults"
            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid hsl(var(--border))',
              background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RotateCcw style={{ width: 12, height: 12, color: 'hsl(var(--muted-foreground))' }} strokeWidth={2} />
          </button>
        </div>
      </div>

      {SLIDERS.map(({ key, label: sliderLabel, min, max, step, desc }) => (
        <div key={key} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{sliderLabel}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}>
              {typeof values[key] === 'number' ? (key === 'mass' ? values[key].toFixed(1) : values[key]) : '—'}
            </span>
          </div>
          <input
            type="range"
            min={min} max={max} step={step}
            value={values[key]}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onChange({ ...values, [key]: v });
            }}
            style={{
              width: '100%', height: 4, appearance: 'none', background: 'hsl(var(--border))',
              borderRadius: 2, outline: 'none', cursor: 'pointer',
              accentColor: accent,
            }}
          />
          <div style={{ fontSize: 9, color: 'hsl(var(--muted-foreground) / 0.5)', marginTop: 1 }}>{desc}</div>
        </div>
      ))}
    </div>
  );
}

export default function DevLab({ onTestSpin }) {
  // Initialize with defaults
  const [values, setValues] = useState(() => ({
    dark: { ...DEFAULT_PHYSICS.dark },
    light: { ...DEFAULT_PHYSICS.light },
    fallout: { ...DEFAULT_PHYSICS.fallout },
  }));
  const [copied, setCopied] = useState(false);

  const handleChange = useCallback((themeKey, newValues) => {
    setValues((prev) => ({ ...prev, [themeKey]: newValues }));
    setPhysicsOverride(themeKey, newValues);
  }, []);

  const handleReset = useCallback((themeKey) => {
    const defaults = { ...DEFAULT_PHYSICS[themeKey] };
    setValues((prev) => ({ ...prev, [themeKey]: defaults }));
    setPhysicsOverride(themeKey, null);
  }, []);

  const handleResetAll = useCallback(() => {
    setValues({
      dark: { ...DEFAULT_PHYSICS.dark },
      light: { ...DEFAULT_PHYSICS.light },
      fallout: { ...DEFAULT_PHYSICS.fallout },
    });
    clearPhysicsOverrides();
  }, []);

  const handleCopy = useCallback(() => {
    const output = `const THEME_PHYSICS = ${JSON.stringify({
      fallout: values.fallout,
      dark: values.dark,
      light: values.light,
    }, null, 2)};`;
    navigator.clipboard?.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [values]);

  return (
    <div style={{ maxWidth: 480 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <FlaskConical style={{ width: 20, height: 20, color: 'hsl(var(--primary))' }} strokeWidth={1.5} />
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>Physics Tuner</h2>
          <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', margin: 0 }}>
            Drag sliders, flick the spinner above, feel the difference
          </p>
        </div>
      </div>

      {/* Per-theme slider sets */}
      {THEMES.map(({ key, label, accent }) => (
        <PhysicsSliderSet
          key={key}
          themeKey={key}
          label={label}
          accent={accent}
          values={values[key]}
          onChange={(v) => handleChange(key, v)}
          onReset={() => handleReset(key)}
          onTestSpin={() => onTestSpin?.()}
        />
      ))}

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={handleCopy}
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 8,
            background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))',
            border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {copied ? <Check style={{ width: 14, height: 14 }} strokeWidth={2} /> : <Copy style={{ width: 14, height: 14 }} strokeWidth={2} />}
          {copied ? 'Copied!' : 'Copy values'}
        </button>
        <button
          onClick={handleResetAll}
          style={{
            padding: '10px 16px', borderRadius: 8,
            background: 'transparent', color: 'hsl(var(--muted-foreground))',
            border: '1px solid hsl(var(--border))', cursor: 'pointer', fontSize: 13,
          }}
        >
          Reset all
        </button>
      </div>
    </div>
  );
}
