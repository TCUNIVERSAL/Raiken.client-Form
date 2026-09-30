import React, { useCallback, useEffect, useRef, useState } from 'react';

type SignatureMode = 'draw' | 'upload';

interface SignaturePadProps {
  id: string;
  value: string;           // data:image/png;base64,… or ''
  error?: string;
  onChange: (dataUrl: string) => void;
}

/**
 * Signature pad with two modes:
 *  • Draw  — freehand canvas signature
 *  • Upload — upload a signature image (PNG, JPG, etc.)
 */
export const SignaturePad: React.FC<SignaturePadProps> = ({ id, value, error, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<SignatureMode>('draw');
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(Boolean(value));
  const [uploadedPreview, setUploadedPreview] = useState<string>('');
  const [uploadFileName, setUploadFileName] = useState('');
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // ─── Coordinate helpers ────────────────────────────────────────────────
  const getPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }, []);

  // ─── Resize canvas to fill its container ───────────────────────────────
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    drawGuide(ctx, w, h);
    // Restore existing signature image if there is one and we're in draw mode
    if (value && mode === 'draw' && hasStrokes) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, w, h);
      };
      img.src = value;
    }
  }, [value, mode, hasStrokes]);

  useEffect(() => {
    if (mode === 'draw') {
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, [resizeCanvas, mode]);

  // ─── Signature guide line and × mark ───────────────────────────────────
  function drawGuide(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.clearRect(0, 0, w, h);
    const lineY = h * 0.78;
    const padX = 24;
    ctx.strokeStyle = '#b7b6c4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, lineY);
    ctx.lineTo(w - padX, lineY);
    ctx.stroke();
    const xCenter = padX + 8;
    const xSize = 6;
    ctx.strokeStyle = '#8c8b9c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xCenter - xSize, lineY - xSize);
    ctx.lineTo(xCenter + xSize, lineY + xSize);
    ctx.moveTo(xCenter + xSize, lineY - xSize);
    ctx.lineTo(xCenter - xSize, lineY + xSize);
    ctx.stroke();
  }

  // ─── Draw strokes ─────────────────────────────────────────────────────
  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'draw') return;
    e.preventDefault();
    setDrawing(true);
    lastPoint.current = getPoint(e);
  }, [getPoint, mode]);

  const moveDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || !lastPoint.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pt = getPoint(e);
    ctx.strokeStyle = '#1c1b29';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPoint.current = pt;
    setHasStrokes(true);
  }, [drawing, getPoint]);

  const endDraw = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    lastPoint.current = null;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL('image/png'));
  }, [drawing, onChange]);

  useEffect(() => {
    const handleUp = () => { if (drawing) endDraw(); };
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [drawing, endDraw]);

  // ─── Upload mode ──────────────────────────────────────────────────────
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, etc.).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('The image is too large. Please use a file under 5 MB.');
      return;
    }
    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadedPreview(dataUrl);
      onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  // ─── Clear ─────────────────────────────────────────────────────────────
  const clear = useCallback(() => {
    if (mode === 'draw') {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawGuide(ctx, container.clientWidth, container.clientHeight);
    }
    setHasStrokes(false);
    setUploadedPreview('');
    setUploadFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onChange('');
  }, [onChange, mode]);

  // ─── Mode switch ──────────────────────────────────────────────────────
  const switchMode = useCallback((newMode: SignatureMode) => {
    clear();
    setMode(newMode);
  }, [clear]);

  const hasValue = mode === 'upload' ? Boolean(uploadedPreview) : hasStrokes;

  return (
    <div className={`rk-field rk-signature-field${error ? ' rk-invalid' : ''}`} id={id}>
      <p className="rk-question">
        Signature<span className="rk-req" aria-hidden="true">*</span>:
      </p>

      {/* Mode switcher tabs */}
      <div className="rk-signature-tabs" role="tablist" aria-label="Signature method">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'draw'}
          className={`rk-signature-tab${mode === 'draw' ? ' rk-signature-tab-active' : ''}`}
          onClick={() => switchMode('draw')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
          Draw
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'upload'}
          className={`rk-signature-tab${mode === 'upload' ? ' rk-signature-tab-active' : ''}`}
          onClick={() => switchMode('upload')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload
        </button>
      </div>

      {mode === 'draw' ? (
        /* ─── Draw mode: canvas ──────────────────────────────────── */
        <div className="rk-signature-pad" ref={containerRef}>
          <canvas
            ref={canvasRef}
            className="rk-signature-canvas"
            onMouseDown={startDraw}
            onMouseMove={moveDraw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={moveDraw}
            onTouchEnd={endDraw}
            role="img"
            aria-label="Signature drawing area. Use your mouse or finger to sign."
          />
          {!hasStrokes && (
            <div className="rk-signature-placeholder" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8c8b9c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </div>
          )}
        </div>
      ) : (
        /* ─── Upload mode: file picker + preview ─────────────────── */
        <div className="rk-signature-upload-area">
          {uploadedPreview ? (
            <div className="rk-signature-upload-preview">
              <img src={uploadedPreview} alt="Uploaded signature" className="rk-signature-upload-img" />
              <p className="rk-hint">{uploadFileName}</p>
            </div>
          ) : (
            <label className="rk-signature-upload-dropzone" htmlFor={`${id}-file`}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8c8b9c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="rk-signature-upload-text">Click to upload your signature</span>
              <span className="rk-hint">PNG, JPG or GIF — max 5 MB</span>
            </label>
          )}
          <input
            ref={fileInputRef}
            id={`${id}-file`}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="rk-signature-upload-input"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {hasValue && (
        <button type="button" className="rk-signature-clear" onClick={clear} aria-label="Clear signature">
          Clear signature
        </button>
      )}
      {error && <p className="rk-error" role="alert">{error}</p>}
    </div>
  );
};
