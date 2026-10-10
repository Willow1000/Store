import { SEOHead } from "@/components/SEOHead";
import { PageHeader } from "@/components/PageHeader";
import { openConsentSettings } from "@/lib/cookieConsent";

export default function Cookies() {
  return (
    <>
      <SEOHead
        pageType="policy"
        title="Cookie Policy - MotorVault"
        description="The cookies, local storage and third-party services MotorVault uses, what each is for, and how to change your cookie settings."
        keywords={["cookie policy", "cookies", "tracking", "web analytics"]}
        canonical="https://motorvault.shop/cookies"
      />
      <div className="min-h-screen bg-white">
        <PageHeader
          narrow
          title="Cookie Policy"
          description="Last updated: October 10, 2026"
          breadcrumb={[{ label: "Cookie Policy", href: "/cookies" }]}
        />
        <div className="container py-8 sm:py-12">
          <div className="prose-page mx-auto max-w-3xl">
            <section>
              <h2>1. What this policy covers</h2>
              <p>
                This policy lists the cookies and similar technologies
                MotorVault uses, what each is for, and how to control them.
                "Similar technologies" means your browser's local storage and
                session storage, and the Meta pixel. Most of what this site
                keeps in your browser is in local storage rather than in
                cookies; we describe both here.
              </p>
            </section>

            <section>
              <h2>2. Your choice</h2>
              <p>
                A banner asks whether you allow marketing cookies. "Necessary
                only" turns them off; "Accept all" turns them on. Until you
                choose:
              </p>
              <ul>
                <li>
                  <strong>In the EEA, the UK and Switzerland</strong>, and where
                  we cannot tell which country you are in, marketing cookies
                  stay off.
                </li>
                <li>
                  <strong>Elsewhere</strong>, marketing cookies are on unless
                  you choose "Necessary only".
                </li>
              </ul>
              <p>
                You can change your choice at any time with the button below or
                the "Cookie settings" link at the bottom of every page. The
                choice is saved in this browser only, so you will be asked again
                on another device or after clearing your browser data.
              </p>
              <p>
                <button
                  type="button"
                  onClick={openConsentSettings}
                  className="btn-secondary"
                >
                  Change cookie settings
                </button>
              </p>
            </section>

            <section>
              <h2>3. Necessary storage (always on)</h2>
              <p>
                These make the store work and are not controlled by the banner.
              </p>
              <ul>
                <li>
                  <strong>Sign-in.</strong> A cookie named{" "}
                  <code>app_session_id</code> and sign-in tokens in local
                  storage keep you signed in until you sign out.
                </li>
                <li>
                  <strong>Cart, wishlist and checkout.</strong> Your cart,
                  wishlist, the checkout step you reached and the address
                  details you have typed are kept in local storage so they
                  survive a page reload.
                </li>
                <li>
                  <strong>Language and currency.</strong> Your language choice,
                  translated text we have already fetched, and your approximate
                  country and currency (refreshed about once a day).
                </li>
                <li>
                  <strong>Your cookie choice.</strong> Stored as{" "}
                  <code>mv_cookie_consent</code>.
                </li>
                <li>
                  <strong>Speed.</strong> Copies of the product, category and
                  brand lists, so pages open faster on your next visit.
                </li>
              </ul>
            </section>

            <section>
              <h2>4. Features and our own measurement (always on)</h2>
              <p>
                These are also stored without asking. They stay between your
                browser and MotorVault and are not shared with advertisers.
              </p>
              <ul>
                <li>
                  <strong>Recently viewed and recommendations.</strong> The
                  products you have viewed and a profile of the categories and
                  brands you look at, used to order listings and suggest related
                  parts.
                </li>
                <li>
                  <strong>Search and click measurement.</strong> A random
                  identifier (<code>sessionId</code>) is sent to our own servers
                  with your searches, the filters you used and the products you
                  opened from the results, so we can see which searches find
                  nothing and improve them.
                </li>
                <li>
                  <strong>VIN decoder history.</strong> The VINs you have
                  decoded, kept in your browser so you can reopen them.
                </li>
              </ul>
            </section>

            <section>
              <h2>5. Marketing cookies (only with your permission)</h2>
              <p>
                <strong>Meta pixel.</strong> If marketing cookies are allowed,
                we load Meta's pixel script. It sets the cookies{" "}
                <code>_fbp</code> and, when you arrive from a Meta ad,{" "}
                <code>_fbc</code>, and tells Meta when you view a page or
                product, add to cart, start checkout or complete a purchase,
                including the product IDs and order value. We use this to
                measure our ads on Facebook and Instagram and to show ads to
                people who have visited the store. If marketing cookies are off,
                the script is never downloaded and nothing is sent to Meta.
              </p>
            </section>

            <section>
              <h2>6. Other services this site contacts</h2>
              <p>
                These services are not controlled by the banner. Each receives
                your IP address, as any website you connect to does, and may set
                its own cookies under its own policy.
              </p>
              <ul>
                <li>
                  <strong>Stripe</strong> (payments). At checkout you are sent
                  to a payment page hosted by Stripe, which uses its own cookies
                  to process the payment and prevent fraud.
                </li>
                <li>
                  <strong>Google reCAPTCHA</strong> (spam protection), on the
                  sign-in and contact forms.
                </li>
                <li>
                  <strong>Google Maps</strong>, for the map on the Contact page.
                </li>
                <li>
                  <strong>Google Translate.</strong> If you view the site in a
                  language other than English, text from the page is sent to
                  Google to be translated.
                </li>
                <li>
                  <strong>ipgeolocation.io.</strong> Your IP address is used to
                  estimate your country, so we can choose a language and
                  currency.
                </li>
                <li>
                  <strong>Blootrue</strong> (customer reviews), which loads the
                  review panel on the home page and product pages.
                </li>
                <li>
                  <strong>Image hosts.</strong> Many product photos are loaded
                  directly from the servers of the suppliers and marketplaces
                  that host them.
                </li>
                <li>
                  <strong>Supabase and Vercel</strong>, which host our database,
                  sign-in system and website.
                </li>
              </ul>
            </section>

            <section>
              <h2>7. Controlling storage in your browser</h2>
              <p>
                Your browser lets you block or delete cookies and clear site
                data. If you clear this site's data you will be signed out, your
                cart and wishlist on this device will be emptied, and you will
                be asked about cookies again. Blocking all storage will stop
                sign-in, the cart and checkout from working.
              </p>
            </section>

            <section>
              <h2>8. Changes and contact</h2>
              <p>
                We update this page when the technologies we use change; the
                date at the top shows the latest version. Questions:{" "}
                <a href="mailto:support@motorvault.shop">
                  support@motorvault.shop
                </a>{" "}
                or our <a href="/contact">contact page</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
