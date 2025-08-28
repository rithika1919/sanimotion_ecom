import {
  HIDDEN_PRODUCT_TAG,
  SHOPIFY_GRAPHQL_API_ENDPOINT,
  TAGS
} from 'lib/constants';
import { isShopifyError } from 'lib/type-guards';
import { ensureStartsWith } from 'lib/utils';
import {
  unstable_cacheLife as cacheLife,
  unstable_cacheTag as cacheTag,
  revalidateTag
} from 'next/cache';
import { cookies, headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  addToCartMutation,
  createCartMutation,
  editCartItemsMutation,
  removeFromCartMutation
} from './mutations/cart';
import { getCartQuery } from './queries/cart';
import {
  getCollectionProductsQuery,
  getCollectionQuery,
  getCollectionsQuery
} from './queries/collection';
import { getMenuQuery } from './queries/menu';
import { getPageQuery, getPagesQuery } from './queries/page';
import {
  getProductQuery,
  getProductRecommendationsQuery,
  getProductsQuery
} from './queries/product';
import {
  Cart,
  Collection,
  Connection,
  Image,
  Menu,
  Page,
  Product,
  ShopifyAddToCartOperation,
  ShopifyCart,
  ShopifyCartOperation,
  ShopifyCollection,
  ShopifyCollectionOperation,
  ShopifyCollectionProductsOperation,
  ShopifyCollectionsOperation,
  ShopifyCreateCartOperation,
  ShopifyMenuOperation,
  ShopifyPageOperation,
  ShopifyPagesOperation,
  ShopifyProduct,
  ShopifyProductOperation,
  ShopifyProductRecommendationsOperation,
  ShopifyProductsOperation,
  ShopifyRemoveFromCartOperation,
  ShopifyUpdateCartOperation
} from './types';

const domain = process.env.SHOPIFY_STORE_DOMAIN
  ? ensureStartsWith(process.env.SHOPIFY_STORE_DOMAIN, 'https://')
  : '';
const endpoint = domain ? `${domain}${SHOPIFY_GRAPHQL_API_ENDPOINT}` : '';
const key = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || '';

type ExtractVariables<T> = T extends { variables: object }
  ? T['variables']
  : never;

