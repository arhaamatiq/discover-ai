export function GradientBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Purple orb — bottom-right */}
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          right: "-8%",
          width: "540px",
          height: "460px",
          borderRadius: "50%",
          background: "rgba(147, 97, 222, 0.65)",
          filter: "blur(150px)",
          animation: "orbBreath1 7s ease-in-out infinite",
        }}
      />
      {/* Blue-purple orb — top-left */}
      <div
        style={{
          position: "absolute",
          top: "-12%",
          left: "-8%",
          width: "520px",
          height: "440px",
          borderRadius: "50%",
          background: "rgba(99, 97, 222, 0.65)",
          filter: "blur(150px)",
          animation: "orbBreath2 9s ease-in-out infinite",
        }}
      />
      {/* Indigo accent orb — center-right, very subtle */}
      <div
        style={{
          position: "absolute",
          top: "35%",
          right: "20%",
          width: "320px",
          height: "280px",
          borderRadius: "50%",
          background: "rgba(80, 60, 200, 0.35)",
          filter: "blur(120px)",
          animation: "orbBreath3 12s ease-in-out infinite",
        }}
      />
      {/* Subtle noise overlay for depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "200px 200px",
          opacity: 0.4,
        }}
      />
    </div>
  );
}
