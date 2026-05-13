import React, { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import "./ProductFormModal.css";

export const CATEGORY_STRUCTURE = {
  Men: [
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
  Women: [
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
  Boys: [
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
  Girls: [
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
};

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => void;
  initialData?: any;
  isLoading?: boolean;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const mainCategories = Object.keys(CATEGORY_STRUCTURE) as Array<
    keyof typeof CATEGORY_STRUCTURE
  >;

  const [selectedMainCategory, setSelectedMainCategory] = useState<
    keyof typeof CATEGORY_STRUCTURE | ""
  >(initialData?.mainCategory || "");
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(
    initialData?.subcategories || []
  );
  const [expandSubcategories, setExpandSubcategories] = useState(true);

  const toggleSubcategory = (subcategory: string) => {
    setSelectedSubcategories((prev) =>
      prev.includes(subcategory)
        ? prev.filter((s) => s !== subcategory)
        : [...prev, subcategory]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMainCategory || selectedSubcategories.length === 0) {
      alert("Please select a main category and at least one subcategory");
      return;
    }
    onSubmit({
      mainCategory: selectedMainCategory,
      subcategories: selectedSubcategories,
    });
  };

  const currentSubcategories =
    selectedMainCategory && CATEGORY_STRUCTURE[selectedMainCategory]
      ? CATEGORY_STRUCTURE[selectedMainCategory]
      : [];

  if (!isOpen) return null;

  return (
    <div className="product-form-modal-overlay" onClick={onClose}>
      <div
        className="product-form-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="product-form-modal-header">
          <div>
            <h2 className="product-form-modal-title">Add Product Categories</h2>
            <p className="product-form-modal-subtitle">
              Select main category and subcategories
            </p>
          </div>
          <button
            onClick={onClose}
            className="product-form-modal-close"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="product-form-modal-body">
          <form onSubmit={handleSubmit} className="product-form">
            {/* Main Category Selection */}
            <div className="form-section">
              <label className="form-section-label">Main Category</label>
              <div className="category-grid">
                {mainCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setSelectedMainCategory(category);
                      setSelectedSubcategories([]); // Reset subcategories
                    }}
                    className={`category-card ${
                      selectedMainCategory === category
                        ? "category-card-active"
                        : ""
                    }`}
                  >
                    <span className="category-card-name">{category}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subcategories Selection */}
            {selectedMainCategory && (
              <div className="form-section">
                <button
                  type="button"
                  className="form-section-header"
                  onClick={() => setExpandSubcategories(!expandSubcategories)}
                >
                  <span className="form-section-label">Subcategories</span>
                  <ChevronDown
                    size={20}
                    className={`chevron ${expandSubcategories ? "expanded" : ""}`}
                  />
                </button>

                {expandSubcategories && (
                  <div className="subcategory-grid">
                    {currentSubcategories.map((subcategory) => (
                      <label
                        key={subcategory}
                        className="subcategory-checkbox"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubcategories.includes(subcategory)}
                          onChange={() => toggleSubcategory(subcategory)}
                        />
                        <span className="checkbox-custom" />
                        <span className="checkbox-label">{subcategory}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Selected Summary */}
                {selectedSubcategories.length > 0 && (
                  <div className="selected-tags">
                    {selectedSubcategories.map((sub) => (
                      <span key={sub} className="selected-tag">
                        {sub}
                        <button
                          type="button"
                          onClick={() => toggleSubcategory(sub)}
                          className="tag-remove"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="product-form-actions">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !selectedMainCategory || selectedSubcategories.length === 0}
                className="btn-primary"
              >
                {isLoading ? "Saving..." : "Continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductFormModal;
