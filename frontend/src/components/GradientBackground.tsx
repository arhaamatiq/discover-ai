export function GradientBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Purple orb — bottom-right anchor */}
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          right: "-8%",
          width: "486px",
          height: "416px",
          borderRadius: "50%",
          background: "rgba(147, 97, 222, 0.7)",
          filter: "blur(140px)",
          animation: "orbBreath1 7s ease-in-out infinite",
        }}
      />
      {/* Blue-purple orb — top-left anchor */}
      <div
        style={{
          position: "absolute",
          top: "-12%",
          left: "-8%",
          width: "486px",
          height: "416px",
          borderRadius: "50%",
          background: "rgba(99, 97, 222, 0.7)",
          filter: "blur(140px)",
          animation: "orbBreath2 9s ease-in-out infinite",
        }}
      />
    </div>
  );
}
