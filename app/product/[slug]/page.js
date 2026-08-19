import { prisma } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import BuyButton from "./buy-button";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
  });

  if (!product) {
    return (
      <div className="container">
        <p>That product doesn't exist.</p>
      </div>
    );
  }

  return (
    <main className="container">
      <nav className="nav">
        <a href="/" className="logo">
          STILL <span>HYPER</span>
        </a>
      </nav>

      <div className="product-page">
        <img className="product-image" src={publicUrl(product.coverImageKey)} alt={product.title} />
        <div>
          <div className="card-kind">{product.kind}</div>
          <h1 style={{ fontSize: 32, margin: "8px 0" }}>{product.title}</h1>
          <div className="product-price">${(product.priceCents / 100).toFixed(2)}</div>

          {product.previewAudioKey && (
            <audio controls src={publicUrl(product.previewAudioKey)} />
          )}

          <p className="product-desc">{product.description}</p>

          <BuyButton productId={product.id} />
        </div>
      </div>
    </main>
  );
}
