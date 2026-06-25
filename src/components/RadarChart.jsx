import React, { useRef, useEffect } from 'react';
import { theme } from '../styles/theme';

export default function RadarChart({ myKey, oppKey, teams, width = 280, height = 240 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) * 0.32;

    ctx.clearRect(0, 0, W, H);

    const my = teams[myKey];
    const op = teams[oppKey];
    if (!my || !op) return;

    const labels = ["Attack", "Defense", "Set Piece", "Discipline", "Form", "Kicking"];
    const myValues = [
      (my.attack?.gl || 50) / 100,
      (my.defense?.tr || 80) / 100,
      ((my.setpiece?.so || 80) + (my.setpiece?.lo || 75)) / 200,
      (my.discipline?.idx || 65) / 100,
      (my.form?.rating || 50) / 100,
      (my.kicking?.goal || 70) / 100
    ];
    const opValues = [
      (op.attack?.gl || 50) / 100,
      (op.defense?.tr || 80) / 100,
      ((op.setpiece?.so || 80) + (op.setpiece?.lo || 75)) / 200,
      (op.discipline?.idx || 65) / 100,
      (op.form?.rating || 50) / 100,
      (op.kicking?.goal || 70) / 100
    ];

    const n = 6;
    const step = (Math.PI * 2) / n;

    // Draw grid
    for (let ring = 1; ring <= 5; ring++) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const angle = i * step - Math.PI / 2;
        const r = (ring / 5) * R;
        if (i === 0) ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        else ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Draw axes and labels
    for (let i = 0; i < n; i++) {
      const angle = i * step - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "9px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labels[i], cx + Math.cos(angle) * (R + 22), cy + Math.sin(angle) * (R + 22));
    }

    // Draw data polygons
    function drawPolygon(values, color, alpha) {
      ctx.beginPath();
      values.forEach((v, i) => {
        const angle = i * step - Math.PI / 2;
        const r = v * R;
        if (i === 0) ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        else ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      });
      ctx.closePath();

      // Parse hex to rgba
      const hex = color.replace("#", "");
      const rr = parseInt(hex.slice(0, 2), 16) || 16;
      const gg = parseInt(hex.slice(2, 4), 16) || 185;
      const bb = parseInt(hex.slice(4, 6), 16) || 129;
      ctx.fillStyle = `rgba(${rr},${gg},${bb},${alpha})`;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    drawPolygon(myValues, my.color || "#10b981", 0.25);
    drawPolygon(opValues, op.color || "#3b82f6", 0.15);

  }, [myKey, oppKey, teams]);

  return (
    <div style={{ textAlign: "center" }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: "block", margin: "0 auto" }} />
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: teams[myKey]?.color || theme.green }} />
          <span style={{ color: theme.textSecondary }}>{myKey}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: teams[oppKey]?.color || theme.blue }} />
          <span style={{ color: theme.textSecondary }}>{oppKey}</span>
        </div>
      </div>
    </div>
  );
}
