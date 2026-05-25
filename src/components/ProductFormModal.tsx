import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Upload, Image as ImageIcon, AlertCircle } from "lucide-react";
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

interface FormErrors {
  [key: string]: string;
}

interface FormData {
  name: string;
  price: string;
  promotionPercent: string;
  stock: string;
  mainCategory: string;
  subcategories: string[];
  description: string;
  image: string;
  colors: string[];
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expandSubcategories, setExpandSubcategories] = useState(true);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || "",
    price: initialData?.price || "",
    promotionPercent: initialData?.promotionPercent || "0",
    stock: initialData?.stock || "",
    mainCategory: initialData?.mainCategory || "",
    subcategories: initialData?.subcategories || [],
    description: initialData?.description || "",
    image: initialData?.image || "",
    colors: initialData?.colors || [],
  });

  const [newColor, setNewColor] = useState("");

  const currentSubcategories =
    formData.mainCategory && CATEGORY_STRUCTURE[formData.mainCategory]
      ? CATEGORY_STRUCTURE[formData.mainCategory]
      : [];

  const toggleSubcategory = (subcategory: string) => {
    setFormData((prev) => ({
      ...prev,
      subcategories: prev.subcategories.includes(subcategory)
        ? prev.subcategories.filter((s) => s !== subcategory)
        : [...prev.subcategories, subcategory],
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleAddColor = () => {
    if (newColor.trim()) {
      setFormData((prev) => ({
        ...prev,
        colors: [...prev.colors, newColor.trim()],
      }));
      setNewColor("");
    }
  };

  const handleRemoveColor = (color: string) => {
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.filter((c) => c !== color),
    }));
  };

  const handleFileInputChange = (file?: File | null) => {
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Invalid file type. Allowed: PNG, JPG, WebP");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File too large. Max 5MB");
      return;
    }

    setUploadError(null);
    setImageFile(file);
    setImageMode("upload");

    // Create preview
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
  };

  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFileInputChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = "Product name is required";
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      errors.price = "Price must be greater than 0";
    }

    if (!formData.stock || parseInt(formData.stock) < 0) {
      errors.stock = "Stock must be a non-negative number";
    }

    if (!formData.mainCategory) {
      errors.mainCategory = "Category is required";
    }

    if (formData.subcategories.length === 0) {
      errors.subcategories = "Select at least one subcategory";
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required";
    }

    if (!formData.image && !imageFile) {
      errors.image = "Image is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      ...formData,
      price: parseFloat(formData.price),
      promotionPercent: parseFloat(formData.promotionPercent) || 0,
      stock: parseInt(formData.stock),
      imageFile: imageMode === "upload" ? imageFile : null,
    });
  };

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, []);

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
            <h2 className="product-form-modal-title">Add New Product</h2>
            <p className="product-form-modal-subtitle">
              Fill in all required fields to create a new product
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
            {/* Basic Information Section */}
            <div className="form-section-group">
              <h3 className="form-section-title">Basic Information</h3>

              {/* Product Name */}
              <div className="form-group">
                <label className="form-label">
                  Product Name <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter product name"
                  className={`form-input ${formErrors.name ? "error" : ""}`}
                />
                {formErrors.name && (
                  <span className="error-message">
                    <AlertCircle size={14} />
                    {formErrors.name}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">
                  Description <span className="required-indicator">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter product description"
                  rows={4}
                  className={`form-input textarea ${
                    formErrors.description ? "error" : ""
                  }`}
                />
                {formErrors.description && (
                  <span className="error-message">
                    <AlertCircle size={14} />
                    {formErrors.description}
                  </span>
                )}
              </div>

              {/* Price and Stock Row */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Price <span className="required-indicator">*</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={`form-input ${formErrors.price ? "error" : ""}`}
                  />
                  {formErrors.price && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {formErrors.price}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Stock Quantity <span className="required-indicator">*</span></label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    className={`form-input ${formErrors.stock ? "error" : ""}`}
                  />
                  {formErrors.stock && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {formErrors.stock}
                    </span>
                  )}
                </div>
              </div>

              {/* Promotion Percent */}
              <div className="form-group">
                <label className="form-label">Promotion Discount (%)</label>
                <input
                  type="number"
                  name="promotionPercent"
                  value={formData.promotionPercent}
                  onChange={handleInputChange}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.1"
                  className="form-input"
                />
              </div>
            </div>

            {/* Category Section */}
            <div className="form-section-group">
              <h3 className="form-section-title">Categories</h3>

              {/* Main Category Selection */}
              <div className="form-group">
                <label className="form-label">
                  Main Category <span className="required-indicator">*</span>
                </label>
                <div className="category-grid">
                  {mainCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          mainCategory: category,
                          subcategories: [],
                        }));
                        if (formErrors.mainCategory) {
                          setFormErrors((prev) => ({
                            ...prev,
                            mainCategory: "",
                          }));
                        }
                      }}
                      className={`category-card ${
                        formData.mainCategory === category
                          ? "category-card-active"
                          : ""
                      }`}
                    >
                      <span className="category-card-name">{category}</span>
                    </button>
                  ))}
                </div>
                {formErrors.mainCategory && (
                  <span className="error-message">
                    <AlertCircle size={14} />
                    {formErrors.mainCategory}
                  </span>
                )}
              </div>

              {/* Subcategories Selection */}
              {formData.mainCategory && (
                <div className="form-group">
                  <button
                    type="button"
                    className="form-section-header"
                    onClick={() =>
                      setExpandSubcategories(!expandSubcategories)
                    }
                  >
                    <span className="form-label">
                      Subcategories{" "}
                      <span className="required-indicator">*</span>
                    </span>
                    <ChevronDown
                      size={20}
                      className={`chevron ${
                        expandSubcategories ? "expanded" : ""
                      }`}
                    />
                  </button>

                  {expandSubcategories && (
                    <>
                      <div className="subcategory-grid">
                        {currentSubcategories.map((subcategory) => (
                          <label
                            key={subcategory}
                            className="subcategory-checkbox"
                          >
                            <input
                              type="checkbox"
                              checked={formData.subcategories.includes(
                                subcategory
                              )}
                              onChange={() => {
                                toggleSubcategory(subcategory);
                                if (formErrors.subcategories) {
                                  setFormErrors((prev) => ({
                                    ...prev,
                                    subcategories: "",
                                  }));
                                }
                              }}
                            />
                            <span className="checkbox-custom" />
                            <span className="checkbox-label">
                              {subcategory}
                            </span>
                          </label>
                        ))}
                      </div>

                      {/* Selected Summary */}
                      {formData.subcategories.length > 0 && (
                        <div className="selected-tags">
                          {formData.subcategories.map((sub) => (
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
                    </>
                  )}

                  {formErrors.subcategories && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {formErrors.subcategories}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Image Section */}
            <div className="form-section-group">
              <h3 className="form-section-title">Product Image <span className="required-indicator">*</span></h3>

              {/* Image Mode Toggle */}
              <div className="form-group">
                <label className="form-label">Image Source</label>
                <div className="segmented-toggle">
                  <button
                    type="button"
                    className={`toggle-option ${
                      imageMode === "url" ? "active" : ""
                    }`}
                    onClick={() => {
                      setImageMode("url");
                      setImageFile(null);
                      setImagePreviewUrl(null);
                      setUploadError(null);
                    }}
                  >
                    <ImageIcon size={16} />
                    Use URL
                  </button>
                  <button
                    type="button"
                    className={`toggle-option ${
                      imageMode === "upload" ? "active" : ""
                    }`}
                    onClick={() => setImageMode("upload")}
                  >
                    <Upload size={16} />
                    Upload Image
                  </button>
                </div>
              </div>

              {imageMode === "url" ? (
                <div className="form-group">
                  <label className="form-label">Image URL</label>
                  <input
                    type="url"
                    name="image"
                    value={formData.image}
                    onChange={handleInputChange}
                    placeholder="https://example.com/image.jpg"
                    className={`form-input ${formErrors.image ? "error" : ""}`}
                  />
                  {formData.image && (
                    <div className="image-preview-container">
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="image-preview"
                      />
                    </div>
                  )}
                  {formErrors.image && !formData.image && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {formErrors.image}
                    </span>
                  )}
                </div>
              ) : (
                <div className="form-group">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleFileInputChange(e.target.files?.[0])
                    }
                    className="hidden-file-input"
                  />

                  {!imageFile ? (
                    <div
                      className="dropzone"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onClick={handleFileInputClick}
                    >
                      <div className="dropzone-content">
                        <Upload size={32} className="dropzone-icon" />
                        <p className="dropzone-text">
                          Drag and drop your image here
                        </p>
                        <p className="dropzone-subtext">
                          or click to browse from your computer
                        </p>
                        <p className="dropzone-hint">
                          PNG, JPG, or WebP • Max 5MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="image-preview-container">
                      <img
                        src={imagePreviewUrl || ""}
                        alt="Preview"
                        className="image-preview"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="remove-image-btn"
                        title="Remove image"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  )}

                  {uploadError && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {uploadError}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Colors Section */}
            <div className="form-section-group">
              <h3 className="form-section-title">Available Colors</h3>

              <div className="form-group">
                <label className="form-label">Add Color</label>
                <div className="color-input-group">
                  <input
                    type="text"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    placeholder="e.g., Red, Blue, Black"
                    className="form-input"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddColor();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddColor}
                    className="btn-add-color"
                  >
                    Add
                  </button>
                </div>

                {formData.colors.length > 0 && (
                  <div className="colors-list">
                    {formData.colors.map((color) => (
                      <div key={color} className="color-item">
                        <span>{color}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveColor(color)}
                          className="color-remove-btn"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="product-form-actions">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary"
              >
                {isLoading ? "Creating Product..." : "Create Product"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductFormModal;
