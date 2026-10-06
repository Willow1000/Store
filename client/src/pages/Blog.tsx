import { SEOHead } from "@/components/SEOHead";
import { BLOG_POSTS } from "@shared/blogPosts";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

// One neutral chip for every category: the label carries the meaning, so
// the palette stays ink + neutrals.
const categoryStyle: Record<string, string> = {
  Fitment: "bg-gray-100 text-ink",
  Quality: "bg-gray-100 text-ink",
  Troubleshooting: "bg-gray-100 text-ink",
  "EV & Hybrid": "bg-gray-100 text-ink",
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
        title="Car Parts Fitment & Repair Guides | MotorVault Blog"
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

      <div className="min-h-screen bg-white">
        <PageHeader
          eyebrow="MotorVault Journal"
          title="Fitment-first guides for buyers and workshops"
          description="These articles are written to help with practical decisions such as checking compatibility, understanding common failure patterns, and comparing repair paths with fewer assumptions."
          breadcrumb={[{ label: "Blog", href: "/blog" }]}
        >
          <p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-base">
            The blog focuses on European vehicle fitment, OEM-versus-used part
            decisions, diesel emissions troubleshooting, EV ownership costs, and
            seat or interior upgrades where exact compatibility matters.
          </p>

          <div className="mt-5 flex flex-wrap gap-2 text-[13px] text-gray-700">
            {Object.entries(categoryCounts).map(([category, count]) => (
              <span
                key={category}
                className="rounded-full border border-gray-300 bg-white px-3 py-1.5"
              >
                {category}: {count} guide{count > 1 ? "s" : ""}
              </span>
            ))}
          </div>
        </PageHeader>

        <div className="container py-8 sm:py-12">
          <section className="grid gap-5 md:grid-cols-2 lg:gap-6 xl:grid-cols-3">
            {BLOG_POSTS.map(post => (
              <article
                key={post.slug}
                className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card transition-[box-shadow,border-color] hover:border-gray-300 hover:shadow-card-hover"
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="block overflow-hidden bg-well"
                >
                  <img
                    src={post.coverImage}
                    alt={post.coverImageAlt}
                    className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                    decoding="async"
                  />
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${categoryStyle[post.category] || "bg-gray-100 text-gray-700"}`}
                    >
                      {post.category}
                    </span>
                    <span className="text-[13px] text-gray-500">
                      {post.readingTime}
                    </span>
                    <span className="price text-[13px] text-gray-500">
                      {new Date(post.publishedDate).toLocaleDateString()}
                    </span>
                  </div>

                  <h2 className="mt-3 text-lg font-bold leading-snug text-ink sm:text-xl">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="hover:underline hover:underline-offset-4"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-gray-700">
                    {post.excerpt}
                  </p>

                  <div className="mt-auto pt-5">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-ink underline-offset-4 hover:underline"
                    >
                      Read article
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-5 sm:p-8">
            <h2 className="text-xl font-bold text-ink sm:text-2xl">
              Where these topics are discussed
            </h2>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-gray-700">
              Many of the issues covered here are actively discussed in owner
              forums and technician communities. They are useful places to
              compare patterns, terminology, and real-world repair outcomes.
            </p>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-gray-700">
              The goal is to publish material that is specific enough to be
              genuinely useful before anyone clicks through to a product page.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="https://www.alfaowner.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center rounded-full border border-gray-300 bg-white px-4 text-sm font-medium text-ink transition-colors hover:border-ink"
              >
                AlfaOwner
              </a>
              <a
                href="https://www.zafiraowners.co.uk/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center rounded-full border border-gray-300 bg-white px-4 text-sm font-medium text-ink transition-colors hover:border-ink"
              >
                Zafira Owners Club
              </a>
              <a
                href="https://www.reddit.com/r/MechanicAdvice/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center rounded-full border border-gray-300 bg-white px-4 text-sm font-medium text-ink transition-colors hover:border-ink"
              >
                r/MechanicAdvice
              </a>
              <a
                href="https://www.reddit.com/r/CarTalkUK/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center rounded-full border border-gray-300 bg-white px-4 text-sm font-medium text-ink transition-colors hover:border-ink"
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