// Mock data for when Shopify is not configured
const mockProducts = [
  {
    id: 'mock-1',
    handle: 'acme-circles-t-shirt',
    availableForSale: true,
    title: 'Acme Circles T-Shirt',
    description: 'A comfortable t-shirt with the Acme logo.',
    descriptionHtml: '<p>A comfortable t-shirt with the Acme logo.</p>',
    options: [
      {
        id: 'option-1',
        name: 'Size',
        values: ['S', 'M', 'L', 'XL']
      }
    ],
    priceRange: {
      maxVariantPrice: {
        amount: '20.00',
        currencyCode: 'USD'
      },
      minVariantPrice: {
        amount: '20.00',
        currencyCode: 'USD'
      }
    },
    variants: {
      edges: [
        {
          node: {
            id: 'variant-1',
            title: 'S',
            availableForSale: true,
            selectedOptions: [{ name: 'Size', value: 'S' }],
            price: { amount: '20.00', currencyCode: 'USD' }
          }
        }
      ]
    },
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=750&h=1000&fit=crop',
      altText: 'Acme Circles T-Shirt',
      width: 750,
      height: 1000
    },
    images: {
      edges: [
        {
          node: {
            url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=750&h=1000&fit=crop',
            altText: 'Acme Circles T-Shirt',
            width: 750,
            height: 1000
          }
        }
      ]
    },
    seo: {
      description: 'A comfortable t-shirt with the Acme logo.',
      title: 'Acme Circles T-Shirt'
    },
    tags: ['t-shirt', 'acme'],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock-2',
    handle: 'acme-drawstring-bag',
    availableForSale: true,
    title: 'Acme Drawstring Bag',
    description: 'A practical drawstring bag for everyday use.',
    descriptionHtml: '<p>A practical drawstring bag for everyday use.</p>',
    options: [
      {
        id: 'option-2',
        name: 'Color',
        values: ['Black', 'White']
      }
    ],
    priceRange: {
      maxVariantPrice: {
        amount: '12.00',
        currencyCode: 'USD'
      },
      minVariantPrice: {
        amount: '12.00',
        currencyCode: 'USD'
      }
    },
    variants: {
      edges: [
        {
          node: {
            id: 'variant-2',
            title: 'Black',
            availableForSale: true,
            selectedOptions: [{ name: 'Color', value: 'Black' }],
            price: { amount: '12.00', currencyCode: 'USD' }
          }
        }
      ]
    },
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=750&h=1000&fit=crop',
      altText: 'Acme Drawstring Bag',
      width: 750,
      height: 1000
    },
    images: {
      edges: [
        {
          node: {
            url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=750&h=1000&fit=crop',
            altText: 'Acme Drawstring Bag',
            width: 750,
            height: 1000
          }
        }
      ]
    },
    seo: {
      description: 'A practical drawstring bag for everyday use.',
      title: 'Acme Drawstring Bag'
    },
    tags: ['bag', 'acme'],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock-3',
    handle: 'acme-cup',
    availableForSale: true,
    title: 'Acme Cup',
    description: 'A durable cup for your daily beverages.',
    descriptionHtml: '<p>A durable cup for your daily beverages.</p>',
    options: [
      {
        id: 'option-3',
        name: 'Color',
        values: ['White', 'Black']
      }
    ],
    priceRange: {
      maxVariantPrice: {
        amount: '15.00',
        currencyCode: 'USD'
      },
      minVariantPrice: {
        amount: '15.00',
        currencyCode: 'USD'
      }
    },
    variants: {
      edges: [
        {
          node: {
            id: 'variant-3',
            title: 'White',
            availableForSale: true,
            selectedOptions: [{ name: 'Color', value: 'White' }],
            price: { amount: '15.00', currencyCode: 'USD' }
          }
        }
      ]
    },
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=750&h=1000&fit=crop',
      altText: 'Acme Cup',
      width: 750,
      height: 1000
    },
    images: {
      edges: [
        {
          node: {
            url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=750&h=1000&fit=crop',
            altText: 'Acme Cup',
            width: 750,
            height: 1000
          }
        }
      ]
    },
    seo: {
      description: 'A durable cup for your daily beverages.',
      title: 'Acme Cup'
    },
    tags: ['cup', 'acme'],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock-4',
    handle: 'acme-mug',
    availableForSale: true,
    title: 'Acme Mug',
    description: 'A classic mug for your morning coffee.',
    descriptionHtml: '<p>A classic mug for your morning coffee.</p>',
    options: [
      {
        id: 'option-4',
        name: 'Color',
        values: ['White', 'Black']
      }
    ],
    priceRange: {
      maxVariantPrice: {
        amount: '15.00',
        currencyCode: 'USD'
      },
      minVariantPrice: {
        amount: '15.00',
        currencyCode: 'USD'
      }
    },
    variants: {
      edges: [
        {
          node: {
            id: 'variant-4',
            title: 'White',
            availableForSale: true,
            selectedOptions: [{ name: 'Color', value: 'White' }],
            price: { amount: '15.00', currencyCode: 'USD' }
          }
        }
      ]
    },
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=750&h=1000&fit=crop',
      altText: 'Acme Mug',
      width: 750,
      height: 1000
    },
    images: {
      edges: [
        {
          node: {
            url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=750&h=1000&fit=crop',
            altText: 'Acme Mug',
            width: 750,
            height: 1000
          }
        }
      ]
    },
    seo: {
      description: 'A classic mug for your morning coffee.',
      title: 'Acme Mug'
    },
    tags: ['mug', 'acme'],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock-5',
    handle: 'acme-hoodie',
    availableForSale: true,
    title: 'Acme Hoodie',
    description: 'A warm and comfortable hoodie for cold days.',
    descriptionHtml: '<p>A warm and comfortable hoodie for cold days.</p>',
    options: [
      {
        id: 'option-5',
        name: 'Size',
        values: ['S', 'M', 'L', 'XL']
      }
    ],
    priceRange: {
      maxVariantPrice: {
        amount: '50.00',
        currencyCode: 'USD'
      },
      minVariantPrice: {
        amount: '50.00',
        currencyCode: 'USD'
      }
    },
    variants: {
      edges: [
        {
          node: {
            id: 'variant-5',
            title: 'M',
            availableForSale: true,
            selectedOptions: [{ name: 'Size', value: 'M' }],
            price: { amount: '50.00', currencyCode: 'USD' }
          }
        }
      ]
    },
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=750&h=1000&fit=crop',
      altText: 'Acme Hoodie',
      width: 750,
      height: 1000
    },
    images: {
      edges: [
        {
          node: {
            url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=750&h=1000&fit=crop',
            altText: 'Acme Hoodie',
            width: 750,
            height: 1000
          }
        }
      ]
    },
    seo: {
      description: 'A warm and comfortable hoodie for cold days.',
      title: 'Acme Hoodie'
    },
    tags: ['hoodie', 'acme'],
    updatedAt: new Date().toISOString()
  }
];

