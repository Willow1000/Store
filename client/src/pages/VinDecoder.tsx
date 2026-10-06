import React, { useState, useRef } from "react";
import { useEffect } from "react";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { Breadcrumb } from "@/components/Breadcrumb";
import { RelatedLinks } from "@/components/RelatedLinks";
import { VIN_GUIDE_SLUGS, guideLinks } from "@shared/guideLinks";
import { VEHICLES } from "@shared/vehicleContent";
import { ProductCard } from "@/components/ProductCard";
import { ShareButton } from "@/components/ShareButton";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuickAdd } from "@/hooks/useQuickAdd";
import { buildContactHref, getEnquiryCopy } from "@/lib/enquiry";
import { getSiteLanguage } from "@/lib/language";
import {
  ArrowRight,
  Building2,
  Car,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  FileText,
  Loader2,
  MessageCircle,
  RefreshCw,
  ScanLine,
  Search,
  SearchX,
  WifiOff,
  Zap,
} from "lucide-react";

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

/** What the result area is showing. */
type DecodeStatus =
  | "idle"
  | "loading"
  | "result"
  | "not-found"
  | "invalid"
  | "network-error"
  | "server-error";

const VIN_LENGTH = 17;
/** VINs are letters and digits, and never use I, O or Q (ISO 3779). */
const VIN_ALLOWED = /^[A-HJ-NPR-Z0-9]*$/;

const KNOWN_FIELDS = [
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
];

