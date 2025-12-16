import { useState } from "react";
import { Heart, Plus } from "lucide-react";
import imgProduct1 from "figma:asset/4fa8b39e9c2ac96748ac43f791167a77131c590e.png";
import imgProduct2 from "figma:asset/22e8cdddd9ab3900abde04f193e6b75a535503ff.png";
import imgProduct3 from "figma:asset/f088d7ec9f16661bc461a762417ac9e90242645d.png";
import imgProduct4 from "figma:asset/432e520b35ca5db7bb27272f597e5876cda9dd9a.png";
import imgProduct5 from "figma:asset/4bccc138d7d406e34e8558c132be301bebc7f3d7.png";
import imgProduct6 from "figma:asset/46ea705ffd78f4019918bb2fd2b66e6caa50008e.png";
import imgProduct8 from "figma:asset/c90671806a221dfe4f2cfa2c496b9afe21957596.png";
import imgProduct9 from "figma:asset/60aeb6e8fae869d59657e4792208dcffbd4ed8de.png";
import imgProduct10 from "figma:asset/eb34852b4e297ee7b9fefd08cceddc7281c77866.png";
import imgProduct11 from "figma:asset/049a6e5cda93fc93492b0452f06f9ce2d1c062e4.png";
import imgProduct12 from "figma:asset/bfb0a76ed33c7802b805fae5c2717c5f337ffb87.png";
import imgProduct13 from "figma:asset/9b9e29faabe6d02fbddb40d7181f00f5169c1042.png";
import imgProduct14 from "figma:asset/024d1179f5b1864e85e8d66a4862ca6b0409319c.png";
import imgProduct15 from "figma:asset/d3e8201b26e4bdb300ee825201cf21d582bfda16.png";
import imgProduct16 from "figma:asset/f09776468c431cd80517f08553b3afb7b61d6f44.png";
import imgProduct17 from "figma:asset/24f726cdcbea5949b9b6f1df05e29d7f53d7b8bc.png";
import imgProduct18 from "figma:asset/3468de44fa3a04d3198a56a23dfc70c4d84eb9c8.png";

const allProducts = [
  { id: 1, category: "Men", name: "NEAR Protocol Hoodie", price: 65, image: imgProduct1 },
  { id: 2, category: "Women", name: "Classic NEAR Tee", price: 35, image: imgProduct2 },
  { id: 3, category: "Accessories", name: "NEAR Snapback Cap", price: 28, image: imgProduct3 },
  { id: 4, category: "Accessories", name: "Protocol Tote Bag", price: 22, image: imgProduct4 },
  { id: 5, category: "Accessories", name: "NEAR Coffee Mug", price: 18, image: imgProduct5 },
  { id: 6, category: "Exclusives", name: "Sticker Pack", price: 12, image: imgProduct6 },
  { id: 7, category: "Men", name: "Men's Essential Tee - Black", price: 32, image: "https://images.unsplash.com/photo-1667744565777-fa2eb22adeeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW4lMjB3ZWFyaW5nJTIwYmxhY2slMjB0c2hpcnR8ZW58MXx8fHwxNzYzNjU1NDY1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" },
  { id: 8, category: "Men", name: "Men's Oversized Tee", price: 38, image: imgProduct8 },
  { id: 9, category: "Women", name: "Women's Crop Tee", price: 30, image: imgProduct9 },
  { id: 10, category: "Men", name: "Men's Polo Shirt", price: 45, image: imgProduct10 },
  { id: 11, category: "Women", name: "Women's Fitted Tee", price: 30, image: imgProduct11 },
  { id: 12, category: "Exclusives", name: "Founder's Edition Tee", price: 40, image: imgProduct12 },
  { id: 13, category: "Women", name: "Women's Crop Tee", price: 30, image: imgProduct13 },
  { id: 14, category: "Men", name: "Men's Oversized Tee", price: 38, image: imgProduct14 },
  { id: 15, category: "Exclusives", name: "Limited Edition Black Tee", price: 45, image: imgProduct15 },
  { id: 16, category: "Women", name: "Women's Hoodie", price: 68, image: imgProduct16 },
  { id: 17, category: "Accessories", name: "NEAR Backpack", price: 75, image: imgProduct17 },
  { id: 18, category: "Accessories", name: "NEAR Water Bottle", price: 20, image: imgProduct18 },
];

