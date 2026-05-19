import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import * as Types from '../types';
import { useCart } from '../components/customer/CartContext';
import { CheckCircle2, ChevronDown, Heart } from 'lucide-react';
import { calcDiscountedUnitPrice, formatPromotionPercentBadge, normalizePromotionPercent } from '../services/pricing';
import { User } from '../types';

type Props = { 
  wishlist?: string[]; 
  toggleWishlist?: (id: string) => void;
  user?: User | null;
  onRequireAuth?: () => void;
};

const ProductDetails: React.FC<Props> = ({ wishlist, toggleWishlist, user, onRequireAuth }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Types.Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('S');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [wishlisted, setWishlisted] = useState<boolean>(false);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(true);
  const { addToCart } = useCart();

  useEffect(() => {
    if (!id) return;
    const productDoc = doc(db, 'products', id);
    const unsub = onSnapshot(
      productDoc,
      (snap) => {
        if (!snap.exists()) {
          setProduct(null);
          navigate('/shop', { replace: true });
          return;
        }
        const p = { id: snap.id, ...(snap.data() as any) } as Types.Product;
        // If stock becomes 0, remove from product page to match list behavior.
        if ((p?.stock ?? 0) <= 0) {
          setProduct(p);
          navigate('/shop', { replace: true });
          return;
        }
        setProduct(p);
      },
      () => {
        setProduct(null);
        navigate('/shop', { replace: true });
      }
    );
    return () => {
      try { unsub(); } catch {}
    };
  }, [id, navigate]);

  useEffect(() => {
    if (product && wishlist) {
      setWishlisted(wishlist.includes(product.id));
    }
  }, [product, wishlist]);

  useEffect(() => {
    if (product?.colors?.length) {
      setSelectedColor((prev) => prev || product.colors![0]);
    }
  }, [product?.id]);

  if (!product) return (
    <div className="max-w-7xl mx-auto px-6 py-24">
      <p className="text-gray-500">Loading product…</p>
    </div>
  );

  const sizes = ['S','M','L','XL','XXL'];
  const rawPrice = Number((product as any).price);
  const hasValidPrice = Number.isFinite(rawPrice);
  const basePrice = hasValidPrice ? rawPrice : 0;
  const rawStock = Number((product as any).stock);
  const stock = Number.isFinite(rawStock) ? rawStock : 0;
  const promo = normalizePromotionPercent((product as any).promotionPercent);
  const hasPromo = hasValidPrice && promo > 0;
  const discountedPrice = calcDiscountedUnitPrice(basePrice, promo);
  const imageSrc = (product as any).image || '';

  const [selectedImage, setSelectedImage] = useState<string>('');

  const galleryImages = useMemo(() => {
    const images = [imageSrc];
    if (Array.isArray((product as any).images)) {
      images.push(...(product as any).images.filter(Boolean));
    }
    return Array.from(new Set(images.filter(Boolean))) as string[];
  }, [product, imageSrc]);

  useEffect(() => {
    if (galleryImages.length) {
      setSelectedImage((prev) => prev || galleryImages[0]);
    }
  }, [galleryImages]);

  const handleAdd = () => {
    if (!user) {
      onRequireAuth?.();
      return;
    }
    if (!product || stock <= 0) return;
    addToCart({
      ...product,
      name: `${product.name} — ${selectedSize}${selectedColor ? ` — ${selectedColor}` : ''}`
    });
  };

  return (
    <div className="w-full mx-auto px-6 py-12">
      <div className="grid grid-cols-[minmax(420px,1fr)_1fr] gap-10">
        {/* Left: Image */}
        <div className="w-full rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {hasPromo && (
            <div className="absolute top-4 left-4 z-20 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
              -{formatPromotionPercentBadge(promo)}%
            </div>
          )}
          <div className="relative aspect-[4/5] w-full bg-gray-100 flex items-center justify-center overflow-hidden">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={product.name}
                decoding="async"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.style.display = 'none';
                }}
              />
            ) : (
              <div className="text-sm text-slate-400">No image</div>
            )}
          </div>
          {galleryImages.length > 1 && (
            <div className="grid grid-cols-4 gap-3 p-4 bg-white">
              {galleryImages.slice(0, 4).map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(src)}
                  className={`overflow-hidden rounded-3xl border transition ${selectedImage === src ? 'border-black ring-2 ring-black/10' : 'border-gray-200 hover:border-gray-400'}`}
                >
                  <img src={src} alt={`${product.name} ${index + 1}`} className="h-20 w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="max-w-xl">
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900">{product.name}</h1>
          <div className="mt-2 mb-4">
            {hasValidPrice ? (
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-2xl font-semibold text-gray-900">${(hasPromo ? discountedPrice : basePrice).toFixed(2)}</span>
                {hasPromo && (
                  <>
                    <span className="text-base text-gray-500 line-through font-normal">${basePrice.toFixed(2)}</span>
                    <span className="text-xs bg-red-600 text-white font-bold px-2 py-1 rounded-md">-{formatPromotionPercentBadge(promo)}%</span>
                  </>
                )}
              </div>
            ) : (
              <div className="text-2xl font-semibold text-gray-900">$—</div>
            )}
          </div>

          {/* Delivery info bar */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
              <CheckCircle2 size={18} className="text-indigo-600" />
              <span>Free delivery on orders over $100.</span>
            </div>
          </div>

          {/* Size Selector */}
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-3">Select Size</div>
            <div className="flex gap-3 flex-wrap">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSize(s)}
                  className={
                    selectedSize === s
                      ? 'px-8 py-4 rounded-full bg-black text-white text-sm font-semibold border border-black'
                      : 'px-8 py-4 rounded-full bg-gray-100 text-gray-700 text-sm font-semibold border border-transparent hover:bg-gray-200'
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector (only if product has colors) */}
          {Array.isArray(product.colors) && product.colors.length > 0 && (
            <div className="mb-6">
              <div className="text-sm font-medium text-gray-700 mb-3">Select Color</div>
              <div className="flex gap-3 flex-wrap">
                {product.colors.map((c, idx) => (
                  <button
                    key={`${c}-${idx}`}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    aria-label={`color-${c}`}
                    title={c}
                    className={
                      selectedColor === c
                        ? 'w-11 h-11 rounded-full border border-black ring-2 ring-black/10'
                        : 'w-11 h-11 rounded-full border border-gray-200 hover:border-gray-400'
                    }
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handleAdd}
              disabled={stock <= 0}
              className={
                stock <= 0
                  ? 'flex-1 bg-black text-white py-4 rounded-full font-semibold opacity-50 cursor-not-allowed'
                  : 'flex-1 bg-black text-white py-4 rounded-full font-semibold hover:opacity-90 transition'
              }
            >
              Add to Cart
            </button>
            <button
              aria-label="wishlist"
              type="button"
              onClick={() => {
                if (!user) {
                  onRequireAuth?.();
                  return;
                }
                if (toggleWishlist && product) toggleWishlist(product.id);
                setWishlisted((w) => !w);
              }}
              className="w-12 h-12 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-gray-300"
            >
              <Heart size={18} className={wishlisted ? 'text-gray-900' : 'text-gray-600'} fill={wishlisted ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Description & Fit (accordion) */}
          <div className="rounded-2xl border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4"
            >
              <span className="text-base font-semibold text-gray-900">Description &amp; Fit</span>
              <ChevronDown size={18} className={detailsOpen ? 'text-gray-600 rotate-180 transition-transform' : 'text-gray-600 transition-transform'} />
            </button>
            {detailsOpen && (
              <div className="px-5 pb-5">
                <p className="text-gray-600 text-sm leading-6">{product.description || '—'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;