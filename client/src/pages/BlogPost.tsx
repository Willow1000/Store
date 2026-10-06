import { SEOHead } from "@/components/SEOHead";
import { ShareButton } from "@/components/ShareButton";
import { getSocialImageUrl } from "@shared/socialImage";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BLOG_AUTHOR, BLOG_POSTS, getBlogPostBySlug } from "@shared/blogPosts";
import { fitSeoTitle } from "@/lib/productSeo";
import { useState } from "react";
import { Link, useRoute } from "wouter";

function slugifyHeading(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ReferenceImageCard({
  title,
  altText,
  imageUrl,
  sourceUrl,
}: {
  title: string;
  altText: string;
  imageUrl: string;
  sourceUrl: string;
}) {
  const [hasImageError, setHasImageError] = useState(false);

  return (
    <figure className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {hasImageError ? (
        <div className="flex h-44 items-center justify-center bg-gray-100 px-4 text-center text-sm text-gray-600">
          Reference image unavailable. Open the original source for the full
          visual context.
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={altText}
          className="h-44 w-full object-cover"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setHasImageError(true)}
        />
      )}
      <figcaption className="p-3 text-sm text-gray-700">
        <p className="font-medium text-gray-900">{title}</p>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-ink underline decoration-gray-300 underline-offset-4 hover:decoration-ink"
        >
          View original source
        </a>
      </figcaption>
    </figure>
  );
}

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug || "";
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return (
      <div className="container py-16 sm:py-24">
        <div className="mx-auto max-w-lg rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center">
          <h1 className="text-2xl font-bold text-ink">Article not found</h1>
          <p className="mt-2 text-sm text-gray-600">
            The requested article could not be located.
          </p>
          <Link href="/blog" className="btn-primary mt-6">
            Back to blog
          </Link>
        </div>
      </div>
    );
  }

  const relatedPosts = BLOG_POSTS.filter(
    candidate =>
      candidate.slug !== post.slug && candidate.category === post.category
  ).slice(0, 3);
  const tableOfContents = post.sections.map(section => ({
    id: slugifyHeading(section.heading),
    heading: section.heading,
  }));

  return (
    <>
      <SEOHead
        pageType="article"
        title={fitSeoTitle(post.title, " | MotorVault Blog")}
        description={post.description}
        canonical={`/blog/${post.slug}`}
        ogType="article"
        ogImage={getSocialImageUrl(post.coverImage)}
        keywords={post.keywords}
        articleData={{
          author: BLOG_AUTHOR,
          authorType: "Organization",
          publishedDate: post.publishedDate,
          modifiedDate: post.updatedDate,
          image: getSocialImageUrl(post.coverImage),
        }}
        faqData={post.faq}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
          { name: post.title, url: `/blog/${post.slug}` },
        ]}
      />

      <article className="min-h-screen bg-white pb-14">
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="container py-6 sm:py-8">
            <Breadcrumb
              items={[
                { label: "Blog", href: "/blog" },
                { label: post.title, href: `/blog/${post.slug}` },
              ]}
              className="mb-4"
              // BreadcrumbList JSON-LD is already emitted by SEOHead above.
              includeStructuredData={false}
            />
            <div className="max-w-3xl">
              <Link
                href="/blog"
                className="text-[13px] font-semibold text-ink underline-offset-4 hover:underline"
              >
                Back to blog
              </Link>
              <h1 className="mt-2 text-ink">{post.title}</h1>
              <p className="mt-3 text-base text-gray-700 sm:text-lg">
                {post.excerpt}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-gray-500">
                <span>By {BLOG_AUTHOR}</span>
                <span>{post.readingTime}</span>
                <span>
                  Published {new Date(post.publishedDate).toLocaleDateString()}
                </span>
                <span>
                  Updated {new Date(post.updatedDate).toLocaleDateString()}
                </span>
              </div>
              <ShareButton
                title={post.title}
                url={`/blog/${post.slug}`}
                className="-ml-2 mt-2"
              />
            </div>
          </div>
        </div>

        <div className="container grid gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <div className="min-w-0">
            <img
              src={post.coverImage}
              alt={post.coverImageAlt}
              className="aspect-[16/9] w-full rounded-xl bg-well object-cover"
            />
            <div className="mt-6 max-w-3xl">
              <p className="text-[15px] leading-relaxed text-gray-700 sm:text-base">
                {post.description} It is written for buyers, DIYers, and
                workshops who want clearer technical context, more reliable
                fitment checks, and fewer avoidable mistakes.
              </p>

              <section className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
                <h2 className="font-sans text-base font-semibold tracking-normal text-ink">
                  In this guide
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  {tableOfContents.map(item => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="text-ink underline decoration-gray-300 underline-offset-4 hover:decoration-ink"
                      >
                        {item.heading}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>

              {post.sections.map(section => (
                <section
                  key={section.heading}
                  id={slugifyHeading(section.heading)}
                  className="mt-10 scroll-mt-24"
                >
                  <h2 className="text-xl font-bold text-ink sm:text-2xl">
                    {section.heading}
                  </h2>
                  <p className="mt-3 text-gray-700">{section.summary}</p>
                  {section.paragraphs && section.paragraphs.length > 0 && (
                    <div className="mt-4 space-y-4 text-gray-700">
                      {section.paragraphs.map(paragraph => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  )}
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
                    {section.points.map(point => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </section>
              ))}

              {post.comparisonTable && (
                <section className="mt-10">
                  <h2 className="text-xl font-bold text-ink sm:text-2xl">
                    Comparison table
                  </h2>
                  <p className="mt-2 text-gray-700">
                    {post.comparisonTable.caption}
                  </p>
                  <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                      <thead className="bg-gray-50 text-gray-700">
                        <tr>
                          {post.comparisonTable.columns.map(column => (
                            <th
                              key={column}
                              className="px-4 py-3 font-semibold"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white text-gray-700">
                        {post.comparisonTable.rows.map((row, rowIndex) => (
                          <tr key={`${post.slug}-row-${rowIndex}`}>
                            {row.map((cell, cellIndex) => (
                              <td
                                key={`${post.slug}-row-${rowIndex}-cell-${cellIndex}`}
                                className="px-4 py-3 align-top"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {post.referenceImages && post.referenceImages.length > 0 && (
                <section className="mt-10">
                  <h2 className="text-xl font-bold text-ink sm:text-2xl">
                    External reference images
                  </h2>
                  <p className="mt-2 text-gray-700">
                    These images are hosted by their original publishers. Each
                    image includes a direct source link for attribution and
                    context.
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {post.referenceImages.map(image => (
                      <ReferenceImageCard
                        key={image.sourceUrl}
                        title={image.title}
                        altText={image.altText}
                        imageUrl={image.imageUrl}
                        sourceUrl={image.sourceUrl}
                      />
                    ))}
                  </div>
                </section>
              )}

              <section className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-5">
                <h2 className="font-sans text-base font-semibold tracking-normal text-ink">
                  Related site resources
                </h2>
                <p className="mt-2 text-sm text-gray-700">
                  These links point to supporting resources such as FAQs,
                  category references, and contact forms when extra context is
                  useful.
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
                  {post.internalLinks.map(item => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-ink underline decoration-gray-300 underline-offset-4 hover:decoration-ink"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-10">
                <h2 className="text-xl font-bold text-ink sm:text-2xl">FAQ</h2>
                <div className="mt-4 space-y-3">
                  {post.faq.map(item => (
                    <details
                      key={item.question}
                      className="rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <summary className="cursor-pointer text-[15px] font-semibold text-ink">
                        {item.question}
                      </summary>
                      <p className="mt-3 text-gray-700">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="font-sans text-sm font-semibold tracking-normal text-ink">
                Sources and further reading
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {post.outboundReferences.map(ref => (
                  <li key={ref.href}>
                    <a
                      href={ref.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink underline decoration-gray-300 underline-offset-4 hover:decoration-ink"
                    >
                      {ref.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="font-sans text-sm font-semibold tracking-normal text-ink">
                Relevant owner and technician communities
              </h2>
              <p className="mt-2 text-sm text-gray-700">
                These communities are useful for comparing real-world ownership
                reports, recurring faults, and fitment experiences.
              </p>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {post.backlinkOutreach.map(target => (
                  <li key={target.href}>
                    <a
                      href={target.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink underline decoration-gray-300 underline-offset-4 hover:decoration-ink"
                    >
                      {target.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            {relatedPosts.length > 0 && (
              <section className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="font-sans text-sm font-semibold tracking-normal text-ink">
                  Related articles
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  {relatedPosts.map(related => (
                    <li key={related.slug}>
                      <Link
                        href={`/blog/${related.slug}`}
                        className="text-ink underline decoration-gray-300 underline-offset-4 hover:decoration-ink"
                      >
                        {related.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </article>
    </>
  );
}
