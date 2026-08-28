import { SEOHead } from "@/components/SEOHead";
import { BLOG_POSTS } from "@shared/blogPosts";
import { Link } from "wouter";

const categoryStyle: Record<string, string> = {
  Fitment: "bg-blue-100 text-blue-800",
  Quality: "bg-amber-100 text-amber-800",
  Troubleshooting: "bg-rose-100 text-rose-800",
  "EV & Hybrid": "bg-emerald-100 text-emerald-800",
};

export default function Blog() {
  const categoryCounts = BLOG_POSTS.reduce<Record<string, number>>(
    (accumulator, post) => {
      accumulator[post.category] = (accumulator[post.category] || 0) + 1;
      return accumulator;
    },
    {}
  );

  return (
    <>
      <SEOHead
        pageType="generic"
        title="MotorVault Blog | SEO Guides for Fitment, OEM Parts, and Repairs"
        description="Read MotorVault articles on VIN fitment, OEM vs used part quality, ECU and DPF troubleshooting, and EV repair decisions across Europe."
        canonical="/blog"
        keywords={[
          "motorvault blog",
          "european auto parts blog",
          "vin fitment guide",
          "oem vs used parts",
          "opel dpf and ecu guides",
          "ev battery replacement guide",
        ]}
      />

      <div className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
          <header className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-500">
              MotorVault Journal
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
              Fitment-first guides for buyers and workshops
            </h1>
            <p className="mt-3 max-w-3xl text-gray-700">
              These articles are written to help with practical decisions such
              as checking compatibility, understanding common failure patterns,
              and comparing repair paths with fewer assumptions.
            </p>
            <p className="mt-3 max-w-3xl text-gray-700">
              The blog focuses on European vehicle fitment, OEM-versus-used part
              decisions, diesel emissions troubleshooting, EV ownership costs,
              and seat or interior upgrades where exact compatibility matters.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-gray-600">
              {Object.entries(categoryCounts).map(([category, count]) => (
                <span
                  key={category}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5"
                >
                  {category}: {count} guide{count > 1 ? "s" : ""}
                </span>
              ))}
            </div>
          </header>

          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            {BLOG_POSTS.map(post => (
              <article
                key={post.slug}
                className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <Link href={`/blog/${post.slug}`}>
                  <img
                    src={post.coverImage}
                    alt={post.coverImageAlt}
                    className="h-52 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    loading="lazy"
                    decoding="async"
                  />
                </Link>
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${categoryStyle[post.category] || "bg-gray-100 text-gray-700"}`}
                    >
                      {post.category}
                    </span>
                    <span className="text-sm text-gray-500">
                      {post.readingTime}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(post.publishedDate).toLocaleDateString()}
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl font-bold text-gray-950">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="hover:text-blue-700"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-3 text-gray-700">{post.excerpt}</p>

                  <div className="mt-6">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
                    >
                      Read article
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-950">
              Where these topics are discussed
            </h2>
            <p className="mt-2 text-gray-700">
              Many of the issues covered here are actively discussed in owner
              forums and technician communities. They are useful places to
              compare patterns, terminology, and real-world repair outcomes.
            </p>
            <p className="mt-2 text-gray-700">
              The goal is to publish material that is specific enough to be
              genuinely useful before anyone clicks through to a product page.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="https://www.alfaowner.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-900 hover:text-gray-900"
              >
                AlfaOwner
              </a>
              <a
                href="https://www.zafiraowners.co.uk/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-900 hover:text-gray-900"
              >
                Zafira Owners Club
              </a>
              <a
                href="https://www.reddit.com/r/MechanicAdvice/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-900 hover:text-gray-900"
              >
                r/MechanicAdvice
              </a>
              <a
                href="https://www.reddit.com/r/CarTalkUK/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-900 hover:text-gray-900"
              >
                r/CarTalkUK
              </a>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
