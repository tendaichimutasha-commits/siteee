import "./globals.css";

export const metadata = {
  title: "Still Hyper — Drum Kits & Beats",
  description: "Drum kits, sample packs and beats by Still Hyper.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
