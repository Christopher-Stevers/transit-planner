import Link from "next/link";

const LINE_COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed", "#0891b2"];

export function InfoFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid #e7e5e4",
        backgroundColor: "#fafaf9",
        marginTop: 96,
      }}
    >
      {/* Transit line accent */}
      <div style={{ display: "flex", height: 3 }}>
        {LINE_COLORS.map((color, i) => (
          <div key={i} style={{ flex: 1, backgroundColor: color }} />
        ))}
      </div>

      <div
        style={{
          maxWidth: 1152,
          margin: "0 auto",
          padding: "48px 24px 40px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 40,
            marginBottom: 48,
          }}
        >
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M3 12h18M3 18h9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="19" cy="18" r="3" fill="white" />
                </svg>
              </div>
              <span
                style={{
                  fontFamily: "Google Sans Display",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#1c1917",
                }}
              >
                Transit Planner
              </span>
            </div>
            <p style={{ fontSize: 13, color: "#78716c", lineHeight: 1.6, maxWidth: 200 }}>
              Urban transit intelligence for planners, researchers, and advocates.
            </p>
          </div>

          {/* Product */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Product
            </p>
            {[
              { href: "/map", label: "Open App" },
              { href: "/about", label: "About" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{ display: "block", fontSize: 13.5, color: "#57534e", textDecoration: "none", marginBottom: 8 }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Documentation */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Documentation
            </p>
            {[
              { href: "/docs", label: "User Guide" },
              { href: "/docs/technical", label: "Technical Docs" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{ display: "block", fontSize: 13.5, color: "#57534e", textDecoration: "none", marginBottom: 8 }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Legal */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Legal
            </p>
            {[
              { href: "/terms", label: "Terms of Use" },
              { href: "/privacy", label: "Privacy Policy" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{ display: "block", fontSize: 13.5, color: "#57534e", textDecoration: "none", marginBottom: 8 }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid #e7e5e4",
            paddingTop: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <p style={{ fontSize: 13, color: "#a8a29e" }}>
            © {new Date().getFullYear()} Transit Planner. All rights reserved.
          </p>
          <p style={{ fontSize: 13, color: "#a8a29e" }}>
            Built for urban planners and transit advocates
          </p>
        </div>
      </div>
    </footer>
  );
}
