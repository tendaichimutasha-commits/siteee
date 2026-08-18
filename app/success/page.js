"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function SuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}

function SuccessContent() {
  const params = useSearchParams();
  const product = params.get("product");
  const email = params.get("email");
  const [status, setStatus] = useState("waiting");
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!product || !email) return;
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      const res = await fetch(
        `/api/orders/lookup?product=${product}&email=${encodeURIComponent(email)}`
      );
      const data = await res.json();

      if (cancelled) return;

      if (data.status === "paid" && data.downloadToken) {
        const dlRes = await fetch(`/api/download/${data.downloadToken}`);
        const dl = await dlRes.json();
        if (dlRes.ok) {
          setFiles(dl.files);
          setTitle(dl.product);
          setStatus("ready");
          return;
        }
      }

      if (attempts < 20) {
        setTimeout(poll, 3000);
      } else {
        setStatus("timeout");
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [product, email]);

  return (
    <main className="container" style={{ paddingTop: 80, maxWidth: 560 }}>
      <a href="/" className="logo">
        STILL <span>HYPER</span>
      </a>

      <div className="success-box" style={{ marginTop: 40 }}>
        {status === "waiting" && (
          <>
            <h2>Confirming your payment…</h2>
            <p style={{ color: "var(--text-dim)" }}>
              This usually takes a few seconds. Don't close this page.
            </p>
          </>
        )}
        {status === "ready" && (
          <>
            <h2>You're all set 🎧</h2>
            <p style={{ color: "var(--text-dim)" }}>{title} — your download links:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
              {files.map((f) => (
                <a key={f.url} className="btn" href={f.url}>
                  Download {f.filename}
                </a>
              ))}
            </div>
            <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 16 }}>
              Links expire in 7 days. Save the files somewhere safe.
            </p>
          </>
        )}
        {status === "timeout" && (
          <>
            <h2>Still waiting on payment confirmation</h2>
            <p style={{ color: "var(--text-dim)" }}>
              If you were charged, refresh this page in a minute, or contact support with your
              email and order time.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
