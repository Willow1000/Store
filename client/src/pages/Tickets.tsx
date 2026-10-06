"use client";

import React, { useEffect, useRef, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge, statusTone } from "@/components/StatusBadge";
import { useAuth } from "@/_core/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  COUNTRY_PHONE_OPTIONS,
  DEFAULT_PHONE_COUNTRY,
  buildInternationalPhoneNumber,
  formatLocalPhoneNumber,
  getCountryPhoneLabel,
  normalizeLocalPhoneDigits,
} from "@/lib/countryPhone";
import { getSiteLanguage } from "@/lib/language";
import {
  sanitizeEmail,
  sanitizeMultilineText,
  sanitizeMultilineTextInput,
  sanitizePhone,
  sanitizeText,
  sanitizeTextInput,
} from "@shared/sanitize";
import { requestAuthenticationForPath } from "@/lib/authRequired";

export default function TicketsPage() {
  const { user, isAuthenticated, sessionRestored } = useAuth() as any;
  const canCreateTicket = Boolean(user?.id);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const authPromptedRef = useRef(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState(DEFAULT_PHONE_COUNTRY);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileWarning, setFileWarning] = useState<string | null>(null);
  const [priority, setPriority] = useState("medium");
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const titleOptions = [
    "Item not found",
    "Order not received",
    "Delayed delivery",
    "Incorrect price",
    "Damaged item received",
    "Missing parts",
    "Request refund",
    "Seller not responding",
    "Payment failed",
    "Other",
  ];

  useEffect(() => {
    if (user && user.email) setEmail(sanitizeEmail(user.email, 255));
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!sessionRestored) return;
    if (isAuthenticated || authPromptedRef.current) return;
    authPromptedRef.current = true;
    requestAuthenticationForPath("tickets");
  }, [isAuthenticated, sessionRestored]);

  useEffect(() => {
    const revalidate = () => {
      void fetchTickets();
    };

    const onVisibilityChange = () => {
      if (!document.hidden) revalidate();
    };

    window.addEventListener("focus", revalidate);
    window.addEventListener("pageshow", revalidate);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", revalidate);
      window.removeEventListener("pageshow", revalidate);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user?.id, isAuthenticated]);

  const setSelectedFilesFromInput = (files: File[]) => {
    setFileWarning(null);
    if (files.length > 5) {
      setFileWarning(
        "You may select up to 5 files; only the first 5 will be kept."
      );
      setSelectedFiles(files.slice(0, 5));
      return;
    }

    setSelectedFiles(files);
  };

  const removeSelectedFile = (indexToRemove: number) => {
    setSelectedFiles(currentFiles =>
      currentFiles.filter((_, index) => index !== indexToRemove)
    );
    setFileWarning(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        setMessage("Please log in to view your tickets.");
        setTickets([]);
        return;
      }

      const res = await fetch("/api/tickets", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setMessage("Session expired. Please log in again.");
        } else {
          throw new Error("Failed to fetch tickets");
        }
        setTickets([]);
        return;
      }

      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!canCreateTicket) {
      setMessage("Please log in to create a ticket.");
      return;
    }

    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error("Authentication required to create tickets");
      }

      const referenceCode = `T-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const payload: any = {
        referenceCode,
        contactEmail: sanitizeEmail(email, 255) || null,
        contactPhone:
          sanitizePhone(buildInternationalPhoneNumber(country, phone), 24) ||
          null,
        contactCountry: country,
        title: sanitizeText(title, 255),
        description: sanitizeMultilineText(description, 5000),
        priority,
        channel: "web",
        language: getSiteLanguage(),
        metadata: { createdFrom: "tickets-ui", referenceCode },
      };

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json?.error || `Failed to create ticket (${res.status})`
        );
      }

      setMessage(
        `Ticket created: ${json.ticket?.referencecode || json.ticket?.referenceCode}`
      );

      setTitle("");
      setDescription("");
      setPhone("");
      setCountry(DEFAULT_PHONE_COUNTRY);
      setSelectedFiles([]);
      setFileWarning(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setTimeout(() => {
        fetchTickets();
      }, 500);
    } catch (err: any) {
      setMessage(err?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <PageHeader
        narrow
        title="Support / Tickets"
        breadcrumb={[{ label: "Support / Tickets", href: "/tickets" }]}
      />
      <div className="container py-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <form
            onSubmit={submit}
            className="panel mb-10 space-y-4 shadow-card"
            aria-labelledby="tickets-form-heading"
          >
            <h2 id="tickets-form-heading" className="sr-only">
              Submit a support ticket
            </h2>
            {!canCreateTicket && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                Sign in to your account to see your ticket(s).
              </div>
            )}
            <div>
              <label htmlFor="contactEmail" className="label">
                Your email
              </label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                aria-required="true"
                className="field"
                value={email}
                onChange={e => setEmail(sanitizeEmail(e.target.value, 255))}
              />
            </div>
            <div>
              <label htmlFor="contactPhone" className="label">
                Phone
              </label>
              <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="field"
                  aria-label="Select phone country code"
                >
                  {COUNTRY_PHONE_OPTIONS.map(countryOption => (
                    <option
                      key={countryOption.value}
                      value={countryOption.value}
                    >
                      {getCountryPhoneLabel(countryOption.value)}
                    </option>
                  ))}
                </select>
                <input
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  required
                  aria-required="true"
                  className="field"
                  value={phone}
                  onChange={e =>
                    setPhone(
                      formatLocalPhoneNumber(
                        normalizeLocalPhoneDigits(e.target.value, country, 15),
                        country
                      )
                    )
                  }
                  placeholder="(555)-123-4567"
                />
              </div>
            </div>
            <div>
              <label htmlFor="ticketTitle" className="label">
                Title
              </label>
              <input
                id="ticketTitle"
                name="title"
                list="ticketTitleOptions"
                required
                aria-required="true"
                className="field"
                value={title}
                onChange={e => setTitle(sanitizeTextInput(e.target.value, 255))}
                placeholder="Select a common issue or type your own"
              />
              <datalist id="ticketTitleOptions">
                {titleOptions.map(opt => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="ticketDescription" className="label">
                Description
              </label>
              <textarea
                id="ticketDescription"
                name="description"
                required
                aria-required="true"
                className="field"
                value={description}
                onChange={e =>
                  setDescription(
                    sanitizeMultilineTextInput(e.target.value, 5000)
                  )
                }
              />
            </div>
            <div>
              <label htmlFor="priority" className="label">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="field sm:w-48"
                aria-label="Ticket priority"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label htmlFor="attachments" className="label">
                Attachments (optional, max 5)
              </label>
              <label
                htmlFor="attachments"
                className="flex cursor-pointer flex-col gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 transition-colors hover:border-gray-400 hover:bg-gray-100"
              >
                <span className="text-sm font-medium text-slate-900">
                  Choose files
                </span>
                <span className="text-xs text-slate-600">
                  Tap or click to select images or PDF files from your device.
                </span>
                <span className="text-xs text-slate-500">
                  Up to 5 attachments will be kept.
                </span>
              </label>
              <input
                ref={fileInputRef}
                id="attachments"
                name="attachments"
                type="file"
                accept="image/*,.pdf"
                multiple
                className="sr-only"
                onChange={e => {
                  const files = e.target.files
                    ? Array.from(e.target.files)
                    : [];
                  setSelectedFilesFromInput(files);
                }}
                aria-describedby="attachments-help"
              />
              <div
                id="attachments-help"
                className="mt-1.5 text-xs text-gray-500"
              >
                You may select images or PDF files. These files stay on your
                device and are not submitted.
              </div>
              {fileWarning && (
                <div className="mt-1 text-xs font-medium text-warning">
                  {fileWarning}
                </div>
              )}
              {selectedFiles && selectedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="eyebrow">Selected documents</div>
                  <ul className="grid gap-2">
                    {selectedFiles.map((f, index) => (
                      <li
                        key={`${f.name}-${f.size}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">
                            {f.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {Math.round(f.size / 1024)} KB
                          </div>
                        </div>
                        <button
                          type="button"
                          className="ml-3 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:border-ink hover:text-ink"
                          onClick={() => removeSelectedFile(index)}
                          aria-label={`Remove ${f.name}`}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <button
                type="submit"
                className="btn-primary btn-lg w-full sm:w-auto"
                disabled={loading || !canCreateTicket}
              >
                Submit Ticket
              </button>
            </div>
          </form>

          {message && (
            <div
              role="status"
              aria-live="polite"
              className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-ink"
            >
              {message}
            </div>
          )}

          <h2 className="mb-4 text-xl font-bold text-ink">Your tickets</h2>
          {loading && (
            <div className="space-y-3" aria-hidden="true">
              <div className="h-20 animate-pulse rounded-xl bg-muted" />
              <div className="h-20 animate-pulse rounded-xl bg-muted" />
            </div>
          )}
          {loading && <div className="sr-only">Loading...</div>}
          {!loading && tickets.length === 0 && (
            <EmptyState icon={<LifeBuoy />} title="No tickets found." />
          )}
          <ul className="space-y-3" aria-live="polite">
            {tickets.map(t => {
              const ref = t.referencecode || t.referenceCode || t.referenceCode;
              const titleId = `ticket-title-${ref}`;
              return (
                <li key={t.id || ref}>
                  <article
                    className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5"
                    aria-labelledby={titleId}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div
                          id={titleId}
                          className="text-[15px] font-semibold text-ink"
                        >
                          {t.title}
                        </div>
                        <div className="mt-1 break-words text-sm text-gray-600">
                          {t.description}
                        </div>
                        <div className="price mt-2 text-xs text-gray-500">
                          Ref: {ref}
                        </div>
                      </div>
                      <div className="flex flex-none flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span className="sr-only">Status:</span>
                        <StatusBadge tone={statusTone(t.status)}>
                          {t.status}
                        </StatusBadge>
                        <span>
                          Priority:{" "}
                          <strong className="text-ink">{t.priority}</strong>
                        </span>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
