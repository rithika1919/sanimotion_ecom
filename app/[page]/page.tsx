import { getPage } from 'lib/shopify';
import { notFound } from 'next/navigation';

export default async function Page({ params }: { params: { page: string } }) {
  const page = await getPage(params.page);

  if (!page) return notFound();

  return (
    <div className="mx-auto py-8 sm:py-16 lg:py-20">
      <h1 className="mb-8 text-5xl font-bold leading-tight tracking-tight text-gray-900">
        {page.title}
      </h1>
      <div
        className="prose mx-auto max-w-screen-lg"
        dangerouslySetInnerHTML={{ __html: page.body }}
      />
    </div>
  );
}

// Purpose:
// Fetches page data from Shopify using the getPage function
// Displays the page title and body content
// Returns a 404 if the page doesn't exist
// Uses Tailwind CSS for styling with responsive design