export async function shopifyFetch<T>({
  headers,
  query,
  variables
}: {
  headers?: HeadersInit;
  query: string;
  variables?: ExtractVariables<T>;
}): Promise<{ status: number; body: T } | never> {
  // If Shopify environment variables are not configured, return mock data
  if (!endpoint || !key) {
    console.warn('Shopify environment variables not configured. Using mock data.');
    return {
      status: 200,
      body: {} as T
    };
  }

  try {
    const result = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': key,
        ...headers
      },
      body: JSON.stringify({
        ...(query && { query }),
        ...(variables && { variables })
      })
    });

    const body = await result.json();

    if (body.errors) {
      throw body.errors[0];
    }

    return {
      status: result.status,
      body
    };
  } catch (e) {
    if (isShopifyError(e)) {
      throw {
        cause: e.cause?.toString() || 'unknown',
        status: e.status || 500,
        message: e.message,
        query
      };
    }

    throw {
      error: e,
      query
    };
  }
}

const removeEdgesAndNodes = <T>(array: Connection<T>): T[] => {
  return array.edges.map((edge) => edge?.node);
};

const reshapeCart = (cart: ShopifyCart): Cart => {
  if (!cart.cost?.totalTaxAmount) {
    cart.cost.totalTaxAmount = {
      amount: '0.0',
      currencyCode: cart.cost.totalAmount.currencyCode
    };
  }

  return {
    ...cart,
    lines: removeEdgesAndNodes(cart.lines)
  };
};

const reshapeCollection = (
  collection: ShopifyCollection
): Collection | undefined => {
  if (!collection) {
    return undefined;
  }

  return {
    ...collection,
    path: `/search/${collection.handle}`
  };
};

const reshapeCollections = (collections: ShopifyCollection[]) => {
  const reshapedCollections = [];

  for (const collection of collections) {
    if (collection) {
      const reshapedCollection = reshapeCollection(collection);

      if (reshapedCollection) {
        reshapedCollections.push(reshapedCollection);
      }
    }
  }

  return reshapedCollections;
};

const reshapeImages = (images: Connection<Image>, productTitle: string) => {
  const flattened = removeEdgesAndNodes(images);

  return flattened.map((image) => {
    const filename = image.url.match(/.*\/(.*)\..*/)?.[1];
    return {
      ...image,
      altText: image.altText || `${productTitle} - ${filename}`
    };
  });
};

