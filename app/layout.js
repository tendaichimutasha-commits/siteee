import "./globals.css";

export const metadata = {
  title: "Still Hyper — Drum Kits & Beats",
  description: "Drum kits, sample packs and beats by Still Hyper.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Script />
        {children}
      </body>
    </html>
  );
}

// Loads Paddle.js once, site-wide, and sets the environment (sandbox vs live).
function Script() {
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const env = process.env.NEXT_PUBLIC_PADDLE_ENV || "sandbox";
  return (
    <>
      <script src="https://cdn.paddle.com/paddle/v2/paddle.js" />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener("load", function () {
              if (window.Paddle) {
                if ("${env}" === "sandbox") { Paddle.Environment.set("sandbox"); }
                Paddle.Initialize({ token: "${clientToken || ""}" });
              }
            });
          `,
        }}
      />
    </>
  );
}
