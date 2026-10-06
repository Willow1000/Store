"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Heart,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import currencyClient from "@/lib/currencyClient";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Link } from "wouter";
import { useProductById } from "@/hooks/useSupabaseProducts";
import { useSupabaseCart, useSupabaseWishlist } from "@/hooks/useSupabaseCart";
import { useAuth } from "@/_core/hooks/useAuth";
import { getHighResImageUrl } from "@/lib/images";
import { trackAddToCart } from "@/hooks/useMetaPixel";
import { buildContactHref, getEnquiryCopy } from "@/lib/enquiry";
import { getSiteLanguage } from "@/lib/language";
import { ProductImage } from "@/components/ProductImage";
import { formatMoney, getPricing } from "@/lib/pricing";

interface QuickViewModalProps {
  productId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({
  productId,
  isOpen,
  onClose,
}: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const { user, isAuthenticated } = useAuth();
  const { product, images, isLoading } = useProductById(productId);
  // Use centralized currency client for symbol, code and rate
  const currencyCode = currencyClient.getCurrencyCode();
  const { addToCart } = useSupabaseCart(user?.id || null);
  const { wishedProductIds, toggleWishlist } = useSupabaseWishlist(
    user?.id || null
  );

  // Combine cover image with product images
  const allImages = product?.cover_image_url
    ? [{ id: "cover", image_url: product.cover_image_url }, ...(images || [])]
    : images || [];

  const currentImage = allImages[selectedImageIdx];
  const isWishlisted = product?.id && wishedProductIds.has(product.id);
  const stock = Number(product?.stock ?? 0);
  const isOutOfStock = stock === 0;
  const enquiryCopy = getEnquiryCopy(getSiteLanguage());
  const outOfStockParams = new URLSearchParams({
    subject: `${enquiryCopy.quickViewOutOfStockSubject} - ${product?.title || ""}`,
    message: enquiryCopy.quickViewOutOfStockMessage(product?.title || ""),
  });
  const outOfStockContactHref = buildContactHref(outOfStockParams);

  const normalizeSpecificKey = (key: string) =>
    key.toLowerCase().replace(/[_\s-]/g, "");
  const formatSpecificLabel = (key: string) =>
    key
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, char => char.toUpperCase());

  const baseSpecifics: Array<[string, string]> = [
    ["Brand", String(product?.brand_details?.name || product?.brand || "")],
    ["Model", String(product?.model || "")],
    ["Condition", String(product?.condition || "")],
    ["Part Number", String(product?.part_number || "")],
    ["Category", String(product?.category_name || "")],
  ].filter((entry): entry is [string, string] =>
    Boolean(entry[1] && entry[1].trim() !== "")
  );

  const existingSpecificKeys = new Set(
    baseSpecifics.map(([key]) => normalizeSpecificKey(key))
  );
  const rawItemSpecifics =
    product?.item_specifics && typeof product.item_specifics === "object"
      ? Object.entries(product.item_specifics)
      : [];

  const additionalSpecifics: Array<[string, string]> = rawItemSpecifics
    .filter(([key, value]) => {
      const normalized = normalizeSpecificKey(key);
      if (existingSpecificKeys.has(normalized)) return false;
      if (value === null || value === undefined) return false;
      const stringValue = String(value).trim();
      return stringValue !== "";
    })
    .map(([key, value]) => [formatSpecificLabel(key), String(value).trim()]);

  const itemSpecificsPreview: Array<[string, string]> = [
    ...baseSpecifics,
    ...additionalSpecifics,
  ].slice(0, 3);

  // Reset zoom and pan when image changes
  useEffect(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, [selectedImageIdx]);

  // Handle drag for panning on mouse and touch devices
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    const nextDragStart = { x: e.clientX - panX, y: e.clientY - panY };
    dragStartRef.current = nextDragStart;
    setIsDragging(true);
    setDragStart(nextDragStart);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    requestAnimationFrame(() => {
      setPanX(e.clientX - dragStartRef.current.x);
      setPanY(e.clientY - dragStartRef.current.y);
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    e.preventDefault();
    isDraggingRef.current = true;
    const nextDragStart = { x: touch.clientX - panX, y: touch.clientY - panY };
    dragStartRef.current = nextDragStart;
    setIsDragging(true);
    setDragStart(nextDragStart);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch || !isDraggingRef.current) return;
    e.preventDefault();
    requestAnimationFrame(() => {
      setPanX(touch.clientX - dragStartRef.current.x);
      setPanY(touch.clientY - dragStartRef.current.y);
    });
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  // Handle scroll zoom
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomSpeed = 0.1;
        const newZoom = Math.min(
          Math.max(zoom - e.deltaY * 0.001 * zoomSpeed, 1),
          3
        );
        setZoom(newZoom);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [zoom]);

