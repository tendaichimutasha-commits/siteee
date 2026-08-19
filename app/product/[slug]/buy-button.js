"use client";

import { useState } from "react";

export default function BuyButton({ productId }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleBuy() {
    if (!email || !email.includes("@")) {
      setError("Enter a valid email first — that's where your download link goes.");
      return;
    }
    if (!phone) {
      setError("Enter a phone number — ContiPay needs it to process the payment.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, email, phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not start checkout. Try again.");
        setLoading(false);
        return;
      }

      // ContiPay checkout is a hosted redirect page, not an in-page popup.
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError("Could not reach checkout. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div className="form" style={{ marginBottom: 12 }}>
        <label>Email (for your download link)</label>
        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="form" style={{ marginBottom: 12 }}>
        <label>Phone (for ContiPay payment)</label>
        <input
          type="tel"
          placeholder="e.g. 0782000340"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn" onClick={handleBuy} disabled={loading}>
        {loading ? "Starting checkout…" : "Buy now"}
      </button>
    </div>
  );
}