const reshapeProduct = (
  product: ShopifyProduct,
  filterHiddenProducts: boolean = true
) => {
  if (
    !product ||
    (filterHiddenProducts && product.tags.includes(HIDDEN_PRODUCT_TAG))
  ) {
    return undefined;
  }

  const { images, variants, ...rest } = product;

  return {
    ...rest,
    images: reshapeImages(images, product.title),
    variants: removeEdgesAndNodes(variants)
  };
};

const reshapeProducts = (products: ShopifyProduct[]) => {
  const reshapedProducts = [];

  for (const product of products) {
    if (product) {
      const reshapedProduct = reshapeProduct(product);

      if (reshapedProduct) {
        reshapedProducts.push(reshapedProduct);
      }
    }
  }

  return reshapedProducts;
};

export async function createCart(): Promise<Cart> {
  // If Shopify is not configured, return mock cart
  if (!endpoint || !key) {
    return {
      id: 'mock-cart',
      checkoutUrl: '#',
      cost: {
        subtotalAmount: { amount: '0.00', currencyCode: 'USD' },
        totalAmount: { amount: '0.00', currencyCode: 'USD' },
        totalTaxAmount: { amount: '0.00', currencyCode: 'USD' }
      },
      lines: [],
      totalQuantity: 0
    };
  }

  const res = await shopifyFetch<ShopifyCreateCartOperation>({
    query: createCartMutation
  });

  return reshapeCart(res.body.data.cartCreate.cart);
}

export async function addToCart(
  lines: { merchandiseId: string; quantity: number }[]
): Promise<Cart> {
  const cartId = (await cookies()).get('cartId')?.value!;
  const res = await shopifyFetch<ShopifyAddToCartOperation>({
    query: addToCartMutation,
    variables: {
      cartId,
      lines
    }
  });
  return reshapeCart(res.body.data.cartLinesAdd.cart);
}

export async function removeFromCart(lineIds: string[]): Promise<Cart> {
  const cartId = (await cookies()).get('cartId')?.value!;
  const res = await shopifyFetch<ShopifyRemoveFromCartOperation>({
    query: removeFromCartMutation,
    variables: {
      cartId,
      lineIds
    }
  });

  return reshapeCart(res.body.data.cartLinesRemove.cart);
}

export async function updateCart(
  lines: { id: string; merchandiseId: string; quantity: number }[]
): Promise<Cart> {
  const cartId = (await cookies()).get('cartId')?.value!;
  const res = await shopifyFetch<ShopifyUpdateCartOperation>({
    query: editCartItemsMutation,
    variables: {
      cartId,
      lines
    }
  });

  return reshapeCart(res.body.data.cartLinesUpdate.cart);
}

export async function getCart(): Promise<Cart | undefined> {
  // If Shopify is not configured, return undefined for cart
  if (!endpoint || !key) {
    return undefined;
  }

  const cartId = (await cookies()).get('cartId')?.value;

  if (!cartId) {
    return undefined;
  }

  const res = await shopifyFetch<ShopifyCartOperation>({
    query: getCartQuery,
    variables: { cartId }
  });

  // Old carts becomes `null` when you checkout.
  if (!res.body.data.cart) {
    return undefined;
  }

  return reshapeCart(res.body.data.cart);
}

export async function getCollection(
  handle: string
): Promise<Collection | undefined> {
  // If Shopify is not configured, return mock collection
  if (!endpoint || !key) {
    const mockCollections = [
      {
        handle: '',
        title: 'All',
        description: 'All products',
        seo: {
          title: 'All',
          description: 'All products'
        },
        path: '/search',
        updatedAt: new Date().toISOString()
      },
      {
        handle: 'shirts',
        title: 'Shirts',
        description: 'Comfortable shirts for everyday wear',
        seo: {
          title: 'Shirts',
          description: 'Comfortable shirts for everyday wear'
        },
        path: '/search/shirts',
        updatedAt: new Date().toISOString()
      },
      {
        handle: 'stickers',
        title: 'Stickers',
        description: 'Fun stickers for your belongings',
        seo: {
          title: 'Stickers',
          description: 'Fun stickers for your belongings'
        },
        path: '/search/stickers',
        updatedAt: new Date().toISOString()
      }
    ];
    return mockCollections.find(c => c.handle === handle);
  }

  const res = await shopifyFetch<ShopifyCollectionOperation>({
    query: getCollectionQuery,
    variables: {
      handle
    }
  });

  return reshapeCollection(res.body.data.collection);
}

