import { useEffect, useRef } from 'react';

const COLOURS = ['#7c4dff', '#ffc800', '#22b07d', '#ff4b8b', '#1cb0f6', '#ff8a3d'];

/** A one-off confetti burst drawn on a full-screen canvas. */
export function Confetti({ pieces = 140 }: { pieces?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const c = canvas?.getContext('2d');
    if (!canvas || !c) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dpr = window.devicePixelRatio || 1;
    const w = (canvas.width = window.innerWidth * dpr);
    const h = (canvas.height = window.innerHeight * dpr);
    const parts = Array.from({ length: pieces }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.3,
      y: h * 0.35,
      vx: (Math.random() - 0.5) * 22 * dpr,
      vy: (-Math.random() * 22 - 8) * dpr,
      size: (6 + Math.random() * 8) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    }));
    let frame = 0;
    let raf = 0;
    const step = () => {
      frame++;
      c.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.vy += 0.6 * dpr;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillStyle = p.colour;
        c.globalAlpha = Math.max(0, 1 - frame / 160);
        c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        c.restore();
      }
      if (frame < 160) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [pieces]);

  return <canvas ref={ref} className="confetti" aria-hidden="true" />;
}
