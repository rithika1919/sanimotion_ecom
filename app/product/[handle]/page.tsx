import { getProduct } from 'lib/shopify';
import { notFound } from 'next/navigation';
import { ProductGallery } from 'components/product/gallery';
import { ProductDescription } from 'components/product/product-description';

export default async function ProductPage({ params }: { params: { handle: string } }) {
  const product = await getProduct(params.handle);

  if (!product) return notFound();

  return (
    <div className="mx-auto max-w-screen-2xl px-4">
      <div className="flex flex-col rounded-lg border border-neutral-200 bg-white p-8 md:p-12 lg:flex-row lg:gap-8 dark:border-neutral-700 dark:bg-black">
        <div className="h-full w-full basis-full lg:basis-4/6">
          <ProductGallery product={product} />
        </div>
        <div className="basis-full lg:basis-2/6">
          <ProductDescription product={product} />
        </div>
      </div>
    </div>
  );
}
