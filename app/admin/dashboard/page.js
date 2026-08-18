"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState("kit");
  const [price, setPrice] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [packageFiles, setPackageFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function loadProducts() {
    const res = await fetch("/api/products");
    if (res.status === 401) {
      router.push("/admin");
      return;
    }
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function uploadOne(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error(`Upload failed for ${file.name}`);
    return res.json();
  }

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!title || !price || !coverFile || packageFiles.length === 0) {
      setError("Title, price, a cover image, and at least one package file are required.");
      return;
    }

    setSubmitting(true);
    try {
      setProgress("Uploading cover image…");
      const cover = await uploadOne(coverFile);

      let preview = null;
      if (previewFile) {
        setProgress("Uploading preview audio…");
        preview = await uploadOne(previewFile);
      }

      const uploadedFiles = [];
      for (let i = 0; i < packageFiles.length; i++) {
        setProgress(`Uploading file ${i + 1} of ${packageFiles.length}…`);
        const uploaded = await uploadOne(packageFiles[i]);
        uploadedFiles.push(uploaded);
      }

      setProgress("Creating product & Paddle price…");
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          kind,
          priceCents: Math.round(parseFloat(price) * 100),
          currency: "USD",
          coverImageKey: cover.key,
          previewAudioKey: preview?.key,
          files: uploadedFiles,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create product");
      }

      setTitle("");
      setDescription("");
      setPrice("");
      setCoverFile(null);
      setPreviewFile(null);
      setPackageFiles([]);
      setProgress("");
      loadProducts();
    } catch (err) {
      setError(err.message);
      setProgress("");
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePublish(product) {
    await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !product.published }),
    });
    loadProducts();
  }

  async function remove(product) {
    if (!confirm(`Delete "${product.title}"? This removes the uploaded files too.`)) return;
    await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    loadProducts();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  }

  return (
    <main className="container" style={{ paddingTop: 40, paddingBottom: 100 }}>
      <nav className="nav">
        <div className="logo">
          STILL <span>HYPER</span> — admin
        </div>
        <button className="btn btn-secondary" onClick={logout}>
          Log out
        </button>
      </nav>

      <h2 style={{ marginTop: 40 }}>Upload a new kit or beat</h2>
      <form className="form" onSubmit={submit} style={{ maxWidth: 520 }}>
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />

        <label>Description</label>
        <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />

        <label>Type</label>
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="kit">Drum kit</option>
          <option value="beat">Beat</option>
        </select>

        <label>Price (USD) — this is what gets charged automatically</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <label>Cover image (jpg/png)</label>
        <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} />

        <label>Preview audio (mp3, optional — plays on the product page)</label>
        <input type="file" accept="audio/*" onChange={(e) => setPreviewFile(e.target.files[0])} />

        <label>Downloadable files (rar, zip, wav, mp3, stems — select multiple)</label>
        <input
          type="file"
          multiple
          onChange={(e) => setPackageFiles(Array.from(e.target.files))}
        />
        {packageFiles.length > 0 && (
          <p style={{ fontSize: 13, color: "var(--text-dim)" }}>
            {packageFiles.map((f) => f.name).join(", ")}
          </p>
        )}

        {error && <p className="error">{error}</p>}
        {progress && <p style={{ color: "var(--text-dim)" }}>{progress}</p>}

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Uploading…" : "Publish"}
        </button>
      </form>

      <h2 style={{ marginTop: 60 }}>Your listings</h2>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Price</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td>{p.kind}</td>
                <td>${(p.priceCents / 100).toFixed(2)}</td>
                <td>
                  <span className="pill">{p.published ? "Live" : "Hidden"}</span>
                </td>
                <td style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-secondary" onClick={() => togglePublish(p)}>
                    {p.published ? "Unpublish" : "Publish"}
                  </button>
                  <button className="btn btn-secondary" onClick={() => remove(p)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
