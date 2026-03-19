/**
 * SignatureCanvas — reusable e-signature capture component.
 * Supports drawn signatures (mouse/touch) and typed (cursive font) mode.
 * Outputs a base64 PNG string via onChange callback.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Pencil, Type, RotateCcw } from 'lucide-react';

const CANVAS_W = 600;
const CANVAS_H = 200;

export default function SignatureCanvas({ onChange, signerName = '', darkMode = false }) {
  const canvasRef = useRef(null);
  const [mode, setMode] = useState('draw'); // draw | type
  const [typedName, setTypedName] = useState(signerName);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Colors based on theme
  const bg = darkMode ? '#1e293b' : '#ffffff';
  const stroke = darkMode ? '#f8fafc' : '#1e293b';
  const border = darkMode ? '#334155' : '#cbd5e1';

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // Baseline
    ctx.strokeStyle = darkMode ? '#475569' : '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(40, CANVAS_H - 40);
    ctx.lineTo(CANVAS_W - 40, CANVAS_H - 40);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [mode, bg, darkMode]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    if (e.touches && e.touches[0]) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  }, [stroke]);

  const draw = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  }, [isDrawing]);

  const endDraw = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    emitSignature();
  }, [isDrawing]);

  const emitSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onChange?.(canvas.toDataURL('image/png'), 'drawn');
    }
  };

  // Typed mode: render name as cursive on canvas
  useEffect(() => {
    if (mode !== 'type') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // Clear
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // Baseline
    ctx.strokeStyle = darkMode ? '#475569' : '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(40, CANVAS_H - 40);
    ctx.lineTo(CANVAS_W - 40, CANVAS_H - 40);
    ctx.stroke();
    ctx.setLineDash([]);
    // Name
    if (typedName.trim()) {
      ctx.fillStyle = stroke;
      ctx.font = 'italic 48px "Georgia", "Times New Roman", serif';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(typedName, 50, CANVAS_H - 50);
      onChange?.(canvas.toDataURL('image/png'), 'typed');
    } else {
      onChange?.(null, 'typed');
    }
  }, [typedName, mode, bg, stroke, darkMode, onChange]);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // Redraw baseline
    ctx.strokeStyle = darkMode ? '#475569' : '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(40, CANVAS_H - 40);
    ctx.lineTo(CANVAS_W - 40, CANVAS_H - 40);
    ctx.stroke();
    ctx.setLineDash([]);
    setHasDrawn(false);
    setTypedName('');
    onChange?.(null, mode);
  };

  const switchMode = (newMode) => {
    clear();
    setMode(newMode);
  };

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex gap-1">
        <button type="button" onClick={() => switchMode('draw')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px] transition-colors ${
            mode === 'draw'
              ? darkMode ? 'bg-amber-500 text-black' : 'bg-slate-900 text-white'
              : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
          }`}>
          <Pencil className="h-3 w-3" /> Draw
        </button>
        <button type="button" onClick={() => switchMode('type')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px] transition-colors ${
            mode === 'type'
              ? darkMode ? 'bg-amber-500 text-black' : 'bg-slate-900 text-white'
              : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
          }`}>
          <Type className="h-3 w-3" /> Type
        </button>
        <button type="button" onClick={clear}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px] transition-colors ml-auto ${
            darkMode ? 'text-slate-400 hover:text-amber-500' : 'text-slate-500 hover:text-slate-900'
          }`}>
          <RotateCcw className="h-3 w-3" /> Clear
        </button>
      </div>

      {/* Canvas */}
      {mode === 'draw' && (
        <canvas
          ref={canvasRef}
          className="w-full rounded-lg cursor-crosshair touch-none"
          style={{ border: `1px solid ${border}`, aspectRatio: `${CANVAS_W}/${CANVAS_H}`, background: bg }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      )}

      {/* Typed input */}
      {mode === 'type' && (
        <div className="space-y-2">
          <canvas
            ref={canvasRef}
            className="w-full rounded-lg"
            style={{ border: `1px solid ${border}`, aspectRatio: `${CANVAS_W}/${CANVAS_H}`, background: bg }}
          />
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Type your full name"
            className={`w-full rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px] ${
              darkMode
                ? 'bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500'
                : 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400'
            }`}
          />
        </div>
      )}

      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        {mode === 'draw' ? 'Draw your signature above using mouse or finger' : 'Type your name to generate a signature'}
      </p>
    </div>
  );
}
