import { useEffect, useRef, useState, useCallback, useMemo } from "react";

const getLoveMessages = (name: string) => {
  const nicknames: Record<string, string> = {
    "Kavya": "Kavu",
    "Vandana": "Vandu",
    "Jigyasha": "Jishu"
  };
  
  const displayName = nicknames[name] || name;

  return [
    `Miss you ${displayName} 💖`,
    `You are my everything`,
    "Forever yours 💗",
    `My heart beats for you Babe 💓`,
    "You complete me",
    `I love you ${displayName}`,
    "You feel like home",
    "You matter to me",
    "Sweetheart 💗",
    `${name} ❤️`,
    "Babe !!",
    `${displayName} 🤍!!`,
    "My heartbeats for you💓",
    `You're perfect Babe 🦋`,
    "Thinking of you 💕",
    "You feel like home",
    "You matter to me",
    "Stay with me 💗",
  ];
};

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  hue: number; // 0=white, 1=blue, 2=magenta
  alpha: number;
  msgIndex: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

const isMobile = () => window.innerWidth < 768;

function createStar(messagesLength: number, msgIndex?: number): Star {
  const spread = 1800;
  const depth = 2000;
  const r = Math.random();
  return {
    x: (Math.random() - 0.5) * spread * 2,
    y: (Math.random() - 0.5) * spread * 1.2,
    z: Math.random() * depth - depth / 2,
    size: 1 + Math.random() * 3,
    hue: r < 0.6 ? 0 : r < 0.8 ? 1 : 2,
    // Higher base alpha (0.8 to 1.0)
    alpha: 0.8 + Math.random() * 0.2,
    msgIndex: msgIndex ?? Math.floor(Math.random() * messagesLength),
    twinkleSpeed: 1 + Math.random() * 3,
    twinkleOffset: Math.random() * Math.PI * 2,
  };
}

