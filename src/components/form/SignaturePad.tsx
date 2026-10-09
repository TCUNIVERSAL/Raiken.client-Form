import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorText, LabelText, TickIcon } from './fields.js';

type SignatureMode = 'draw' | 'upload';

interface SignaturePadProps {
  id: string;
  value: string;           // data:image/png;base64,… or ''
  error?: string;
  onChange: (dataUrl: string) => void;
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Uploaded signature images are scaled down to fit this box before they are saved. */
const MAX_IMAGE_WIDTH = 900;
const MAX_IMAGE_HEIGHT = 300;

/** Re-draws an uploaded image at a small size so the saved signature stays a few KB, not MB. */
function shrinkImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_IMAGE_WIDTH / img.width, MAX_IMAGE_HEIGHT / img.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not available'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Unreadable image'));
    img.src = dataUrl;
  });
}

/**
 * Empties the drawing surface. The "×" and signing line are drawn by CSS underneath the
 * canvas, so they are never saved as part of the signature image.
 */
function drawGuide(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
}

/**
 * Signature with two modes:
 *  • Draw   — sign with a mouse, finger or stylus
 *  • Upload — use an image of an existing signature
 * Either way the result is stored as a PNG data URL in the declaration.
 */
export const SignaturePad: React.FC<SignaturePadProps> = ({ id, value, error, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawingRef = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const [mode, setMode] = useState<SignatureMode>('draw');
  const [uploadError, setUploadError] = useState('');
  const [processing, setProcessing] = useState(false);

  // ─── Canvas sizing (sharp on high-DPI screens; drawing uses CSS pixels) ────
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawGuide(ctx, w, h);
    // Keep an existing signature visible after a resize or a page reload
    const saved = valueRef.current;
    if (saved) {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(w / img.width, h / img.height, 1);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      };
      img.src = saved;
    }
  }, []);

  useEffect(() => {
    if (mode !== 'draw') return;
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas, mode]);

  const pointFrom = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // ─── Drawing ────────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    try {
      // Keeps the stroke going if the finger slides outside the box
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // The pointer is no longer active — drawing still works without capture
    }
    drawingRef.current = true;
    const pt = pointFrom(e);
    lastPoint.current = pt;
    // A tap leaves a dot
    const ctx = e.currentTarget.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#172033';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastPoint.current) return;
    e.preventDefault();
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const pt = pointFrom(e);
    ctx.strokeStyle = '#172033';
    ctx.lineWidth = e.pointerType === 'pen' && e.pressure ? 1.4 + e.pressure * 1.6 : 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPoint.current = pt;
  };

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPoint.current = null;
    onChange(e.currentTarget.toDataURL('image/png'));
  };

  // ─── Upload ─────────────────────────────────────────────────────────────
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadError('');
    if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
      setUploadError('Please choose a PNG or JPG image of your signature.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('This image is larger than 5 MB. Please choose a smaller image.');
      return;
    }
    setProcessing(true);
    try {
      const raw = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      onChange(await shrinkImage(raw));
    } catch {
      setUploadError('This image could not be read. Please try a different file.');
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Clear / switch ─────────────────────────────────────────────────────
  const clear = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && container) drawGuide(ctx, container.clientWidth, container.clientHeight);
    setUploadError('');
    onChange('');
  };

  const switchMode = (next: SignatureMode) => {
    if (next === mode) return;
    if (value) onChange('');
    setUploadError('');
    setMode(next);
  };

  const describedBy = [`${id}-instructions`, error ? `${id}-error` : ''].filter(Boolean).join(' ');

  return (
    <div className={`rk-field rk-signature${error ? ' rk-invalid' : ''}`} id={id} tabIndex={-1}>
      <div className="rk-signature-head">
        <p className="rk-label" id={`${id}-label`}><LabelText label="Signature" required /></p>
        <div className="rk-segmented" role="group" aria-label="How would you like to sign?">
          <button type="button" className="rk-segment" aria-pressed={mode === 'draw'} onClick={() => switchMode('draw')}>
            Draw
          </button>
          <button type="button" className="rk-segment" aria-pressed={mode === 'upload'} onClick={() => switchMode('upload')}>
            Upload image
          </button>
        </div>
      </div>

      {mode === 'draw' ? (
        <>
          <p className="rk-hint" id={`${id}-instructions`}>
            Sign in the box with your finger or mouse.
          </p>
          <div className="rk-signature-pad" ref={containerRef}>
            <span className="rk-signature-guide" aria-hidden="true">
              {!value && <span className="rk-signature-placeholder">Sign here</span>}
              <span className="rk-signature-x">×</span>
            </span>
            <canvas
              ref={canvasRef}
              className="rk-signature-canvas"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
              role="img"
              aria-labelledby={`${id}-label`}
              aria-describedby={describedBy}
            />
          </div>
        </>
      ) : (
        <>
          <p className="rk-hint" id={`${id}-instructions`}>
            A photo of your signature on white paper (PNG or JPG).
          </p>
          <input
            ref={fileInputRef}
            id={`${id}-file`}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="rk-file-input"
            tabIndex={-1}
            aria-hidden="true"
            onChange={e => void handleFile(e.target.files?.[0])}
          />
          {value ? (
            <div className="rk-signature-preview">
              <img src={value} alt="Your uploaded signature" />
            </div>
          ) : (
            <div className="rk-dropzone rk-dropzone-small">
              <button
                type="button"
                className="rk-btn rk-btn-secondary rk-btn-small"
                onClick={() => fileInputRef.current?.click()}
                aria-describedby={describedBy}
                disabled={processing}
              >
                {processing ? 'Preparing image…' : 'Choose signature image'}
              </button>
            </div>
          )}
        </>
      )}

      <div className="rk-signature-foot">
        <p className={`rk-signature-status${value ? ' rk-signature-status-ok' : ''}`} aria-live="polite">
          {value ? <><TickIcon /> Signed</> : ''}
        </p>
        <div className="rk-signature-actions">
          {mode === 'upload' && value && (
            <button type="button" className="rk-link-button" onClick={() => fileInputRef.current?.click()}>Replace image</button>
          )}
          {value && <button type="button" className="rk-link-button" onClick={clear}>Clear signature</button>}
        </div>
      </div>
      {uploadError && <ErrorText id={`${id}-upload`} error={uploadError} />}
      <ErrorText id={id} error={error} />
    </div>
  );
};
