import { ImageResponse } from "next/og"

export const runtime = "edge"
export const contentType = "image/png"
export const size = {
  width: 512,
  height: 512,
}

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "120px",
          background: "linear-gradient(135deg, #1f7db2 0%, #0f172a 55%, #020617 100%)",
          color: "#f8fafc",
          fontWeight: 800,
          fontSize: 240,
          letterSpacing: -12,
          boxShadow: "inset 0 0 0 16px rgba(255,255,255,0.14)",
        }}
      >
        15
      </div>
    ),
    {
      ...size,
    },
  )
}