// Pre-render heart sprites to offscreen canvases (avoids per-frame bezier + shadow)
function createHeartSprite(size: number, glowR: number, glowG: number, glowB: number): HTMLCanvasElement {
  const pad = size * 3;
  const dim = Math.ceil(size * 4 + pad * 2);
  const c = document.createElement("canvas");
  c.width = dim;
  c.height = dim;
  const ctx = c.getContext("2d")!;
  const cx = dim / 2;
  const cy = dim / 2;

  // Draw glow as radial gradient (no shadowBlur!)
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 2.5);
  // Brighter glow (0.8 instead of 0.5)
  grad.addColorStop(0, `rgba(${glowR},${glowG},${glowB},0.8)`);
  grad.addColorStop(0.5, `rgba(${glowR},${glowG},${glowB},0.3)`);
  grad.addColorStop(1, `rgba(${glowR},${glowG},${glowB},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, dim, dim);

  // Heart path helper
  const heartPath = (s: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 0.5 * s);
    ctx.bezierCurveTo(cx - 1 * s, cy - 1.5 * s, cx - 2 * s, cy, cx, cy + 1.5 * s);
    ctx.moveTo(cx, cy - 0.5 * s);
    ctx.bezierCurveTo(cx + 1 * s, cy - 1.5 * s, cx + 2 * s, cy, cx, cy + 1.5 * s);
  };

  // Outer heart (hue color)
  heartPath(size);
  ctx.fillStyle = `rgb(${glowR},${glowG},${glowB})`;
  ctx.fill();

  // Inner white core
  heartPath(size * 0.5);
  ctx.fillStyle = "#fff";
  ctx.fill();

  return c;
}

// Burst particles — simple circles, no shadows
interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; r: number; g: number; b: number; size: number;
}

const HeartStarField = ({ onClose, partnerName = "Love" }: { onClose?: () => void; partnerName?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);
  const spriteCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const [popups, setPopups] = useState<{ id: number; x: number; y: number; msg: string }[]>([]);
  const popIdRef = useRef(0);

  const messages = useMemo(() => getLoveMessages(partnerName), [partnerName]);

  const getSprite = useCallback((sizeKey: number, hue: number): HTMLCanvasElement => {
    const key = `${sizeKey}_${hue}`;
    let sprite = spriteCacheRef.current.get(key);
    if (!sprite) {
      const [r, g, b] = hue === 1 ? [100, 180, 255] : hue === 2 ? [255, 100, 180] : [200, 210, 230];
      sprite = createHeartSprite(sizeKey, r, g, b);
      spriteCacheRef.current.set(key, sprite);
    }
    return sprite;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    let animId: number;
    let w = window.innerWidth;
    let h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const setSize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();

    const starCount = isMobile() ? 250 : 400;
    const stars: Star[] = [];
    for (let i = 0; i < starCount; i++) stars.push(createStar(messages.length));
    starsRef.current = stars;

    // Pre-generate sprites for a few discrete sizes
    const sizes = [2, 3, 4, 6, 8, 10];
    for (const s of sizes) {
      for (let hue = 0; hue < 3; hue++) {
        getSprite(s, hue);
      }
    }

    const handleResize = () => setSize();
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: (e.clientX / w - 0.5) * 2, y: (e.clientY / h - 0.5) * 2 };
    };
    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      mouseRef.current = { x: (t.clientX / w - 0.5) * 2, y: (t.clientY / h - 0.5) * 2 };
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    const focalLength = 600;
    // Reusable projection array to avoid GC
    const projLen = starCount;
    const projSx = new Float32Array(projLen);
    const projSy = new Float32Array(projLen);
    const projScale = new Float32Array(projLen);
    const projDist = new Float32Array(projLen);

    const animate = () => {
      timeRef.current += 0.016;

      // Clear background (Solid black to remove trails/ghosting)
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h);

      rotationRef.current.y += 0.001 + mouseRef.current.x * 0.0015;
      rotationRef.current.x += 0.0005 + mouseRef.current.y * 0.0008;

      const cosY = Math.cos(rotationRef.current.y);
      const sinY = Math.sin(rotationRef.current.y);
      const cosX = Math.cos(rotationRef.current.x);
      const sinX = Math.sin(rotationRef.current.x);

      const allStars = starsRef.current;
      const len = allStars.length;

      for (let i = 0; i < len; i++) {
        const star = allStars[i];
        const x1 = star.x * cosY - star.z * sinY;
        const z1 = star.x * sinY + star.z * cosY;
        const y1 = star.y * cosX - z1 * sinX;
        const z2 = star.y * sinX + z1 * cosX;
        const perspective = focalLength / (focalLength + z2 + 1200);
        projSx[i] = w / 2 + x1 * perspective;
        projSy[i] = h / 2 + y1 * perspective;
        projScale[i] = perspective;
        projDist[i] = z2;
      }

      // Skip sorting every frame — just draw, depth order doesn't matter much for glowing dots
      const t = timeRef.current;
      for (let i = 0; i < len; i++) {
        const star = allStars[i];
        const scale = projScale[i];
        const s = star.size * scale * 3;
        // Brighter twinkle (never goes below 0.8 brightness)
        const twinkle = 0.8 + 0.3 * Math.sin(t * star.twinkleSpeed + star.twinkleOffset);
        const a = star.alpha * Math.min(1, scale * 2) * twinkle;

        if (a < 0.05 || s < 0.5) continue; // cull invisible

        // Snap to nearest pre-rendered size
        const snapSize = s < 2.5 ? 2 : s < 3.5 ? 3 : s < 5 ? 4 : s < 7 ? 6 : s < 9 ? 8 : 10;
        const sprite = getSprite(snapSize, star.hue);

        ctx.globalAlpha = a;
        const sw = sprite.width;
        ctx.drawImage(sprite, projSx[i] - sw / 2, projSy[i] - sw / 2);
      }

      // Burst particles — simple filled circles, no shadows
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.05;
        pt.life -= 0.02;
        if (pt.life <= 0) { particles.splice(i, 1); continue; }
        const pAlpha = pt.life;
        ctx.globalAlpha = pAlpha;
        ctx.fillStyle = `rgb(${pt.r},${pt.g},${pt.b})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * pAlpha, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [getSprite, messages]);

  const spawnBurst = useCallback((x: number, y: number, hue: number) => {
    const [r, g, b] = hue === 1 ? [100, 180, 255] : hue === 2 ? [255, 100, 180] : [220, 220, 240];
    const count = isMobile() ? 6 : 10;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 2 + Math.random() * 2;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        r, g, b,
        size: 1.5 + Math.random() * 1.5,
      });
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const w = window.innerWidth;
    const h = window.innerHeight;

    const cosY = Math.cos(rotationRef.current.y);
    const sinY = Math.sin(rotationRef.current.y);
    const cosX = Math.cos(rotationRef.current.x);
    const sinX = Math.sin(rotationRef.current.x);
    const focalLength = 600;

    let closestIdx = -1;
    let closestSx = 0, closestSy = 0;
    let minDist = 50;

    const allStars = starsRef.current;
    for (let i = 0; i < allStars.length; i++) {
      const star = allStars[i];
      const x1 = star.x * cosY - star.z * sinY;
      const z1 = star.x * sinY + star.z * cosY;
      const y1 = star.y * cosX - z1 * sinX;
      const z2 = star.y * sinX + z1 * cosX;
      const perspective = focalLength / (focalLength + z2 + 1200);
      const sx = w / 2 + x1 * perspective;
      const sy = h / 2 + y1 * perspective;
      const d = Math.hypot(sx - clientX, sy - clientY);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
        closestSx = sx;
        closestSy = sy;
      }
    }

    if (closestIdx >= 0) {
      const star = allStars[closestIdx];
      const msg = messages[star.msgIndex];
      const id = popIdRef.current++;

      spawnBurst(closestSx, closestSy, star.hue);
      
      // On mobile, show only one message at a time to prevent overlap
      if (isMobile()) {
        setPopups([{ id, x: closestSx, y: closestSy, msg }]);
      } else {
        setPopups((p) => [...p, { id, x: closestSx, y: closestSy, msg }]);
      }
      
      allStars[closestIdx] = createStar(messages.length);

      setTimeout(() => setPopups((p) => p.filter((pp) => pp.id !== id)), 2500);
    } else {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      const id = popIdRef.current++;
      
      if (isMobile()) {
         setPopups([{ id, x: clientX, y: clientY, msg }]);
      } else {
         setPopups((p) => [...p, { id, x: clientX, y: clientY, msg }]);
      }

      setTimeout(() => setPopups((p) => p.filter((pp) => pp.id !== id)), 2500);
    }
  }, [spawnBurst, messages]);

  return (
    <div className="fixed inset-0 bg-black z-50 animate-fade-in" onClick={handleClick}>
      <canvas ref={canvasRef} className="absolute inset-0" />
      {popups.map((p) => (
        <div
          key={p.id}
          className="message-popup"
          style={{ left: p.x, top: p.y, transform: "translate(-50%, -50%)" }}
        >
          {p.msg}
        </div>
      ))}
      <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none z-10">
        <p className="text-white/30 text-sm font-sans">
          tap a heart to reveal a message 💕
        </p>
      </div>
      {onClose && (
        <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            className="absolute top-4 right-4 text-white/50 hover:text-white p-2 z-20"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>
        </button>
      )}
    </div>
  );
};

export default HeartStarField;
