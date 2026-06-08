'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COUNTRY_PHONE_OPTIONS, DEFAULT_PHONE_COUNTRY, buildInternationalPhoneNumber, formatLocalPhoneNumber, getCountryPhoneLabel, normalizeLocalPhoneDigits } from '@/lib/countryPhone';
import { sanitizeEmail, sanitizeMultilineText, sanitizeMultilineTextInput, sanitizePhone, sanitizePhoneInput, sanitizeText, sanitizeTextInput } from '@shared/sanitize';

export default function TicketsPage() {
  const { user, isAuthenticated, sessionRestored } = useAuth() as any;
  const canCreateTicket = Boolean(user?.id);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState(DEFAULT_PHONE_COUNTRY);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileWarning, setFileWarning] = useState<string | null>(null);
  const [priority, setPriority] = useState('medium');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const titleOptions = [
    'Item not found',
    'Order not received',
    'Delayed delivery',
    'Incorrect price',
    'Damaged item received',
    'Missing parts',
    'Request refund',
    'Seller not responding',
    'Payment failed',
    'Other',
  ];

  useEffect(() => {
    if (user && user.email) setEmail(sanitizeEmail(user.email, 255));
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!sessionRestored) return;
    // do not auto-open auth modal; allow page to render and show message when actions require login
  }, [isAuthenticated, sessionRestored]);

  const setSelectedFilesFromInput = (files: File[]) => {
    setFileWarning(null);
    if (files.length > 5) {
      setFileWarning('You may select up to 5 files; only the first 5 will be kept.');
      setSelectedFiles(files.slice(0, 5));
      return;
    }

    setSelectedFiles(files);
  };

  const removeSelectedFile = (indexToRemove: number) => {
    setSelectedFiles((currentFiles) => currentFiles.filter((_, index) => index !== indexToRemove));
    setFileWarning(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        setMessage('Please log in to view your tickets.');
        setTickets([]);
        return;
      }

      const res = await fetch('/api/tickets', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setMessage('Session expired. Please log in again.');
        } else {
          throw new Error('Failed to fetch tickets');
        }
        setTickets([]);
        return;
      }

      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!canCreateTicket) {
      setMessage('Please log in to create a ticket.');
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('Authentication required to create tickets');
      }

      const referenceCode = `T-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const payload: any = {
        referenceCode,
        contactEmail: sanitizeEmail(email, 255) || null,
        contactPhone: sanitizePhone(buildInternationalPhoneNumber(country, phone), 24) || null,
        contactCountry: country,
        title: sanitizeText(title, 255),
        description: sanitizeMultilineText(description, 5000),
        priority,
        channel: 'web',
        metadata: { createdFrom: 'tickets-ui', referenceCode },
      };

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || `Failed to create ticket (${res.status})`);
      }

      setMessage(`Ticket created: ${json.ticket?.referencecode || json.ticket?.referenceCode}`);

      setTitle('');
      setDescription('');
      setPhone('');
      setCountry(DEFAULT_PHONE_COUNTRY);
      setSelectedFiles([]);
      setFileWarning(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setTimeout(() => {
        fetchTickets();
      }, 500);
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Support / Tickets</h1>

      <form onSubmit={submit} className="space-y-3 mb-6" aria-labelledby="tickets-form-heading">
        <h2 id="tickets-form-heading" className="sr-only">Submit a support ticket</h2>
        {!canCreateTicket && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Sign in to your account to see your ticket(s).
          </div>
        )}
        <div>
          <label htmlFor="contactEmail" className="block text-sm font-medium">Your email</label>
          <input id="contactEmail" name="contactEmail" type="email" aria-required="true" className="border p-2 w-full" value={email} onChange={(e) => setEmail(sanitizeEmail(e.target.value, 255))} />
        </div>
        <div>
          <label htmlFor="contactPhone" className="block text-sm font-medium">Phone</label>
          <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="border p-2 rounded bg-white"
              aria-label="Select phone country code"
            >
              {COUNTRY_PHONE_OPTIONS.map((countryOption) => (
                <option key={countryOption.value} value={countryOption.value}>
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
              className="border p-2 w-full"
              value={phone}
              onChange={(e) => setPhone(formatLocalPhoneNumber(normalizeLocalPhoneDigits(e.target.value, country, 15), country))}
              placeholder="555 123 4567"
            />
          </div>
        </div>
        <div>
          <label htmlFor="ticketTitle" className="block text-sm font-medium">Title</label>
          <input
            id="ticketTitle"
            name="title"
            list="ticketTitleOptions"
            required
            aria-required="true"
            className="border p-2 w-full"
            value={title}
            onChange={(e) => setTitle(sanitizeTextInput(e.target.value, 255))}
            placeholder="Select a common issue or type your own"
          />
          <datalist id="ticketTitleOptions">
            {titleOptions.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="ticketDescription" className="block text-sm font-medium">Description</label>
          <textarea id="ticketDescription" name="description" required aria-required="true" className="border p-2 w-full" value={description} onChange={(e) => setDescription(sanitizeMultilineTextInput(e.target.value, 5000))} />
        </div>
        <div>
          <label htmlFor="priority" className="block text-sm font-medium">Priority</label>
          <select id="priority" name="priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="border p-2" aria-label="Ticket priority">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label htmlFor="attachments" className="block text-sm font-medium">Attachments (optional, max 5)</label>
          <label
            htmlFor="attachments"
            className="mt-1 flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-slate-400 hover:bg-slate-100"
          >
            <span className="text-sm font-medium text-slate-900">Choose files</span>
            <span className="text-xs text-slate-600">Tap or click to select images or PDF files from your device.</span>
            <span className="text-xs text-slate-500">Up to 5 attachments will be kept.</span>
          </label>
          <input
            ref={fileInputRef}
            id="attachments"
            name="attachments"
            type="file"
            accept="image/*,.pdf"
            multiple
            className="sr-only"
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              setSelectedFilesFromInput(files);
            }}
            aria-describedby="attachments-help"
          />
          <div id="attachments-help" className="text-xs text-gray-500">You may select images or PDF files. These files stay on your device and are not submitted.</div>
          {fileWarning && <div className="text-xs text-yellow-600 mt-1">{fileWarning}</div>}
          {selectedFiles && selectedFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Selected documents</div>
              <ul className="grid gap-2">
                {selectedFiles.map((f, index) => (
                  <li key={`${f.name}-${f.size}-${index}`} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">{f.name}</div>
                      <div className="text-xs text-slate-500">{Math.round(f.size / 1024)} KB</div>
                    </div>
                    <button
                      type="button"
                      className="ml-3 rounded-md border px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
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
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded disabled:cursor-not-allowed disabled:opacity-60" disabled={loading || !canCreateTicket}>Submit Ticket</button>
        </div>
      </form>

      {message && <div role="status" aria-live="polite" className="mb-4 p-3 bg-gray-100">{message}</div>}

      <h2 className="text-xl font-semibold mb-3">Your tickets</h2>
      {loading && <div>Loading...</div>}
      {!loading && tickets.length === 0 && <div>No tickets found.</div>}
      <ul className="space-y-3" aria-live="polite">
        {tickets.map((t) => {
          const ref = t.referencecode || t.referenceCode || t.referenceCode;
          const titleId = `ticket-title-${ref}`;
          return (
            <li key={t.id || ref}>
              <article className="border p-3 rounded" aria-labelledby={titleId}>
                <div className="flex justify-between">
                  <div>
                    <div id={titleId} className="font-medium">{t.title}</div>
                    <div className="text-sm text-gray-600">{t.description}</div>
                    <div className="text-xs text-gray-500">Ref: {ref}</div>
                  </div>
                  <div className="text-sm">
                    <div>Status: <strong>{t.status}</strong></div>
                    <div>Priority: <strong>{t.priority}</strong></div>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
