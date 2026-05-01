import { useMemo } from "react";

export default function Snowfall({ count = 30 }: { count?: number }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 4 + 2,
        duration: Math.random() * 10 + 8,
        delay: Math.random() * 10,
        opacity: Math.random() * 0.5 + 0.3,
      })),
    [count]
  );
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {flakes.map((f) => (
        <span
          key={f.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${f.left}%`,
            top: "-5vh",
            width: f.size,
            height: f.size,
            opacity: f.opacity,
            animation: `snowfall ${f.duration}s linear infinite`,
            animationDelay: `${f.delay}s`,
            filter: "blur(0.5px)",
          }}
        />
      ))}
    </div>
  );
}