export async function getCollectionProducts({
  collection,
  reverse,
  sortKey
}: {
  collection: string;
  reverse?: boolean;
  sortKey?: string;
}): Promise<Product[]> {
  // If Shopify is not configured, return mock products for collections
  if (!endpoint || !key) {
    return reshapeProducts(mockProducts);
  }

  const res = await shopifyFetch<ShopifyCollectionProductsOperation>({
    query: getCollectionProductsQuery,
    variables: {
      handle: collection,
      reverse,
      sortKey: sortKey === 'CREATED_AT' ? 'CREATED' : sortKey
    }
  });

  if (!res.body.data.collection) {
    console.log(`No collection found for \`${collection}\``);
    return [];
  }

  return reshapeProducts(
    removeEdgesAndNodes(res.body.data.collection.products)
  );
}

export async function getCollections(): Promise<Collection[]> {
  // If Shopify is not configured, return mock collections
  if (!endpoint || !key) {
    return [
      {
        handle: '',
        title: 'All',
        description: 'All products',
        seo: {
          title: 'All',
          description: 'All products'
        },
        path: '/search',
        updatedAt: new Date().toISOString()
      },
      {
        handle: 'shirts',
        title: 'Shirts',
        description: 'Comfortable shirts for everyday wear',
        seo: {
          title: 'Shirts',
          description: 'Comfortable shirts for everyday wear'
        },
        path: '/search/shirts',
        updatedAt: new Date().toISOString()
      },
      {
        handle: 'stickers',
        title: 'Stickers',
        description: 'Fun stickers for your belongings',
        seo: {
          title: 'Stickers',
          description: 'Fun stickers for your belongings'
        },
        path: '/search/stickers',
        updatedAt: new Date().toISOString()
      }
    ];
  }

  const res = await shopifyFetch<ShopifyCollectionsOperation>({
    query: getCollectionsQuery
  });
  const shopifyCollections = removeEdgesAndNodes(res.body?.data?.collections);
  const collections = [
    {
      handle: '',
      title: 'All',
      description: 'All products',
      seo: {
        title: 'All',
        description: 'All products'
      },
      path: '/search',
      updatedAt: new Date().toISOString()
    },
    // Filter out the `hidden` collections.
    // Collections that start with `hidden-*` need to be hidden on the search page.
    ...reshapeCollections(shopifyCollections).filter(
      (collection) => !collection.handle.startsWith('hidden')
    )
  ];

  return collections;
}

export async function getMenu(handle: string): Promise<Menu[]> {
  'use cache';
  cacheTag(TAGS.collections);
  cacheLife('days');

  // If Shopify is not configured, return mock menu items
  if (!endpoint || !key) {
    if (handle === 'next-js-frontend-header-menu') {
      return [
        {
          title: 'All',
          path: '/search'
        },
        {
          title: 'Shirts',
          path: '/search/shirts'
        },
        {
          title: 'Stickers',
          path: '/search/stickers'
        }
      ];
    }
    if (handle === 'next-js-frontend-footer-menu') {
      return [
        {
          title: 'Home',
          path: '/'
        },
        {
          title: 'About',
          path: '/about'
        },
        {
          title: 'Terms & Conditions',
          path: '/terms'
        },
        {
          title: 'Shipping & Return Policy',
          path: '/shipping'
        },
        {
          title: 'Privacy Policy',
          path: '/privacy'
        },
        {
          title: 'FAQ',
          path: '/faq'
        }
      ];
    }
    return [];
  }

  const res = await shopifyFetch<ShopifyMenuOperation>({
    query: getMenuQuery,
    variables: {
      handle
    }
  });

  return (
    res.body?.data?.menu?.items.map((item: { title: string; url: string }) => ({
      title: item.title,
      path: item.url
        .replace(domain, '')
        .replace('/collections', '/search')
        .replace('/pages', '')
    })) || []
  );
}

