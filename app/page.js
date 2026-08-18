import Link from "next/link";
import { prisma } from "@/lib/db";
import { publicUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }) {
  const kind = searchParams?.kind;
  const products = await prisma.product.findMany({
    where: {
      published: true,
      ...(kind ? { kind } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main>
      <div className="container">
        <nav className="nav">
          <div className="logo">
            STILL <span>HYPER</span>
          </div>
          <div />
        </nav>

        <div className="hero">
          <h1>Drum kits &amp; beats</h1>
          <p>Sample packs, stems and beats made for producers who move fast.</p>
        </div>

        <div className="tabs">
          <Link href="/" className={`tab ${!kind ? "active" : ""}`}>
            All
          </Link>
          <Link href="/?kind=kit" className={`tab ${kind === "kit" ? "active" : ""}`}>
            Drum kits
          </Link>
          <Link href="/?kind=beat" className={`tab ${kind === "beat" ? "active" : ""}`}>
            Beats
          </Link>
        </div>

        <div className="grid">
          {products.map((p) => (
            <Link key={p.id} href={`/product/${p.slug}`} className="card">
              <img className="card-image" src={publicUrl(p.coverImageKey)} alt={p.title} />
              <div className="card-body">
                <div className="card-kind">{p.kind}</div>
                <div className="card-title">{p.title}</div>
                <div className="card-price">${(p.priceCents / 100).toFixed(2)}</div>
              </div>
            </Link>
          ))}
          {products.length === 0 && (
            <p style={{ color: "var(--text-dim)" }}>Nothing here yet — check back soon.</p>
          )}
        </div>
      </div>
      <div className="footer">© {new Date().getFullYear()} Still Hyper</div>
    </main>
  );
}
