import { SEOHead } from "@/components/SEOHead";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BLOG_AUTHOR, BLOG_POSTS, getBlogPostBySlug } from "@shared/blogPosts";
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
          className="mt-1 inline-block text-blue-700 hover:text-blue-800 hover:underline"
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
      <div className="min-h-screen bg-gray-50 py-14">
        <div className="mx-auto max-w-screen-md rounded-3xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-3xl font-black text-gray-950">
            Article not found
          </h1>
          <p className="mt-3 text-gray-700">
            The requested article could not be located.
          </p>
          <Link
            href="/blog"
            className="mt-6 inline-flex rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
          >
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
        title={`${post.title} | MotorVault Blog`}
        description={post.description}
        canonical={`/blog/${post.slug}`}
        ogType="article"
        ogImage={post.coverImage}
        keywords={post.keywords}
        articleData={{
          author: BLOG_AUTHOR,
          publishedDate: post.publishedDate,
          modifiedDate: post.updatedDate,
          image: post.coverImage,
        }}
        faqData={post.faq}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
          { name: post.title, url: `/blog/${post.slug}` },
        ]}
      />

      <article className="min-h-screen bg-gray-50 pb-14 pt-8">
        <div className="mx-auto grid max-w-screen-xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
          <main className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
            <img
              src={post.coverImage}
              alt={post.coverImageAlt}
              className="h-64 w-full object-cover sm:h-80"
            />

            <div className="p-6 sm:p-8">
              <Breadcrumb
                items={[
                  { label: "Blog", href: "/blog" },
                  { label: post.title, href: `/blog/${post.slug}` },
                ]}
                className="mb-4"
              />
              <Link
                href="/blog"
                className="text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                Back to blog
              </Link>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                {post.title}
              </h1>
              <p className="mt-4 text-lg text-gray-700">{post.excerpt}</p>
              <p className="mt-4 text-base text-gray-700">
                {post.description} It is written for buyers, DIYers, and
                workshops who want clearer technical context, more reliable
                fitment checks, and fewer avoidable mistakes.
              </p>

              <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-500">
                <span>By {BLOG_AUTHOR}</span>
                <span>{post.readingTime}</span>
                <span>
                  Published {new Date(post.publishedDate).toLocaleDateString()}
                </span>
                <span>
                  Updated {new Date(post.updatedDate).toLocaleDateString()}
                </span>
              </div>

              <section className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <h2 className="text-xl font-bold text-gray-950">
                  In this guide
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  {tableOfContents.map(item => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="text-blue-700 hover:text-blue-800 hover:underline"
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
                  <h2 className="text-2xl font-bold text-gray-950">
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
                  <h2 className="text-2xl font-bold text-gray-950">
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
                  <h2 className="text-2xl font-bold text-gray-950">
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

              <section className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <h2 className="text-xl font-bold text-gray-950">
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
                        className="text-blue-700 hover:text-blue-800 hover:underline"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-10">
                <h2 className="text-2xl font-bold text-gray-950">FAQ</h2>
                <div className="mt-4 space-y-4">
                  {post.faq.map(item => (
                    <details
                      key={item.question}
                      className="rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <summary className="cursor-pointer font-semibold text-gray-900">
                        {item.question}
                      </summary>
                      <p className="mt-3 text-gray-700">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            </div>
          </main>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-bold text-gray-950">
                Authority references
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {post.outboundReferences.map(ref => (
                  <li key={ref.href}>
                    <a
                      href={ref.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:text-blue-800 hover:underline"
                    >
                      {ref.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-bold text-gray-950">
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
                      className="text-blue-700 hover:text-blue-800 hover:underline"
                    >
                      {target.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            {relatedPosts.length > 0 && (
              <section className="rounded-3xl border border-gray-200 bg-white p-5">
                <h2 className="text-lg font-bold text-gray-950">
                  Related articles
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  {relatedPosts.map(related => (
                    <li key={related.slug}>
                      <Link
                        href={`/blog/${related.slug}`}
                        className="text-blue-700 hover:text-blue-800 hover:underline"
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
