"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/admin/dashboard");
    } else {
      setError("Wrong password.");
    }
  }

  return (
    <main className="container" style={{ paddingTop: 100, maxWidth: 400 }}>
      <div className="logo" style={{ marginBottom: 40 }}>
        STILL <span>HYPER</span> — admin
      </div>
      <form className="form" onSubmit={submit}>
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">
          Log in
        </button>
      </form>
    </main>
  );
}
