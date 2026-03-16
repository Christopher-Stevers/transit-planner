"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/docs", label: "User Docs" },
  { href: "/docs/technical", label: "Technical" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export function InfoNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid #e7e5e4",
      }}
    >
      <div
        style={{
          maxWidth: 1152,
          margin: "0 auto",
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 6h18M3 12h18M3 18h9"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="19" cy="18" r="3" fill="white" />
            </svg>
          </div>
          <span
            style={{
              fontFamily: "Google Sans Display",
              fontWeight: 700,
              fontSize: 15,
              color: "#1c1917",
              letterSpacing: "-0.01em",
            }}
          >
            Transit Planner
          </span>
        </Link>

        {/* Nav links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flex: 1,
            justifyContent: "center",
          }}
        >
          {navLinks.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/docs" && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: active ? 500 : 400,
                  color: active ? "#2563eb" : "#57534e",
                  backgroundColor: active ? "#eff6ff" : "transparent",
                  textDecoration: "none",
                  transition: "background-color 0.15s, color 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <Link
          href="/map"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 16px",
            borderRadius: 8,
            fontSize: 13.5,
            fontWeight: 500,
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            color: "white",
            textDecoration: "none",
            flexShrink: 0,
            boxShadow: "0 1px 3px rgba(37,99,235,0.3)",
          }}
        >
          Open App
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h14M12 5l7 7-7 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </nav>
  );
}
