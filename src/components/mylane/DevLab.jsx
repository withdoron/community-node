/**
 * DevLab — the gardener's shed. Admin-only workspace on the spinner.
 * First tool: Physics Tuner — mass + friction sliders for spinner feel.
 */
import React, { useState, useCallback } from 'react';
import { RotateCcw, Copy, Check, FlaskConical, Zap } from 'lucide-react';
import { DEFAULT_PHYSICS, setPhysicsOverride, clearPhysicsOverrides } from './SpaceSpinner';

const THEMES = [
  { key: 'dark', label: 'Gold Standard', accent: 'hsl(var(--primary))' },
  { key: 'light', label: 'Cloud', accent: '#b45309' },
  { key: 'fallout', label: 'Fallout', accent: '#00ff41' },
];

const SLIDERS = [
  { key: 'mass', label: 'Mass', min: 0.3, max: 3.0, step: 0.1, fmt: (v) => v.toFixed(1), desc: 'Higher = harder to get moving, carries longer' },
  { key: 'friction', label: 'Friction', min: 0.01, max: 0.15, step: 0.005, fmt: (v) => v.toFixed(3), desc: 'Higher = stops faster' },
];

// Estimate how many spaces a standard flick (1.0 px/ms) travels with given physics
function estimateTravel(mass, friction) {
  let vel = (1.0 * 16) / (74 * mass); // items/frame from a 1 px/ms flick
  let pos = 0;
  for (let i = 0; i < 300; i++) {
    vel *= (1 - friction);
    pos += vel;
    if (Math.abs(vel) < 0.01) break;
  }
  return Math.abs(Math.round(pos));
}

function PhysicsSliderSet({ label, accent, values, onChange, onReset, onTestSpin }) {
  const travel = estimateTravel(values.mass, values.friction);

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
            background: 'hsl(var(--muted) / 0.5)', color: 'hsl(var(--muted-foreground))',
          }}>
            ~{travel} spaces per flick
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

      {SLIDERS.map(({ key, label: sliderLabel, min, max, step, fmt, desc }) => (
        <div key={key} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{sliderLabel}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(values[key])}
            </span>
          </div>
          <input
            type="range" min={min} max={max} step={step} value={values[key]}
            onChange={(e) => onChange({ ...values, [key]: parseFloat(e.target.value) })}
            style={{ width: '100%', height: 4, appearance: 'none', background: 'hsl(var(--border))',
              borderRadius: 2, outline: 'none', cursor: 'pointer', accentColor: accent }}
          />
          <div style={{ fontSize: 9, color: 'hsl(var(--muted-foreground) / 0.5)', marginTop: 1 }}>{desc}</div>
        </div>
      ))}
    </div>
  );
}

export default function DevLab({ onTestSpin }) {
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
    const output = `const DEFAULT_PHYSICS = ${JSON.stringify({
      dark: values.dark, light: values.light, fallout: values.fallout,
    }, null, 2)};`;
    navigator.clipboard?.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [values]);

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <FlaskConical style={{ width: 20, height: 20, color: 'hsl(var(--primary))' }} strokeWidth={1.5} />
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>Physics Tuner</h2>
          <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', margin: 0 }}>
            Mass + friction. No spring, no bounce.
          </p>
        </div>
      </div>

      {THEMES.map(({ key, label, accent }) => (
        <PhysicsSliderSet
          key={key}
          label={label}
          accent={accent}
          values={values[key]}
          onChange={(v) => handleChange(key, v)}
          onReset={() => handleReset(key)}
          onTestSpin={() => onTestSpin?.()}
        />
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={handleCopy} style={{
          flex: 1, padding: '10px 16px', borderRadius: 8,
          background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))',
          border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          {copied ? <Check style={{ width: 14, height: 14 }} strokeWidth={2} /> : <Copy style={{ width: 14, height: 14 }} strokeWidth={2} />}
          {copied ? 'Copied!' : 'Copy values'}
        </button>
        <button onClick={handleResetAll} style={{
          padding: '10px 16px', borderRadius: 8,
          background: 'transparent', color: 'hsl(var(--muted-foreground))',
          border: '1px solid hsl(var(--border))', cursor: 'pointer', fontSize: 13,
        }}>Reset all</button>
      </div>
    </div>
  );
}
