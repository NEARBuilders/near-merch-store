import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading';
import {
  useSuspenseCollections,
  collectionLoaders,
} from '@/integrations/marketplace-api';
import { queryClient } from '@/utils/orpc';

export const Route = createFileRoute('/_marketplace/collections/')({
  pendingComponent: LoadingSpinner,
  loader: async () => {
    await queryClient.ensureQueryData(collectionLoaders.list());
  },
  component: CollectionsPage,
});

const collectionData = {
  men: {
    title: "Men's Collection",
    description: 'Premium fits designed specifically for men. Classic essentials to modern oversized styles.',
    image: '/images/collection-men.png',
  },
  women: {
    title: "Women's Collection",
    description: 'Tailored fits designed for women. Comfortable, stylish, and sustainably made.',
    image: '/images/collection-women.png',
  },
  exclusives: {
    title: 'NEAR Legion Collection',
    description: "Limited edition designs created in collaboration with artists. Once they're gone, they're gone.",
    image: '/images/collection-exclusives.png',
    badge: 'Limited',
  },
  accessories: {
    title: 'Accessories',
    description: 'Complete your look with our curated selection. From everyday essentials to statement pieces.',
    image: '/images/collection-accessories.png',
  },
} as const;

function CollectionsPage() {
  const { data: collectionsData } = useSuspenseCollections();
  const collections = collectionsData.collections;

  return (
    <div className="bg-white w-full">
      <div className="bg-[rgba(236,236,240,0.3)] border-b border-[rgba(0,0,0,0.1)] py-24">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="text-center space-y-6">
            <h1 className="text-2xl md:text-3xl font-medium tracking-[-0.48px]">Our Collections</h1>
            <p className="text-[#717182] text-lg leading-7 tracking-[-0.48px] max-w-[723px] mx-auto">
              Discover premium NEAR Protocol merchandise across four curated collections. Each piece is designed with quality and sustainability in mind.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {collections.map((collection) => {
            const data = collectionData[collection.slug as keyof typeof collectionData];
            if (!data) return null;
            
            return (
              <Link
                key={collection.slug}
                to="/collections/$collection"
                params={{ collection: collection.slug }}
                className="border border-[rgba(0,0,0,0.1)] overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
              >
                <div className="bg-[#ececf0] h-[400px] md:h-[517.5px] overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-[#ececf0] to-[#d4d4d8] flex items-center justify-center">
                    <span className="text-6xl opacity-30">{collection.name.charAt(0)}</span>
                  </div>
                </div>
                <div className="border-t border-[rgba(0,0,0,0.1)] p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium tracking-[-0.48px]">{data.title}</h3>
                    {'badge' in data && (
                      <span className="border border-neutral-950 px-2 py-0.5 text-xs tracking-[-0.48px]">
                        {data.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[#717182] tracking-[-0.48px] leading-6">
                    {data.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-[#717182] text-sm tracking-[-0.48px]">{collection.description}</p>
                    <span className="px-3 py-2 group-hover:bg-gray-100 transition-colors tracking-[-0.48px] text-sm">
                      Explore
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="bg-[rgba(236,236,240,0.3)] border-t border-[rgba(0,0,0,0.1)] py-16">
        <div className="max-w-[672px] mx-auto px-4 text-center space-y-10">
          <div className="space-y-4">
            <h2 className="text-xl font-medium tracking-[-0.48px]">Can't decide?</h2>
            <p className="text-[#717182] tracking-[-0.48px]">
              Browse our entire collection and find the perfect piece for you.
            </p>
          </div>
          <Link to="/search">
            <Button variant="outline" className="border-[rgba(0,0,0,0.1)]">
              View All Products
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