export async function getPage(handle: string): Promise<Page> {
  const res = await shopifyFetch<ShopifyPageOperation>({
    query: getPageQuery,
    variables: { handle }
  });

  return res.body.data.pageByHandle;
}

export async function getPages(): Promise<Page[]> {
  const res = await shopifyFetch<ShopifyPagesOperation>({
    query: getPagesQuery
  });

  return removeEdgesAndNodes(res.body.data.pages);
}

export async function getProduct(handle: string): Promise<Product | undefined> {
  // If Shopify is not configured, return mock product
  if (!endpoint || !key) {
    const mockProduct = mockProducts.find(p => p.handle === handle);
    return mockProduct ? reshapeProduct(mockProduct, false) : undefined;
  }

  const res = await shopifyFetch<ShopifyProductOperation>({
    query: getProductQuery,
    variables: {
      handle
    }
  });

  return reshapeProduct(res.body.data.product, false);
}

export async function getProductRecommendations(
  productId: string
): Promise<Product[]> {
  'use cache';
  cacheTag(TAGS.products);
  cacheLife('days');

  // If Shopify is not configured, return empty array
  if (!endpoint || !key) {
    return [];
  }

  const res = await shopifyFetch<ShopifyProductRecommendationsOperation>({
    query: getProductRecommendationsQuery,
    variables: {
      productId
    }
  });

  return reshapeProducts(res.body.data.productRecommendations);
}

export async function getProducts({
  query,
  reverse,
  sortKey
}: {
  query?: string;
  reverse?: boolean;
  sortKey?: string;
}): Promise<Product[]> {
  // If Shopify is not configured, return mock products
  if (!endpoint || !key) {
    return reshapeProducts(mockProducts);
  }

  const res = await shopifyFetch<ShopifyProductsOperation>({
    query: getProductsQuery,
    variables: {
      query,
      reverse,
      sortKey
    }
  });

  return reshapeProducts(removeEdgesAndNodes(res.body.data.products));
}

// This is called from `app/api/revalidate.ts` so providers can control revalidation logic.
export async function revalidate(req: NextRequest): Promise<NextResponse> {
  // We always need to respond with a 200 status code to Shopify,
  // otherwise it will continue to retry the request.
  const collectionWebhooks = [
    'collections/create',
    'collections/delete',
    'collections/update'
  ];
  const productWebhooks = [
    'products/create',
    'products/delete',
    'products/update'
  ];
  const topic = (await headers()).get('x-shopify-topic') || 'unknown';
  const secret = req.nextUrl.searchParams.get('secret');
  const isCollectionUpdate = collectionWebhooks.includes(topic);
  const isProductUpdate = productWebhooks.includes(topic);

  if (!secret || secret !== process.env.SHOPIFY_REVALIDATION_SECRET) {
    console.error('Invalid revalidation secret.');
    return NextResponse.json({ status: 401 });
  }

  if (!isCollectionUpdate && !isProductUpdate) {
    // We don't need to revalidate anything for any other topics.
    return NextResponse.json({ status: 200 });
  }

  if (isCollectionUpdate) {
    revalidateTag(TAGS.collections);
  }

  if (isProductUpdate) {
    revalidateTag(TAGS.products);
  }

  return NextResponse.json({ status: 200, revalidated: true, now: Date.now() });
}