/** Paste-friendly: drop spaces and dashes, uppercase, cap at 17. */
function normalizeVinInput(raw: string) {
  return raw.toUpperCase().replace(/[\s-]/g, "").slice(0, VIN_LENGTH);
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

/** "plantCompanyName" -> "Plant Company Name" for fields we have no label for. */
function humanizeKey(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, c => c.toUpperCase());
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Everyday names the same make is listed under in product titles. */
function makeAliases(make: string): string[] {
  const aliases = new Set<string>([make]);
  if (make.includes("mercedes")) aliases.add("mercedes");
  if (make.includes("volkswagen")) aliases.add("vw");
  if (make === "vw") aliases.add("volkswagen");
  if (make.includes("chevrolet")) aliases.add("chevy");
  if (make.includes("land rover")) aliases.add("landrover");
  return Array.from(aliases).filter(Boolean);
}

function containsWord(haystack: string, needle: string) {
  if (!needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

const VIN_GUIDES = guideLinks(VIN_GUIDE_SLUGS);

export default function VinDecoder() {
  const [vin, setVin] = useState("");
  const [decodedVehicle, setDecodedVehicle] = useState<DecodedVehicle | null>(
    null
  );
  // The VIN the current result/error belongs to. The input stays editable, so
  // the result must not relabel itself while the next VIN is being typed.
  const [decodedVin, setDecodedVin] = useState("");
  const [attribution, setAttribution] = useState<string | null>(null);
  const [status, setStatus] = useState<DecodeStatus>("idle");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [vinHistory, setVinHistory] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const outcomeRef = useRef<HTMLDivElement | null>(null);

  const { user } = useAuth();
  const { addProduct, pendingId } = useQuickAdd(user?.id || null);

  const isLoading = status === "loading";

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

  const handleFindProducts = async (options?: { silent?: boolean }) => {
    if (!vin.trim()) {
      if (!options?.silent) {
        toast.error("Please enter a VIN to search for products");
      }
      return;
    }

    setProducts([]);
    setProductsLoading(true);
    try {
      const res = await filterProductsQuery.refetch();
      if (res.data) {
        setProducts(res.data.products || []);

        if (!options?.silent) {
          setTimeout(() => {
            resultsRef.current?.focus();
          }, 50);
        }
      } else if (res.error && !options?.silent) {
        toast.error("Failed to search products for this VIN");
      }
    } catch {
      if (!options?.silent) {
        toast.error("Failed to search products for this VIN");
      }
    } finally {
      setProductsLoading(false);
    }
  };

  // ---- Live validation (presentation only; the server validates again) ----
  const hasInvalidChars = !VIN_ALLOWED.test(vin);
  const isCompleteVin = vin.length === VIN_LENGTH && !hasInvalidChars;
  const showLengthError =
    showValidation && vin.length > 0 && vin.length < VIN_LENGTH;
  const inputHasError = hasInvalidChars || showLengthError;

  const revealOutcome = () => {
    // Bring the answer into view on small screens, where it starts below the
    // form and keyboard.
    setTimeout(() => {
      outcomeRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);
  };

  const handleDecodeVin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vin.trim()) {
      setShowValidation(true);
      inputRef.current?.focus();
      return;
    }

    // Catch what the server would reject anyway, without the round trip.
    if (!isCompleteVin) {
      setShowValidation(true);
      inputRef.current?.focus();
      return;
    }

    const submittedVin = vin.toUpperCase();
    setShowValidation(false);
    setStatus("loading");
    setErrorDetail(null);
    setDecodedVehicle(null);
    setDecodedVin(submittedVin);
    setProducts([]);

    try {
      const result = await decodeVinMutation.refetch();

      if (result.data) {
        // Extract the decode object from the API response
        const decodedData: DecodedVehicle =
          result.data.decode || (result.data as any);
        setAttribution(
          typeof result.data.attribution === "string"
            ? result.data.attribution
            : null
        );

        // Add to history
        const newHistory = [
          submittedVin,
          ...vinHistory.filter(v => v !== submittedVin),
        ].slice(0, 10);
        setVinHistory(newHistory);
        try {
          localStorage.setItem(
            "vinDecoder_history",
            JSON.stringify(newHistory)
          );
        } catch {}

        // The service answers "ok" with every field empty for a well-formed
        // VIN it does not know. That is not a decoded vehicle.
        const identified = KNOWN_FIELDS.some(key => hasValue(decodedData[key]));
        if (!identified) {
          setDecodedVehicle(null);
          setStatus("not-found");
          revealOutcome();
          return;
        }

        setDecodedVehicle(decodedData);
        setStatus("result");
        toast.success("VIN decoded successfully!");
        revealOutcome();

        // Look up matching listings automatically - no need for the
        // shopper to ask in a second step.
        handleFindProducts({ silent: true });
        return;
      }

      // refetch() resolves (it does not throw) when the request fails, so the
      // failure has to be read off the result.
      const error: any = result.error;
      const code = error?.data?.code;
      setDecodedVehicle(null);
      if (code === "BAD_REQUEST") {
        setErrorDetail(error?.message || null);
        setStatus("invalid");
      } else if (code) {
        setErrorDetail(error?.message || null);
        setStatus("server-error");
      } else {
        // No tRPC error payload at all: the request never got an answer.
        setStatus("network-error");
      }
      revealOutcome();
    } catch {
      setDecodedVehicle(null);
      setStatus("network-error");
      revealOutcome();
    }
  };

  const handleHistoryClick = (historyVin: string) => {
    setVin(normalizeVinInput(historyVin));
    setShowValidation(false);
    inputRef.current?.focus();
  };

  const handleClearHistory = () => {
    setVinHistory([]);
    try {
      localStorage.removeItem("vinDecoder_history");
    } catch {}
  };

  // ---- Derived presentation data for a decoded vehicle ----------------------
  const vehicle = decodedVehicle;
  const makeLabel = hasValue(vehicle?.make) ? String(vehicle?.make) : "";
  const modelLabel = hasValue(vehicle?.model) ? String(vehicle?.model) : "";
  const vehicleHeadline = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
        .filter(hasValue)
        .join(" ")
    : "";
  const makeModelLabel = [makeLabel, modelLabel].filter(Boolean).join(" ");

  const engineSummary = (() => {
    if (!vehicle) return "";
    const parts: string[] = [];
    if (hasValue(vehicle.displacement)) {
      const litres = Number(vehicle.displacement);
      // The service reports litres ("3.5", "2.00"); only add the unit when
      // the figure is plausibly litres.
      parts.push(
        Number.isFinite(litres) && litres > 0 && litres < 20
          ? `${litres.toFixed(1)} L`
          : String(vehicle.displacement)
      );
    }
    if (hasValue(vehicle.engineCylinders)) {
      parts.push(`${vehicle.engineCylinders} cyl`);
    }
    return parts.join(" · ");
  })();

  const specGroups = vehicle
    ? [
        {
          title: "Vehicle Identity",
          Icon: Car,
          rows: [
            { label: "Year", value: vehicle.year },
            { label: "Make", value: vehicle.make },
            { label: "Model", value: vehicle.model },
            { label: "Trim", value: vehicle.trim },
          ],
        },
        {
          title: "Body & Configuration",
          Icon: ClipboardList,
          rows: [
            { label: "Body Class", value: vehicle.bodyClass },
            { label: "Vehicle Type", value: vehicle.vehicleType },
            { label: "Drive Type", value: vehicle.driveType },
          ],
        },
        {
          title: "Engine Specifications",
          Icon: Zap,
          rows: [
            { label: "Engine Cylinders", value: vehicle.engineCylinders },
            { label: "Displacement", value: vehicle.displacement },
            { label: "Fuel Type", value: vehicle.fuelType },
          ],
        },
        {
          title: "Manufacturing Information",
          Icon: Building2,
          rows: [
            { label: "Manufacturer", value: vehicle.manufacturer },
            { label: "Plant Country", value: vehicle.plantCountry },
          ],
        },
        {
          // Anything else the service returns, shown as plain rows.
          title: "Additional Information",
          Icon: FileText,
          rows: Object.entries(vehicle)
            .filter(
              ([key, value]) =>
                !KNOWN_FIELDS.includes(key) &&
                hasValue(value) &&
                typeof value !== "object"
            )
            .map(([key, value]) => ({
              label: humanizeKey(key),
              value: value as string | number,
            })),
        },
      ]
        .map(group => ({
          ...group,
          rows: group.rows.filter(row => hasValue(row.value)),
        }))
        .filter(group => group.rows.length > 0)
    : [];

  const quickFacts = vehicle
    ? [
        { label: "Body Class", value: vehicle.bodyClass },
        { label: "Engine", value: engineSummary },
        { label: "Fuel Type", value: vehicle.fuelType },
        { label: "Drive Type", value: vehicle.driveType },
      ].filter(fact => hasValue(fact.value))
    : [];

  // The lookup endpoint ranks the whole catalogue by loose keyword overlap and
  // falls back to the newest products when nothing overlaps. Only listings
  // whose own title/brand/model names this make are shown here, and they are
  // described as text matches - never as confirmed fitment.
  const normalizedMake = normalizeText(makeLabel);
  const normalizedModel = normalizeText(modelLabel);
  const listingMatches = normalizedMake
    ? products
        .map((product: any) => {
          const text = normalizeText(
            `${product.title || ""} ${product.brand || ""} ${product.model || ""}`
          );
          return {
            product,
            mentionsMake: makeAliases(normalizedMake).some(alias =>
              containsWord(text, alias)
            ),
            mentionsModel:
              Boolean(normalizedModel) && containsWord(text, normalizedModel),
          };
        })
        .filter(entry => entry.mentionsMake)
    : [];
  const modelMatches = listingMatches.filter(entry => entry.mentionsModel);
  // Listings that name the model when there are any; otherwise the make. The
  // heading and the onward search link always say which of the two it is.
  const listingsScope = modelMatches.length > 0 ? makeModelLabel : makeLabel;
  const listingsMentioningVehicle = (
    modelMatches.length > 0 ? modelMatches : listingMatches
  ).map(entry => entry.product);

  const searchHref = (term: string) => `/search?q=${encodeURIComponent(term)}`;

  const fitmentEnquiryHref = (() => {
    if (!decodedVin) return "/contact";
    const params = new URLSearchParams();
    if (typeof user?.name === "string" && user.name.trim()) {
      params.set("name", user.name.trim());
    }
    if (typeof user?.email === "string" && user.email.trim()) {
      params.set("email", user.email.trim());
    }
    params.set("enquiry", "1");
    params.set("includeGeo", "0");
    params.set("subject", getEnquiryCopy(getSiteLanguage()).searchSubject);
    params.set(
      "message",
      [`VIN: ${decodedVin}`, vehicleHeadline].filter(Boolean).join("\n")
    );
    return buildContactHref(params);
  })();

  const hintId = "vin-input-hint";

  const renderOutcome = () => {
    if (status === "idle") return null;

    if (status === "loading") {
      return (
        <div
          className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6"
          role="status"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Decoding...</span>
            <span className="price font-mono text-gray-500">{decodedVin}</span>
          </p>
          <div className="mt-5 animate-pulse space-y-4" aria-hidden="true">
            <div className="h-3 w-28 rounded bg-muted" />
            <div className="h-8 w-2/3 rounded bg-muted" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted" />
              ))}
            </div>
            <div className="h-28 rounded-lg bg-muted" />
          </div>
        </div>
      );
    }

    if (status === "result" && vehicle) {
      return renderVehicleInfo();
    }

    const problem =
      status === "not-found"
        ? {
            Icon: SearchX,
            title: "We couldn't identify a vehicle for this VIN",
            body: "The VIN is the right length, but the decoder has no record for it. Check each character against the vehicle or its documents and try again.",
          }
        : status === "invalid"
          ? {
              Icon: CircleAlert,
              title: "That VIN could not be decoded",
              body: "Check that all 17 characters are entered exactly as they appear on the vehicle.",
            }
          : status === "network-error"
            ? {
                Icon: WifiOff,
                title: "We couldn't reach the VIN decoder",
                body: "Check your internet connection and try again.",
              }
            : {
                Icon: CircleAlert,
                title: "The VIN decoder is not responding",
                body: "This is a problem on our side, not with your VIN. Please try again in a moment.",
              };
    const canRetry = status === "network-error" || status === "server-error";
    const ProblemIcon = problem.Icon;

    return (
      <div
        key={status}
        role="alert"
        className="rounded-xl border border-gray-200 bg-gray-50 p-5 sm:p-6"
      >
        <div className="flex gap-4">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-brand-soft">
            <ProblemIcon className="h-5 w-5 text-brand" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold leading-snug text-ink">
              {problem.title}
            </h2>
            <p className="price mt-1 break-all font-mono text-sm text-gray-600">
              {decodedVin}
            </p>
            <p className="mt-3 text-sm text-gray-700">{problem.body}</p>
            {errorDetail &&
              (status === "invalid" || status === "server-error") && (
                <p className="mt-2 text-[13px] text-gray-500">{errorDetail}</p>
              )}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              {canRetry ? (
                <button
                  type="submit"
                  form="vin-decoder-form"
                  className="btn-primary"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Try again
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    inputRef.current?.focus();
                    inputRef.current?.select();
                  }}
                >
                  Edit VIN
                </button>
              )}
              <a href={fitmentEnquiryHref} className="btn-secondary">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderVehicleInfo = () => {
    if (!decodedVehicle) return null;

    return (
      <div className="space-y-8">
        {/* Summary: the answer, readable at a glance */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="bg-gray-950 p-5 text-white sm:p-7">
            <p className="flex items-center gap-2 text-[13px] font-medium text-white/80">
              <CircleCheck
                className="h-4 w-4 flex-none text-emerald-400"
                aria-hidden="true"
              />
              Vehicle Decoded Successfully
            </p>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">
              {vehicleHeadline || decodedVin}
            </h2>
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/70">
              <span>VIN:</span>
              <code className="price break-all rounded bg-white/10 px-2 py-1 font-mono text-[13px] tracking-wider text-white">
                {decodedVin}
              </code>
            </p>
          </div>

          {quickFacts.length > 0 && (
            <dl className="grid grid-cols-2 gap-px bg-gray-200 sm:grid-cols-4">
              {quickFacts.map(fact => (
                <div key={fact.label} className="bg-white p-4 sm:p-5">
                  <dt className="eyebrow">{fact.label}</dt>
                  <dd className="mt-1.5 break-words text-[15px] font-semibold leading-snug text-ink">
                    {fact.value}
                  </dd>
                </div>
              ))}
              {/* Fillers keep the last row white when fewer than four facts
                  were decoded (the grid lines come from the gap colour). */}
              {Array.from({ length: (4 - (quickFacts.length % 4)) % 4 }).map(
                (_, index) => (
                  <div
                    key={`filler-${index}`}
                    aria-hidden="true"
                    className={`bg-white ${
                      index === 0 && quickFacts.length % 2 === 1
                        ? ""
                        : "hidden sm:block"
                    }`}
                  />
                )
              )}
            </dl>
          )}

          {/* Onward links into the catalogue (existing search route) */}
          {makeLabel && (
            <div className="flex flex-col gap-3 border-t border-gray-200 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:p-5">
              {modelLabel && (
                <Link
                  href={searchHref(makeModelLabel)}
                  className="btn-accent whitespace-normal py-2"
                >
                  <Search className="h-4 w-4 flex-none" aria-hidden="true" />
                  <span>
                    <span>Search listings for</span> {makeModelLabel}
                  </span>
                </Link>
              )}
              <Link
                href={searchHref(makeLabel)}
                className={`${modelLabel ? "btn-secondary" : "btn-accent"} whitespace-normal py-2`}
              >
                {!modelLabel && (
                  <Search className="h-4 w-4 flex-none" aria-hidden="true" />
                )}
                <span>
                  <span>Search listings for</span> {makeLabel}
                </span>
              </Link>
              <a
                href={fitmentEnquiryHref}
                className="btn-ghost whitespace-normal py-2"
              >
                <MessageCircle
                  className="h-4 w-4 flex-none"
                  aria-hidden="true"
                />
                Ask us to check fitment
              </a>
            </div>
          )}
        </div>

        {/* Grouped specification details */}
        <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
          {specGroups.map(({ title, Icon, rows }) => (
            <section key={title}>
              <h3 className="flex items-center gap-2 text-base font-bold text-ink">
                <Icon className="h-4 w-4 text-gray-500" aria-hidden="true" />
                {title}
              </h3>
              <dl className="mt-3 divide-y divide-gray-200 border-y border-gray-200 text-sm">
                {rows.map(row => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[9.5rem_1fr] gap-4 py-2.5"
                  >
                    <dt className="text-gray-500">{row.label}</dt>
                    <dd className="break-words font-medium text-ink">
                      {String(row.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        {attribution && <p className="text-xs text-gray-500">{attribution}</p>}
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
      <div className="min-h-screen w-full overflow-x-clip bg-white">
        {/* Page header */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="container py-6 sm:py-8">
            <Breadcrumb
              items={[{ label: "VIN Decoder", href: "/vin-decoder" }]}
              className="mb-3"
              includeStructuredData={false}
            />
            <h1 className="text-ink">VIN Decoder</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-base">
              Enter a Vehicle Identification Number (VIN) to decode vehicle
              information. A VIN is a 17-character code unique to each vehicle.
            </p>
            <ShareButton
              title="VIN Decoder"
              url="/vin-decoder"
              className="-ml-2 mt-2"
            />
          </div>
        </div>

        <div className="container py-6 sm:py-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-12">
            <div className="min-w-0">
              {/* Lookup form */}
              <form
                id="vin-decoder-form"
                onSubmit={handleDecodeVin}
                noValidate
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-card sm:p-6"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <label
                    htmlFor="vin-input"
                    className="text-sm font-semibold text-ink"
                  >
                    Vehicle Identification Number (VIN)
                  </label>
                  <span
                    className={`price flex-none text-xs font-medium ${
                      isCompleteVin
                        ? "text-success"
                        : inputHasError
                          ? "text-brand"
                          : "text-gray-500"
                    }`}
                    aria-hidden="true"
                  >
                    {vin.length} / {VIN_LENGTH}
                  </span>
                </div>

                <div className="mt-2 grid gap-x-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="relative order-1 min-w-0">
                    <ScanLine
                      className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                      aria-hidden="true"
                    />
                    <input
                      id="vin-input"
                      ref={inputRef}
                      type="text"
                      value={vin}
                      onChange={e => {
                        setVin(normalizeVinInput(e.target.value));
                        if (showValidation) setShowValidation(false);
                      }}
                      placeholder="e.g., JH4KA7561PC008269"
                      disabled={isLoading}
                      aria-invalid={inputHasError}
                      aria-describedby={hintId}
                      autoComplete="off"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="go"
                      className={`price h-[3.25rem] w-full rounded-md border bg-white pl-11 pr-11 font-mono text-base uppercase tracking-[0.08em] text-ink outline-none transition-[border-color,box-shadow] placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 sm:text-lg ${
                        inputHasError
                          ? "border-brand focus:border-brand focus:ring-brand/15"
                          : isCompleteVin
                            ? "border-success focus:border-success focus:ring-success/15"
                            : "border-input focus:border-ink focus:ring-ink/10"
                      }`}
                    />
                    {isCompleteVin && (
                      <CircleCheck
                        className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-success"
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-accent btn-lg order-3 mt-3 sm:order-2 sm:mt-0 sm:w-44"
                  >
                    {isLoading ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : null}
                    {isLoading ? "Decoding..." : "Decode VIN"}
                  </button>

                  {/* One line under the field (above the button on phones):
                    hint, live validation, or success */}
                  <p
                    id={hintId}
                    key={
                      hasInvalidChars
                        ? "chars"
                        : showLengthError
                          ? "length"
                          : showValidation && !vin
                            ? "empty"
                            : isCompleteVin
                              ? "ok"
                              : "hint"
                    }
                    role={inputHasError || showValidation ? "alert" : undefined}
                    className={`order-2 mt-2.5 flex items-start gap-1.5 text-[13px] leading-snug sm:order-3 sm:col-span-2 ${
                      inputHasError || (showValidation && !vin)
                        ? "font-medium text-brand"
                        : isCompleteVin
                          ? "font-medium text-success"
                          : "text-gray-600"
                    }`}
                  >
                    {(inputHasError || (showValidation && !vin)) && (
                      <CircleAlert
                        className="mt-px h-4 w-4 flex-none"
                        aria-hidden="true"
                      />
                    )}
                    <span>
                      {hasInvalidChars
                        ? "A VIN uses only letters and numbers, and never the letters I, O or Q."
                        : showLengthError
                          ? "A VIN has exactly 17 characters. Check for a missing character."
                          : showValidation && !vin
                            ? "Please enter a VIN"
                            : isCompleteVin
                              ? "17 characters entered. Ready to decode."
                              : "Enter a 17-character VIN code"}
                    </span>
                  </p>
                </div>

                {/* VIN History */}
                {vinHistory.length > 0 && (
                  <div className="mt-5 border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="eyebrow !font-sans">Recent Searches</h2>
                      <button
                        type="button"
                        onClick={handleClearHistory}
                        className="text-[13px] font-medium text-gray-600 underline underline-offset-4 hover:text-ink"
                        aria-label="Clear history"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
                      {vinHistory.map((historyVin, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleHistoryClick(historyVin)}
                          className="price inline-flex min-h-9 flex-none items-center rounded-full border border-gray-300 bg-white px-3 font-mono text-xs tracking-wider text-ink transition-colors hover:border-ink"
                        >
                          {historyVin}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </form>

              {/* Outcome: loading, decoded vehicle, or what went wrong */}
              <div
                ref={outcomeRef}
                className={status === "idle" ? "" : "mt-8 scroll-mt-24"}
                aria-live="polite"
              >
                {renderOutcome()}
              </div>

              {/* Listings (ARIA live and keyboard accessible) */}
              {status === "result" && decodedVehicle && (
                <div
                  id="vin-product-results"
                  ref={resultsRef}
                  tabIndex={-1}
                  aria-live="polite"
                  className="mt-10 border-t border-gray-200 pt-8 outline-none"
                >
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-ink">
                        <span>Listings that mention</span>{" "}
                        {listingsScope || decodedVin}
                      </h2>
                      <p className="sr-only" aria-hidden={false}>
                        {listingsMentioningVehicle.length} products found
                      </p>
                      <p className="mt-1.5 max-w-2xl text-[13px] text-gray-600">
                        Matched on the make and model named in each listing, not
                        on verified fitment. Confirm compatibility with the
                        listing details or ask us before you buy.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary btn-sm flex-none"
                      onClick={() => handleFindProducts()}
                      disabled={productsLoading || !vin.trim()}
                      aria-controls="vin-product-results"
                      aria-expanded={listingsMentioningVehicle.length > 0}
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${productsLoading ? "animate-spin" : ""}`}
                        aria-hidden="true"
                      />
                      {productsLoading ? "Searching for parts..." : "Refresh"}
                    </button>
                  </div>

                  {productsLoading && (
                    <div
                      className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3"
                      aria-hidden="true"
                    >
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-64 animate-pulse rounded-lg bg-muted"
                        />
                      ))}
                    </div>
                  )}

                  {!productsLoading &&
                    listingsMentioningVehicle.length === 0 && (
                      <div className="rounded-lg border border-dashed border-gray-300 px-5 py-8 text-center">
                        <p className="text-sm font-semibold text-ink">
                          No matching parts found for this vehicle yet.
                        </p>
                        <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
                          <Link
                            href="/products"
                            className="btn-secondary btn-sm"
                          >
                            All Products
                          </Link>
                          <a
                            href={fitmentEnquiryHref}
                            className="btn-primary btn-sm"
                          >
                            Ask us to check fitment
                          </a>
                        </div>
                      </div>
                    )}

                  {!productsLoading && listingsMentioningVehicle.length > 0 && (
                    <>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                        {listingsMentioningVehicle.map((p: any) => (
                          <ProductCard
                            key={p.id}
                            product={p}
                            onAddToCart={addProduct}
                            isAdding={pendingId === p.id}
                          />
                        ))}
                      </div>
                      {makeLabel && (
                        <Link
                          href={searchHref(listingsScope)}
                          className="mt-5 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-ink underline-offset-4 hover:underline"
                        >
                          <span>
                            <span>Search listings for</span> {listingsScope}
                          </span>
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Help: where the VIN is and what it is */}
            <aside className="space-y-6 lg:sticky lg:top-24">
              <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <h2 className="font-sans text-sm font-semibold tracking-normal text-ink">
                  Where to find your VIN
                </h2>
                <ul className="mt-3 space-y-3 text-sm text-gray-700">
                  <li className="flex gap-3">
                    <Car
                      className="mt-0.5 h-4 w-4 flex-none text-gray-500"
                      aria-hidden="true"
                    />
                    <span>
                      On the dashboard, at the base of the windshield on the
                      driver's side.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <ScanLine
                      className="mt-0.5 h-4 w-4 flex-none text-gray-500"
                      aria-hidden="true"
                    />
                    <span>On the label inside the driver's door frame.</span>
                  </li>
                  <li className="flex gap-3">
                    <FileText
                      className="mt-0.5 h-4 w-4 flex-none text-gray-500"
                      aria-hidden="true"
                    />
                    <span>
                      On the vehicle's registration and insurance documents.
                    </span>
                  </li>
                </ul>
              </section>

              {/* Info Box */}
              <section className="px-1">
                <h2 className="font-sans text-sm font-semibold tracking-normal text-ink">
                  About VIN Decoding
                </h2>
                <ul className="mt-3 list-disc space-y-2 pl-4 text-[13px] leading-relaxed text-gray-600 marker:text-gray-400">
                  <li>
                    A VIN (Vehicle Identification Number) is a unique
                    17-character code assigned to each vehicle.
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
              </section>
            </aside>
          </div>

          {/* Where to go once the vehicle is identified */}
          <section className="mt-10 border-t border-gray-200 pt-8">
            <h2 className="text-lg font-bold text-ink">
              Next: find parts that fit
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
              Use the decoded year, model and engine to check each listing's
              fitment, or send us your VIN and we will check a part against it
              before you order.
            </p>
            <RelatedLinks
              className="mt-4"
              links={[
                { href: "/products", label: "Browse all parts" },
                ...VEHICLES.map(vehicle => ({
                  href: `/vehicle/${vehicle.slug}`,
                  label: `${vehicle.name} parts`,
                })),
              ]}
            />
            <h3 className="mt-8 text-base font-semibold text-ink">
              VIN and fitment guides
            </h3>
            <RelatedLinks
              className="mt-3"
              links={[
                ...VIN_GUIDES,
                {
                  href: "/contact?enquiry=1",
                  label: "Ask us to check fitment",
                },
              ]}
            />
          </section>
        </div>
      </div>
    </>
  );
}
