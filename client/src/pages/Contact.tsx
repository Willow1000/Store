'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useSearch } from 'wouter';
import { RecaptchaCheckbox } from '@/components/RecaptchaCheckbox';
import { SEOHead } from '@/components/SEOHead';
import { supabase } from '@/lib/supabase';

// Input length constraints
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
const MAX_MESSAGE_LENGTH = 5000;

// Sanitize input to prevent XSS
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .slice(0, MAX_MESSAGE_LENGTH); // Limit length
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= MAX_EMAIL_LENGTH;
}

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  location: string;
  message: string;
}

export default function Contact() {
  const searchParams = useSearch();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    location: '',
    message: '',
  });

  // Pre-fill form with query parameters
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const subject = params.get('subject');
    const message = params.get('message');
    const productName = params.get('product');

    if (subject || message) {
      setFormData((prev) => ({
        ...prev,
        subject: subject ? decodeURIComponent(subject) : '',
        message: message ? decodeURIComponent(message) : '',
      }));
    }
  }, [searchParams]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    field: keyof ContactFormData
  ) => {
    let value = e.target.value;

    // Apply length limits and sanitization
    if (field === 'name') {
      value = sanitizeInput(value).slice(0, MAX_NAME_LENGTH);
    } else if (field === 'email') {
      value = sanitizeInput(value).slice(0, MAX_EMAIL_LENGTH);
    } else if (field === 'subject') {
      value = sanitizeInput(value).slice(0, 200);
    } else if (field === 'message') {
      value = sanitizeInput(value).slice(0, MAX_MESSAGE_LENGTH);
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      // Validation checks
      if (!formData.name.trim()) {
        toast.error('Name is required');
        setIsLoading(false);
        return;
      }

      if (!formData.email.trim()) {
        toast.error('Email is required');
        setIsLoading(false);
        return;
      }

      if (!isValidEmail(formData.email)) {
        toast.error('Please enter a valid email address');
        setIsLoading(false);
        return;
      }

      if (!formData.location) {
        toast.error('Please select a location');
        setIsLoading(false);
        return;
      }

      if (!formData.message.trim()) {
        toast.error('Message is required');
        setIsLoading(false);
        return;
      }

      if (formData.message.length < 10) {
        toast.error('Message must be at least 10 characters');
        setIsLoading(false);
        return;
      }

      if (!captchaToken) {
        toast.error('Please complete the reCAPTCHA before sending your message.');
        setIsLoading(false);
        return;
      }

      // Submit to Supabase
      const { error } = await supabase.from('contactus').insert([
        {
          name: formData.name.trim(),
          email: formData.email.trim(),
          location: formData.location,
          subject: formData.subject.trim(),
          message: formData.message.trim(),
        },
      ]);

      if (error) {
        toast.error('Failed to send message. Please try again later.');
        console.error('Contact form error:', error);
        setIsLoading(false);
        return;
      }

      // Success
      toast.success('Thank you! Your message has been sent successfully.');
      setFormData({
        name: '',
        email: '',
        subject: '',
        location: '',
        message: '',
      });
      setCaptchaToken(null);
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
      console.error('Contact form submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Contact MotorVault - Customer Support"
        description="Need help? Contact MotorVault customer support. Available via email, phone, or form. Operating in USA, Switzerland, Poland, Finland, UAE."
        keywords={['contact us', 'customer service', 'support', 'get in touch', 'motor vault help']}
        canonical="https://motorvault.com/contact"
      />
      <div className="min-h-screen bg-background pt-6">
      <div className="max-w-screen-lg mx-auto px-3 sm:px-4 lg:px-6 py-12">
        <h1 className="text-4xl font-bold mb-8">Contact Us</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-semibold mb-6">Get in Touch</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Email</h3>
                <p className="text-gray-600">
                  <a href="mailto:support@motorvault.com" className="text-blue-600 hover:underline">
                    support@motorvault.com
                  </a>
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Phone</h3>
                <p className="text-gray-600">1-800-MOTORVAULT</p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Hours</h3>
                <p className="text-gray-600">
                  Monday - Friday: 9 AM - 6 PM<br />
                  Saturday: 10 AM - 4 PM<br />
                  Sunday: Closed
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-6">Contact Form</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium mb-2">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange(e, 'name')}
                  placeholder="Your full name"
                  maxLength={MAX_NAME_LENGTH}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.name.length}/{MAX_NAME_LENGTH}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange(e, 'email')}
                  placeholder="your@email.com"
                  maxLength={MAX_EMAIL_LENGTH}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.email.length}/{MAX_EMAIL_LENGTH}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleInputChange(e, 'subject')}
                  placeholder="What is this about?"
                  maxLength={200}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.subject.length}/200</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Location <span className="text-red-500">*</span></label>
                <select
                  value={formData.location}
                  onChange={(e) => handleInputChange(e, 'location')}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select your location</option>
                  <option value="usa">United States</option>
                  <option value="switzerland">Switzerland</option>
                  <option value="poland">Poland</option>
                  <option value="finland">Finland</option>
                  <option value="uae">United Arab Emirates</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Message <span className="text-red-500">*</span></label>
                <textarea
                  rows={5}
                  value={formData.message}
                  onChange={(e) => handleInputChange(e, 'message')}
                  placeholder="Your message here..."
                  maxLength={MAX_MESSAGE_LENGTH}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-500">{formData.message.length}/{MAX_MESSAGE_LENGTH}</p>
                  {formData.message.length < 10 && formData.message.length > 0 && (
                    <p className="text-xs text-red-500">Message must be at least 10 characters</p>
                  )}
                </div>
              </div>

              <RecaptchaCheckbox
                onChange={setCaptchaToken}
                className="rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50 px-3 sm:px-4 py-3 sm:py-4 mt-4 sm:mt-6"
                helperText={!captchaToken ? 'Please complete this security check before sending your message' : ''}
              />
              
              <button
                type="submit"
                disabled={isLoading || !captchaToken}
                className="w-full bg-black text-white py-2 rounded-lg font-medium hover:bg-gray-900 disabled:bg-gray-400 transition-colors"
                title={!captchaToken ? 'Please complete the security check first' : ''}
              >
                {isLoading ? 'Sending...' : !captchaToken ? 'Complete security check to send' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