  const handleAddToCart = async () => {
    if (isOutOfStock) {
      toast.error(
        "This item is out of stock. Please contact support for more information."
      );
      return;
    }

    // Allow guests to add to cart via hook (hook handles localStorage when no user)

    if (!product?.id) {
      toast.error("Product information is missing");
      return;
    }

    try {
      const added = await addToCart(product.id, quantity);
      if (!added) {
        toast.error("Failed to add to cart");
        return;
      }
      trackAddToCart(
        product.id,
        product.title,
        Number(product.price) || 0,
        quantity
      );
      toast.success(`Added ${quantity} item(s) to cart!`);
      setQuantity(1);
      onClose();
    } catch (error) {
      toast.error("Failed to add to cart");
    }
  };

  const handleWishlist = async () => {
    if (product?.id) {
      try {
        setIsTogglingWishlist(true);
        const wasWishlisted = wishedProductIds.has(product.id);
        const updated = await toggleWishlist(product.id);
        if (!updated) {
          toast.error("Failed to toggle wishlist");
          return;
        }
        toast.success(
          wasWishlisted ? "Removed from wishlist" : "Added to wishlist!"
        );
      } catch (error) {
        toast.error("Failed to toggle wishlist");
      } finally {
        setIsTogglingWishlist(false);
      }
    }
  };

