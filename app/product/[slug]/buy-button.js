"use client";

import { useState } from "react";

export default function BuyButton({ paddlePriceId, productId }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  function handleBuy() {
    if (!email || !email.includes("@")) {
      setError("Enter a valid email first — that's where your download link goes.");
      return;
    }
    setError("");
    if (!window.Paddle) {
      setError("Checkout is still loading, try again in a moment.");
      return;
    }
    window.Paddle.Checkout.open({
      items: [{ priceId: paddlePriceId, quantity: 1 }],
      customer: { email },
      customData: { productId },
      settings: {
        successUrl: `${window.location.origin}/success?product=${productId}&email=${encodeURIComponent(
          email
        )}`,
      },
    });
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
      {error && <p className="error">{error}</p>}
      <button className="btn" onClick={handleBuy}>
        Buy now
      </button>
    </div>
  );
}
