import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'SAAS Surface';
const DEFAULT_DESCRIPTION = 'All-in-one Agency OS for client management, invoicing, proposals, contracts, marketing automation, and project tracking. White-label ready.';
const DEFAULT_URL = 'https://saassurface.com';
const DEFAULT_IMAGE = `${DEFAULT_URL}/og-image.png`;

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  url,
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
  structuredData,
  children,
}) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Agency OS for Client Management & Automation`;
  const canonicalUrl = url || DEFAULT_URL;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}

      {children}
    </Helmet>
  );
}