  const pricing = product ? getPricing(product) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-[calc(100%-1.5rem)] overflow-y-auto p-4 sm:max-w-3xl sm:p-6">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-md" />
            </div>
          </div>
        ) : product ? (
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
            {/* Image Gallery */}
            <div className="min-w-0 space-y-3">
              {/* Main Image */}
              <div className="relative" ref={imageContainerRef}>
                {currentImage ? (
                  <>
                    <div
                      className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-well"
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                      style={{
                        cursor: isDragging ? "grabbing" : "grab",
                        touchAction: "none",
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        WebkitTouchCallout: "none",
                      }}
                    >
                      <img
                        src={getHighResImageUrl(currentImage.image_url)}
                        alt={product.title}
                        className="pointer-events-none h-full w-full select-none object-contain p-3 mix-blend-multiply will-change-transform"
                        style={{
                          transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`,
                          transformOrigin: "center center",
                        }}
                        fetchPriority="high"
                        referrerPolicy="no-referrer"
                        loading="eager"
                        decoding="async"
                      />
                    </div>

                    {pricing?.percentOff ? (
                      <span className="price pointer-events-none absolute left-2 top-2 rounded bg-brand px-1.5 py-0.5 text-xs font-bold text-white">
                        -{pricing.percentOff}%
                      </span>
                    ) : null}

                    {/* Zoom Controls */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-full border border-gray-200 bg-white/95 p-1 shadow-sm backdrop-blur-sm">
                      <button
                        onClick={() => setZoom(Math.max(zoom - 0.2, 1))}
                        disabled={zoom <= 1}
                        className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Zoom out"
                        title="Zoom out"
                      >
                        <ZoomOut size={15} className="text-gray-700" />
                      </button>
                      <div className="price min-w-9 text-center text-xs font-medium text-gray-700">
                        {Math.round(zoom * 100)}%
                      </div>
                      <button
                        onClick={() => setZoom(Math.min(zoom + 0.2, 3))}
                        disabled={zoom >= 3}
                        className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Zoom in"
                        title="Zoom in"
                      >
                        <ZoomIn size={15} className="text-gray-700" />
                      </button>
                    </div>
                    {selectedImageIdx > 0 && (
                      <button
                        onClick={() =>
                          setSelectedImageIdx(selectedImageIdx - 1)
                        }
                        className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 shadow-sm transition-colors hover:bg-white"
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={18} className="text-gray-700" />
                      </button>
                    )}
                    {selectedImageIdx < allImages.length - 1 && (
                      <button
                        onClick={() =>
                          setSelectedImageIdx(selectedImageIdx + 1)
                        }
                        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 shadow-sm transition-colors hover:bg-white"
                        aria-label="Next image"
                      >
                        <ChevronRight size={18} className="text-gray-700" />
                      </button>
                    )}
                  </>
                ) : (
                  <ProductImage
                    src={null}
                    alt={product.title}
                    className="aspect-square w-full rounded-lg"
                  />
                )}
              </div>

              {/* Thumbnail Row */}
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {(() => {
                    const isMobile = window.innerWidth < 640; // sm breakpoint
                    const windowSize = isMobile ? 4 : 6; // 4 on mobile, 6 on desktop
                    const startIdx = Math.max(
                      0,
                      Math.min(selectedImageIdx, allImages.length - windowSize)
                    );
                    const imagesToShow = allImages.slice(
                      startIdx,
                      startIdx + windowSize
                    );

                    return imagesToShow.map((img, idx) => {
                      const actualImageIndex = startIdx + idx;
                      const isSelected = selectedImageIdx === actualImageIndex;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIdx(actualImageIndex)}
                          aria-label={`${product.title} thumbnail ${actualImageIndex}`}
                          className={`relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border transition-colors ${
                            isSelected
                              ? "border-ink ring-1 ring-ink"
                              : "border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          <ProductImage
                            src={img.image_url}
                            alt=""
                            compactFallback
                            className="h-full w-full"
                            imgClassName="p-0.5"
                          />
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex min-w-0 flex-col gap-4">
              <div>
                {(product.brand || product.condition) && (
                  <p className="eyebrow mb-1.5">
                    {[product.brand, product.condition]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                <DialogTitle className="pr-6 font-display text-lg font-bold leading-snug text-ink sm:text-xl">
                  {product.title}
                </DialogTitle>
              </div>

              {/* Price */}
              <div>
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <p className="price text-2xl font-bold text-ink">
                    {formatMoney(product.price)}
                  </p>
                  {pricing?.compareAt ? (
                    <p className="price text-sm text-gray-500 line-through">
                      {formatMoney(pricing.compareAt)}
                    </p>
                  ) : null}
                </div>
                {pricing?.savings ? (
                  <p className="mt-1 text-[13px] font-semibold text-brand">
                    <span>You save</span>{" "}
                    <span className="price">
                      {formatMoney(pricing.savings)}
                    </span>
                  </p>
                ) : null}
                <p
                  className={`mt-2 flex items-center gap-2 text-[13px] font-medium ${isOutOfStock ? "text-brand" : "text-success"}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${isOutOfStock ? "bg-brand" : "bg-success"}`}
                    aria-hidden="true"
                  />
                  {isOutOfStock ? "Out of stock" : `${stock} in stock`}
                </p>
              </div>

              {itemSpecificsPreview.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-2 text-[13px] font-semibold text-ink">
                    Item Specifics
                  </p>
                  <div className="space-y-1.5">
                    {itemSpecificsPreview.map(([label, value]) => (
                      <div
                        key={`${label}-${value}`}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-xs text-gray-600">{label}</span>
                        <span className="truncate text-right text-xs font-medium text-ink">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href={`/product/${product.id}`}
                    className="mt-3 inline-block text-xs font-semibold text-ink underline underline-offset-2"
                    onClick={onClose}
                  >
                    View full item specifics
                  </Link>
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center gap-3">
                <label className="text-[13px] font-medium text-ink">
                  Quantity:
                </label>
                <div className="inline-flex items-center rounded-md border border-gray-300">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    aria-label="Decrease quantity"
                    className="flex h-11 w-11 items-center justify-center sm:h-10 sm:w-10 rounded-l-md text-gray-700 hover:bg-gray-100"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={e =>
                      setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    aria-label="Quantity"
                    className="price h-10 w-12 border-0 bg-transparent text-center text-sm font-semibold focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    min="1"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    aria-label="Increase quantity"
                    className="flex h-11 w-11 items-center justify-center sm:h-10 sm:w-10 rounded-r-md text-gray-700 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Out of Stock Alert */}
              {isOutOfStock && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5">
                  <p className="mb-1 text-sm font-semibold text-ink">
                    This item is currently out of stock
                  </p>
                  <p className="text-sm text-gray-700">
                    Please{" "}
                    <a
                      href={outOfStockContactHref}
                      className="font-medium text-ink underline underline-offset-2"
                    >
                      contact support
                    </a>{" "}
                    for information about when this item will be back in stock.
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="mt-auto flex flex-col gap-2.5">
                <div className="flex gap-2.5">
                  {isOutOfStock ? (
                    <button
                      type="button"
                      disabled
                      className="btn-accent flex-1"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Out of Stock
                    </button>
                  ) : (
                    <button
                      onClick={handleAddToCart}
                      type="button"
                      className="btn-accent flex-1"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add to Cart
                    </button>
                  )}
                  <button
                    onClick={handleWishlist}
                    type="button"
                    disabled={isTogglingWishlist}
                    aria-label={
                      isWishlisted ? "Remove from wishlist" : "Add to wishlist"
                    }
                    className={`flex h-11 w-11 flex-none items-center justify-center rounded-md border transition-colors ${
                      isWishlisted
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-gray-300 text-gray-600 hover:border-ink hover:text-ink"
                    } ${isTogglingWishlist ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <Heart
                      className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`}
                    />
                  </button>
                </div>
                <Link
                  href={`/product/${product.id}`}
                  className="btn-secondary btn-block"
                  onClick={onClose}
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-gray-600">Product not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
