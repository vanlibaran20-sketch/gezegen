import React, { useEffect, useRef } from 'react';

export const MatrixBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const matrixChars = '01ABCDEFGHIJKLMNOPQRSTUVWXYZｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';
    const charArray = matrixChars.split('');

    const fontSize = 14;
    let columns = Math.ceil(canvas.width / fontSize);

    // Track the y-position of drops (re-calculate on resize)
    let drops: number[] = Array(columns).fill(1).map(() => Math.floor(Math.random() * -100));

    const draw = () => {
      // Re-initialize if width changes and we have more grid columns
      const currentCols = Math.ceil(canvas.width / fontSize);
      if (currentCols !== columns) {
        columns = currentCols;
        drops = Array(columns).fill(1).map(() => Math.floor(Math.random() * -100));
      }

      ctx.fillStyle = 'rgba(2, 6, 23, 0.16)'; // space-black fade trails
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#22c55e'; // classic matrix neon green
      ctx.font = `bold ${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Pick a random code character
        const char = charArray[Math.floor(Math.random() * charArray.length)];
        
        // Randomize brightness for code-rain depth
        const brightness = Math.random();
        if (brightness > 0.96) {
          ctx.fillStyle = '#ffffff'; // occasional white head/glowing leader
        } else if (brightness > 0.5) {
          ctx.fillStyle = '#4ade80'; // brighter green
        } else {
          ctx.fillStyle = '#166534'; // darker green for depth shadow
        }

        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillText(char, x, y);

        // Reset drops when they reach off-screen with random delay
        if (y > canvas.height && Math.random() > 0.985) {
          drops[i] = 0;
        }

        drops[i]++;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      id="matrix-bg-canvas"
      ref={canvasRef}
      className="fixed inset-0 w-full h-full object-cover pointer-events-none z-0 opacity-40 bg-slate-950"
    />
  );
};
