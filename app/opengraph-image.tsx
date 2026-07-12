import { ImageResponse } from "next/og";
import { DEMO_PERSONA } from "@/demo/demo-persona";
import { SITE_NAME } from "@/lib/site-config";

export const alt = `${SITE_NAME} — statystyki darta z N01`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "linear-gradient(145deg, #0f0f1a 0%, #1a1530 50%, #12121f 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#93b4ff",
            }}
          >
            Sylveon Company · Dart &amp; Event
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 72,
                height: 72,
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "#a78bfa",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 52,
                  fontWeight: 800,
                  color: "white",
                  letterSpacing: "-0.02em",
                }}
              >
                Dart Profile Tracker
              </div>
              <div style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,0.65)" }}>
                Import N01 · forma · H2H · checkout
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", flexDirection: "row", gap: 40 }}>
            {[
              { n: "10", label: "MECZÓW DEMO" },
              { n: "501", label: "START" },
              { n: "N01", label: "IMPORT" },
            ].map((s) => (
              <div
                key={s.label}
                style={{ display: "flex", flexDirection: "column", gap: 4 }}
              >
                <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: "#c084fc" }}>
                  {s.n}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.45)",
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 15, color: "rgba(255,255,255,0.5)" }}>
            {DEMO_PERSONA.firstName} „{DEMO_PERSONA.nickname}" {DEMO_PERSONA.lastName}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
