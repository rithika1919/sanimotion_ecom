import OpengraphImage from 'components/opengraph-image';
import { getPage } from 'lib/shopify';

export default async function Image({ params }: { params: { page: string } }) {
  const page = await getPage(params.page);
  const title = page.seo?.title || page.title;

  return await OpengraphImage({ title });
}

// Purpose:
// Generates Open Graph images for social media sharing
// Uses the page's SEO title or falls back to the page title
// Leverages a reusable OpengraphImage component