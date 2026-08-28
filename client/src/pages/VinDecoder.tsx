import React, { useState, useRef } from "react";
import { useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  Building2,
  Car,
  Star,
  Package,
  Truck,
  Wrench,
  Zap,
  Fuel,
  Gauge,
  Globe2,
  MapPin,
  BarChart3,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import "./VinDecoder.css";

interface DecodedVehicle {
  year?: string | number;
  make?: string;
  model?: string;
  trim?: string;
  bodyClass?: string;
  vehicleType?: string;
  engineCylinders?: string | number;
  displacement?: string;
  fuelType?: string;
  driveType?: string | null;
  manufacturer?: string;
  plantCountry?: string;
  [key: string]: any;
}

export default function VinDecoder() {
  const [vin, setVin] = useState("");
  const [decodedVehicle, setDecodedVehicle] = useState<DecodedVehicle | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [vinHistory, setVinHistory] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productsTotal, setProductsTotal] = useState<number>(0);
  const [productsLoading, setProductsLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  // Load VIN history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("vinDecoder_history");
      if (stored) {
        setVinHistory(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const decodeVinMutation = trpc.vinDecoder.decode.useQuery(
    { vin: vin.toUpperCase() },
    {
      enabled: false, // Don't auto-run; we'll trigger manually
      retry: 1,
    }
  );

  const filterProductsQuery = trpc.vinDecoder.filterProducts.useQuery(
    { vin: vin.toUpperCase(), limit: 20, offset: 0 },
    { enabled: false }
  );

  const handleDecodeVin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vin.trim()) {
      toast.error("Please enter a VIN");
      return;
    }

    setIsLoading(true);
    setDecodedVehicle(null);

    try {
      const result = await decodeVinMutation.refetch();

      if (result.data) {
        // Extract the decode object from the API response
        const decodedData = result.data.decode || result.data;
        setDecodedVehicle(decodedData);

        // Add to history
        const newHistory = [
          vin.toUpperCase(),
          ...vinHistory.filter(v => v !== vin.toUpperCase()),
        ].slice(0, 10);
        setVinHistory(newHistory);
        try {
          localStorage.setItem(
            "vinDecoder_history",
            JSON.stringify(newHistory)
          );
        } catch {}

        toast.success("VIN decoded successfully!");
      }
    } catch (error: any) {
      const message =
        error?.message ||
        "Failed to decode VIN. Please check the VIN and try again.";
      toast.error(message);
      setDecodedVehicle(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindProducts = async () => {
    if (!vin.trim()) {
      toast.error("Please enter a VIN to search for products");
      return;
    }

    setProducts([]);
    setProductsLoading(true);
    try {
      const res = await filterProductsQuery.refetch();
      if (res.data) {
        setProducts(res.data.products || []);
        setProductsTotal(res.data.totalMatches || 0);

        // Move focus to results for keyboard users
        setTimeout(() => {
          resultsRef.current?.focus();
        }, 50);

        toast.success(
          `Found ${res.data.totalMatches || 0} products matching the VIN`
        );
      }
    } catch (err) {
      toast.error("Failed to search products for this VIN");
    } finally {
      setProductsLoading(false);
    }
  };

  const handleHistoryClick = (historyVin: string) => {
    setVin(historyVin);
  };

  const handleClearHistory = () => {
    setVinHistory([]);
    try {
      localStorage.removeItem("vinDecoder_history");
    } catch {}
  };

  const renderVehicleInfo = () => {
    if (!decodedVehicle) return null;

    // Define all fields in order of importance with Lucide icons
    const fieldsByPriority = [
      // Tier 1: Core Identity (Most Important)
      {
        label: "Year",
        value: decodedVehicle.year,
        Icon: Calendar,
        priority: 1,
      },
      {
        label: "Make",
        value: decodedVehicle.make,
        Icon: Building2,
        priority: 1,
      },
      { label: "Model", value: decodedVehicle.model, Icon: Car, priority: 1 },
      { label: "Trim", value: decodedVehicle.trim, Icon: Star, priority: 1 },

      // Tier 2: Body & Type
      {
        label: "Body Class",
        value: decodedVehicle.bodyClass,
        Icon: Package,
        priority: 2,
      },
      {
        label: "Vehicle Type",
        value: decodedVehicle.vehicleType,
        Icon: Truck,
        priority: 2,
      },

      // Tier 3: Engine Specifications
      {
        label: "Engine Cylinders",
        value: decodedVehicle.engineCylinders,
        Icon: Wrench,
        priority: 3,
      },
      {
        label: "Displacement",
        value: decodedVehicle.displacement,
        Icon: Zap,
        priority: 3,
      },
      {
        label: "Fuel Type",
        value: decodedVehicle.fuelType,
        Icon: Fuel,
        priority: 3,
      },
      {
        label: "Drive Type",
        value: decodedVehicle.driveType,
        Icon: Gauge,
        priority: 3,
      },

      // Tier 4: Manufacturing
      {
        label: "Manufacturer",
        value: decodedVehicle.manufacturer,
        Icon: Building2,
        priority: 4,
      },
      {
        label: "Plant Country",
        value: decodedVehicle.plantCountry,
        Icon: Globe2,
        priority: 4,
      },
    ];

    // Helper to get fields for a specific priority level, filtering out empty values
    const getSectionFields = (priority: number) => {
      return fieldsByPriority.filter(f => f.priority === priority && f.value);
    };

    return (
      <div className="vin-decoder-result">
        <div className="result-header">
          <h2>
            <CheckCircle2 className="inline-block w-6 h-6 mr-2 text-green-600" />
            Vehicle Decoded Successfully
          </h2>
          <p className="vin-display">
            VIN: <code>{vin}</code>
          </p>
        </div>

        {/* Tier 1: Core Vehicle Identity */}
        {getSectionFields(1).length > 0 && (
          <div className="info-section">
            <div className="section-title">
              <span className="title-icon">
                <Car className="w-6 h-6" />
              </span>
              <h3>Vehicle Identity</h3>
            </div>
            <div className="section-grid tier-1">
              {getSectionFields(1).map(({ label, value, Icon }) => (
                <div key={label} className="elegant-info-card">
                  <div className="card-icon">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="card-content">
                    <div className="card-label">{label}</div>
                    <div className="card-value">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tier 2: Body & Type */}
        {getSectionFields(2).length > 0 && (
          <div className="info-section">
            <div className="section-title">
              <span className="title-icon">
                <ClipboardList className="w-6 h-6" />
              </span>
              <h3>Body & Configuration</h3>
            </div>
            <div className="section-grid tier-2">
              {getSectionFields(2).map(({ label, value, Icon }) => (
                <div key={label} className="elegant-info-card">
                  <div className="card-icon">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="card-content">
                    <div className="card-label">{label}</div>
                    <div className="card-value">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tier 3: Engine Specifications */}
        {getSectionFields(3).length > 0 && (
          <div className="info-section">
            <div className="section-title">
              <span className="title-icon">
                <Zap className="w-6 h-6" />
              </span>
              <h3>Engine Specifications</h3>
            </div>
            <div className="section-grid tier-3">
              {getSectionFields(3).map(({ label, value, Icon }) => (
                <div key={label} className="elegant-info-card">
                  <div className="card-icon">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="card-content">
                    <div className="card-label">{label}</div>
                    <div className="card-value">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tier 4: Manufacturing */}
        {getSectionFields(4).length > 0 && (
          <div className="info-section">
            <div className="section-title">
              <span className="title-icon">
                <Building2 className="w-6 h-6" />
              </span>
              <h3>Manufacturing Information</h3>
            </div>
            <div className="section-grid tier-4">
              {getSectionFields(4).map(({ label, value, Icon }) => (
                <div key={label} className="elegant-info-card">
                  <div className="card-icon">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="card-content">
                    <div className="card-label">{label}</div>
                    <div className="card-value">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Fields Not in Standard Set */}
        {Object.entries(decodedVehicle).some(
          ([key]) =>
            ![
              "year",
              "make",
              "model",
              "trim",
              "bodyClass",
              "vehicleType",
              "engineCylinders",
              "displacement",
              "fuelType",
              "driveType",
              "manufacturer",
              "plantCountry",
            ].includes(key)
        ) && (
          <div className="info-section">
            <div className="section-title">
              <span className="title-icon">
                <BarChart3 className="w-6 h-6" />
              </span>
              <h3>Additional Information</h3>
            </div>
            <div className="section-grid tier-extra">
              {Object.entries(decodedVehicle).map(([key, value]) => {
                if (
                  [
                    "year",
                    "make",
                    "model",
                    "trim",
                    "bodyClass",
                    "vehicleType",
                    "engineCylinders",
                    "displacement",
                    "fuelType",
                    "driveType",
                    "manufacturer",
                    "plantCountry",
                  ].includes(key) ||
                  !value
                ) {
                  return null;
                }

                return (
                  <div key={key} className="elegant-info-card">
                    <div className="card-icon">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div className="card-content">
                      <div className="card-label">{key}</div>
                      <div className="card-value">{JSON.stringify(value)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <SEOHead
        pageType="generic"
        title="VIN Decoder — MotorVault"
        description="Decode a Vehicle Identification Number (VIN) to get make, model, year, engine and manufacturing details. Find compatible parts and products by VIN."
        canonical="https://motorvault.shop/vin-decoder"
        keywords={[
          "VIN decoder",
          "vehicle lookup",
          "VIN lookup",
          "compatible parts",
          "motor parts",
        ]}
      />
      <div className="vin-decoder-container">
        <div className="vin-decoder-wrapper">
          <h1>VIN Decoder</h1>
          <p className="description">
            Enter a Vehicle Identification Number (VIN) to decode vehicle
            information. A VIN is a 17-character code unique to each vehicle.
          </p>

          <form onSubmit={handleDecodeVin} className="vin-decoder-form">
            <div className="form-group">
              <label htmlFor="vin-input">
                Vehicle Identification Number (VIN)
              </label>
              <input
                id="vin-input"
                type="text"
                value={vin}
                onChange={e => setVin(e.target.value.toUpperCase())}
                placeholder="e.g., JH4KA7561PC008269"
                maxLength={17}
                disabled={isLoading}
                className="vin-input"
              />
              <small>Enter a 17-character VIN code</small>
            </div>

            <button
              type="submit"
              disabled={isLoading || !vin.trim()}
              className="decode-button"
            >
              {isLoading ? "Decoding..." : "Decode VIN"}
            </button>
          </form>

          {/* VIN History */}
          {vinHistory.length > 0 && (
            <div className="vin-history">
              <div className="history-header">
                <h3>Recent Searches</h3>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="clear-history-button"
                  aria-label="Clear history"
                >
                  Clear
                </button>
              </div>
              <div className="history-list">
                {vinHistory.map((historyVin, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleHistoryClick(historyVin)}
                    className="history-item"
                  >
                    {historyVin}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Find compatible products */}
          <div className="vin-product-search">
            <button
              type="button"
              className="find-products-button"
              onClick={handleFindProducts}
              disabled={productsLoading || !vin.trim()}
              aria-controls="vin-product-results"
              aria-expanded={products.length > 0}
            >
              {productsLoading
                ? "Searching products..."
                : "Find Compatible Products"}
            </button>
          </div>

          {/* Decoded Vehicle Information */}
          {renderVehicleInfo()}

          {/* Product Results (ARIA live and keyboard accessible) */}
          <div
            id="vin-product-results"
            ref={resultsRef}
            tabIndex={-1}
            aria-live="polite"
            className="vin-product-results"
          >
            <div className="results-header">
              <h3>Product Matches</h3>
              <p className="sr-only" aria-hidden={false}>
                {productsTotal} products found
              </p>
            </div>

            {productsLoading && <p>Searching for compatible products…</p>}

            {!productsLoading && products.length === 0 && (
              <p className="no-results">
                No matching products found for this VIN.
              </p>
            )}

            {!productsLoading && products.length > 0 && (
              <ul className="product-list" role="list">
                {products.map((p: any) => (
                  <li key={p.id} className="product-item" role="listitem">
                    <a href={`/product/${p.id}`} className="product-link">
                      <div className="product-thumb">
                        {p.images && p.images[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.name || "Product image"}
                          />
                        ) : (
                          <div className="product-placeholder" aria-hidden>
                            Image
                          </div>
                        )}
                      </div>
                      <div className="product-meta">
                        <div className="product-name">{p.name}</div>
                        <div className="product-price">${p.price}</div>
                        <div className="product-snippet">
                          {(p.description || "").slice(0, 120)}
                        </div>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Info Box */}
          <div className="info-box">
            <h3>About VIN Decoding</h3>
            <ul>
              <li>
                A VIN (Vehicle Identification Number) is a unique 17-character
                code assigned to each vehicle.
              </li>
              <li>
                The VIN contains encoded information about the vehicle's
                manufacturer, model, year, and features.
              </li>
              <li>
                VINs follow the ISO 3779 standard and are displayed on the
                vehicle's dashboard and registration.
              </li>
              <li>
                This decoder provides information such as year, make, model,
                engine type, and more.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