interface SearchViewProps {
  searchQuery: string;
  favorites: number[];
  onToggleFavorite: (id: number) => void;
  onAddToCart: (id: number) => void;
  categoryFilter: string | null;
  onNavigateToProduct?: (productId: number) => void;
}

export function SearchView({ searchQuery, favorites, onToggleFavorite, onAddToCart, categoryFilter, onNavigateToProduct }: SearchViewProps) {
  const [activeFilter, setActiveFilter] = useState(categoryFilter || "All");
  const [sortBy, setSortBy] = useState("Featured");

  // Update activeFilter when categoryFilter changes
  if (categoryFilter && activeFilter !== categoryFilter) {
    setActiveFilter(categoryFilter);
  }

  const filters = ["All", "Men", "Women", "Exclusives", "Accessories"];

  // Filter by search query
  const searchFilteredProducts = searchQuery
    ? allProducts.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : allProducts;

  // Filter by category
  const filteredProducts = activeFilter === "All"
    ? searchFilteredProducts
    : searchFilteredProducts.filter(p => p.category === activeFilter);

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "Price: Low to High") return a.price - b.price;
    if (sortBy === "Price: High to Low") return b.price - a.price;
    return 0; // Featured - keep original order
  });

  return (
    <section className="min-h-screen py-24 border-b border-[rgba(0,0,0,0.1)]">
      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-neutral-950 mb-6">All Products</h1>
          <p className="text-lg text-[#717182] max-w-3xl mx-auto">
            Browse our complete collection of premium NEAR Protocol merchandise. {sortedProducts.length} products available.
          </p>
        </div>

        {/* Filter and Sort Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 border transition-colors ${activeFilter === filter
                  ? "bg-neutral-950 text-white border-neutral-950"
                  : "bg-white text-neutral-950 border-[rgba(0,0,0,0.1)] hover:border-neutral-950"
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#717182]">SORT BY:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-[rgba(0,0,0,0.1)] px-4 py-2 bg-white text-neutral-950 cursor-pointer hover:border-neutral-950 transition-colors"
            >
              <option>Featured</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sortedProducts.map((product) => (
              <SearchProductCard
                key={product.id}
                {...product}
                isFavorite={favorites.includes(product.id)}
                onToggleFavorite={onToggleFavorite}
                onAddToCart={onAddToCart}
                onNavigateToProduct={onNavigateToProduct}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-[#717182] text-lg">
              No products found matching "{searchQuery}"
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

interface SearchProductCardProps {
  id: number;
  category: string;
  name: string;
  price: number;
  image: string;
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
  onAddToCart: (id: number) => void;
  onNavigateToProduct?: (productId: number) => void;
}

function SearchProductCard({
  id,
  category,
  name,
  price,
  image,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  onNavigateToProduct
}: SearchProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group bg-white border border-[rgba(0,0,0,0.1)] overflow-hidden cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onNavigateToProduct?.(id)}
    >
      {/* Image Container */}
      <div className="relative bg-[#ececf0] aspect-square overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
        />

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(id);
          }}
          className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm hover:bg-white transition-all z-10"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={`size-4 ${isFavorite ? "fill-black stroke-black" : "stroke-black"}`}
          />
        </button>

        {/* Quick Add Button */}
        <div
          className={`absolute bottom-0 left-0 right-0 flex items-center justify-center p-6 transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"
            }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(id);
            }}
            className="bg-neutral-950 text-white px-6 py-2 flex items-center gap-2 hover:bg-neutral-800 transition-colors"
          >
            <Plus className="size-4" />
            QUICK ADD
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <p className="text-xs text-[#717182] uppercase tracking-wider mb-1">
          {category}
        </p>
        <h3 className="text-neutral-950 mb-2 line-clamp-2">{name}</h3>
        <p className="text-neutral-950">${price}</p>
      </div>
    </div>
  );
}