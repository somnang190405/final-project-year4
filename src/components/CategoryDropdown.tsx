import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import "./CategoryDropdown.css";

interface Category {
  name: string;
  subcategories: string[];
}

const CATEGORIES: Category[] = [
  {
    name: "Men",
    subcategories: [
      "T-Shirts",
      "Shirts",
      "Hoodies & Jackets",
      "Jeans",
      "Trousers",
      "Shorts",
      "Sneakers",
      "Sandals",
      "Formal Shoes",
      "Bags",
      "Caps & Hats",
      "Belts",
      "Socks",
    ],
  },
  {
    name: "Women",
    subcategories: [
      "Tops",
      "Dresses",
      "Hoodies & Jackets",
      "Jeans",
      "Skirts",
      "Shorts",
      "Heels",
      "Flats",
      "Sneakers",
      "Sandals",
      "Bags",
      "Jewelry",
      "Hats",
      "Sunglasses",
    ],
  },
  {
    name: "Boys",
    subcategories: [
      "T-Shirts",
      "Shirts",
      "Jackets",
      "Jeans",
      "Shorts",
      "Sneakers",
      "Sandals",
      "Caps",
      "Backpacks",
      "Socks",
    ],
  },
  {
    name: "Girls",
    subcategories: [
      "Dresses",
      "Tops",
      "Jackets",
      "Jeans",
      "Skirts",
      "Flats",
      "Sneakers",
      "Sandals",
      "Bags",
      "Hair Accessories",
      "Hats",
    ],
  },
];

const CategoryDropdown: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (categoryName: string) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    setActiveCategory(categoryName);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setActiveCategory(null);
    }, 150);
    setHoverTimeout(timeout);
  };

  const handleSubcategoryClick = (
    categoryName: string,
    subcategoryName: string
  ) => {
    // Navigate to shop with filters
    const searchParams = new URLSearchParams();
    searchParams.set("category", categoryName);
    searchParams.set("subcategory", subcategoryName);
    window.location.href = `/shop?${searchParams.toString()}`;
  };

  return (
    <div className="category-dropdown-wrapper">
      {CATEGORIES.map((category) => (
        <div
          key={category.name}
          className="category-item"
          onMouseEnter={() => handleMouseEnter(category.name)}
          onMouseLeave={handleMouseLeave}
        >
          <button className="category-button">
            {category.name}
            <ChevronDown
              size={16}
              className={`transition-transform ${
                activeCategory === category.name ? "rotate-180" : ""
              }`}
            />
          </button>

          {activeCategory === category.name && (
            <div
              className="category-submenu"
              onMouseEnter={() => handleMouseEnter(category.name)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="submenu-grid">
                {category.subcategories.map((subcategory) => (
                  <button
                    key={subcategory}
                    className="submenu-item"
                    onClick={() =>
                      handleSubcategoryClick(category.name, subcategory)
                    }
                  >
                    {subcategory}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CategoryDropdown;
