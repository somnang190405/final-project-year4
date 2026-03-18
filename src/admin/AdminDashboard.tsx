import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listenProducts, listenOrders, createProduct, updateProduct, deleteProduct, listenCategories, addCategoryIfNotExists } from "../services/firestoreService";
import { firebaseApp } from "../services/firebase";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Product, Order, OrderStatus } from "../types";
import "./AdminDashboard.css";
import UserManagement from "./UserManagement";
import OrderManagement from "./OrderManagement";
import SalesReports from "./SalesReports";
import { BarChart3, Home, Package, ShoppingCart, Users as UsersIcon, LayoutDashboard, ShieldCheck, Plus, Edit, Trash2, Upload } from "lucide-react";

const AdminDashboard: React.FC = () => {
  const storage = React.useMemo(() => getStorage(firebaseApp), []);
  const navigate = useNavigate();
  const goHome = () => {
    try {
      navigate('/');
    } catch (e) {
      try { window.location.href = '/'; } catch {}
    }
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeView, setActiveView] = useState<"dashboard" | "products" | "orders" | "users" | "sales">("dashboard");

  // Product management state
  const [newProduct, setNewProduct] = useState<Omit<Product, "id">>({
    name: "",
    price: 0,
    promotionPercent: 0,
    category: "",
    subcategory: "",
    image: "",
    description: "",
    stock: 0,
    rating: 0,
    isNewArrival: false,
    colors: [],
  });
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageFileName, setImageFileName] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addProductStep, setAddProductStep] = useState<1 | 2 | 3>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [categories, setCategories] = useState<string[]>(["Men", "Women", "Shoes", "Bags", "Accessory"]);
  const [formErrors, setFormErrors] = useState<{ name?: string; price?: string; stock?: string; category?: string; subcategory?: string; image?: string }>({});
  const [editImageMode, setEditImageMode] = useState<'url' | 'upload'>('url');

  // Define main categories and their subcategories (updated to match user requirements)
  const mainCategories = ["Men", "Women", "Boys", "Girls"];
  const subcategories: { [key: string]: string[] } = {
    Men: [
      "T-Shirts", "Shirts", "Hoodies & Jackets", "Jeans", "Trousers", "Shorts",
      "Sneakers", "Sandals", "Formal Shoes", "Bags", "Caps & Hats", "Belts", "Socks"
    ],
    Women: [
      "Tops", "Dresses", "Hoodies & Jackets", "Jeans", "Skirts", "Shorts",
      "Heels", "Flats", "Sneakers", "Sandals", "Bags", "Jewelry", "Hats", "Sunglasses"
    ],
    Boys: [
      "T-Shirts", "Shirts", "Jackets", "Jeans", "Shorts", "Sneakers", "Sandals",
      "Caps", "Backpacks", "Socks"
    ],
    Girls: [
      "Dresses", "Tops", "Jackets", "Jeans", "Skirts", "Flats", "Sneakers",
      "Sandals", "Bags", "Hair Accessories", "Hats"
    ],
  };

  useEffect(() => {
    const unsubProducts = listenProducts(setProducts);
    const unsubOrders = listenOrders(setOrders);
    return () => {
      unsubProducts && unsubProducts();
      unsubOrders && unsubOrders();
    };
  }, []);

  useEffect(() => {
    const unsubCategories = listenCategories((cats) => setCategories(cats.map(c => c.name)));
    return () => {
      unsubCategories && unsubCategories();
    };
  }, []);

  // Image compression function
  const downscaleImage = async (
    file: File,
    maxEdge = 1280,
    targetMaxBytes = 15000000,
    qualityStart = 0.82
  ): Promise<Blob> => {
    const createBitmap = (f: File) => (window as any).createImageBitmap ? (createImageBitmap as any)(f) : Promise.reject('no-bitmap');
    const bitmap = await createBitmap(file).catch(async () => {
      const url = URL.createObjectURL(file);
      return new Promise<ImageBitmap>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height } as any);
        img.onerror = reject;
        img.src = url;
      });
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const { width, height } = bitmap;
    const scale = Math.min(maxEdge / width, maxEdge / height, 1);
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.drawImage(bitmap as any, 0, 0, canvas.width, canvas.height);

    let quality = qualityStart;
    let blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality));
    while (blob.size > targetMaxBytes && quality > 0.1) {
      quality -= 0.1;
      blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality));
    }
    return blob;
  };

  // Upload image to Firebase Storage
  const uploadToStorage = async (file: File): Promise<string> => {
    const compressedBlob = await downscaleImage(file);
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;
    const storageRef = ref(storage, `products/${uniqueName}`);
    const uploadTask = uploadBytesResumable(storageRef, compressedBlob, {
      contentType: file.type || 'image/jpeg',
      cacheControl: 'public, max-age=31536000',
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Image upload failed:', error);
          setUploadProgress(null);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  // Handle delete product
  const handleDeleteProduct = async (product: Product) => {
    try {
      await deleteProduct(product.id);
      setToast({ message: "Product deleted successfully!", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Error deleting product:", error);
      setToast({ message: "Failed to delete product. Please try again.", type: "error" });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Handle create product
  const handleCreateProduct = async () => {
    setFormErrors({});
    if (!newProduct.name.trim()) {
      setFormErrors(prev => ({ ...prev, name: "Product name is required" }));
      return;
    }
    if (newProduct.price <= 0) {
      setFormErrors(prev => ({ ...prev, price: "Price must be greater than 0" }));
      return;
    }
    if (newProduct.stock < 0) {
      setFormErrors(prev => ({ ...prev, stock: "Stock cannot be negative" }));
      return;
    }
    if (!newProduct.category) {
      setFormErrors(prev => ({ ...prev, category: "Category is required" }));
      return;
    }
    if (!newProduct.subcategory) {
      setFormErrors(prev => ({ ...prev, subcategory: "Subcategory is required" }));
      return;
    }
    if (!newProduct.image && !imageFile) {
      setFormErrors(prev => ({ ...prev, image: "Image is required" }));
      return;
    }

    setSaving(true);
    try {
      let imageUrl = newProduct.image;
      if (imageMode === 'upload' && imageFile) {
        imageUrl = await uploadToStorage(imageFile);
      }

      await createProduct({
        ...newProduct,
        image: imageUrl,
      });

      // Add category if it doesn't exist
      await addCategoryIfNotExists(newProduct.category);

      setNewProduct({
        name: "",
        price: 0,
        promotionPercent: 0,
        category: "",
        subcategory: "",
        image: "",
        description: "",
        stock: 0,
        rating: 0,
        isNewArrival: false,
        colors: [],
      });
      setImageFile(null);
      setImageFileName("");
      setUploadProgress(null);
      setShowAddModal(false);
      setAddProductStep(1);
      setSelectedCategory("");
      setSelectedSubcategory("");
      setToast({ message: "Product created successfully!", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Error creating product:", error);
      setToast({ message: "Failed to create product. Please try again.", type: "error" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Handle update product
  const handleUpdateProduct = async () => {
    if (!editTarget) return;

    setFormErrors({});
    const updatedProduct = { ...editTarget };
    if (!updatedProduct.name.trim()) {
      setFormErrors(prev => ({ ...prev, name: "Product name is required" }));
      return;
    }
    if (updatedProduct.price <= 0) {
      setFormErrors(prev => ({ ...prev, price: "Price must be greater than 0" }));
      return;
    }
    if (updatedProduct.stock < 0) {
      setFormErrors(prev => ({ ...prev, stock: "Stock cannot be negative" }));
      return;
    }
    if (!updatedProduct.category) {
      setFormErrors(prev => ({ ...prev, category: "Category is required" }));
      return;
    }
    if (!updatedProduct.subcategory) {
      setFormErrors(prev => ({ ...prev, subcategory: "Subcategory is required" }));
      return;
    }
    if (!updatedProduct.image && !imageFile) {
      setFormErrors(prev => ({ ...prev, image: "Image is required" }));
      return;
    }

    setSaving(true);
    try {
      let imageUrl = updatedProduct.image;
      if (editImageMode === 'upload' && imageFile) {
        imageUrl = await uploadToStorage(imageFile);
      }

      await updateProduct(editTarget.id, {
        ...updatedProduct,
        image: imageUrl,
      });
      await addCategoryIfNotExists(updatedProduct.category);
      setShowEditModal(false);
      setEditTarget(null);
      setImageFile(null);
      setImageFileName("");
      setUploadProgress(null);
      setImageFile(null);
      setImageFileName("");
      setUploadProgress(null);
      setToast({ message: "Product updated successfully!", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Error updating product:", error);
      setToast({ message: "Failed to update product. Please try again.", type: "error" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Handle category selection for add product
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setNewProduct(prev => ({ ...prev, category }));
    setAddProductStep(2);
  };

  // Handle subcategory selection
  const handleSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setNewProduct(prev => ({ ...prev, subcategory }));
    setAddProductStep(3);
  };

  // Handle back to category selection
  const handleBackToCategory = () => {
    setAddProductStep(1);
    setSelectedCategory("");
    setSelectedSubcategory("");
    setNewProduct(prev => ({ ...prev, category: "", subcategory: "" }));
  };

  // Handle back to subcategory selection
  const handleBackToSubcategory = () => {
    setAddProductStep(2);
    setSelectedSubcategory("");
    setNewProduct(prev => ({ ...prev, subcategory: "" }));
  };

  return (
    <div className="admin-dashboard-root light">
      <aside className="admin-sidebar light">
        <div className="brand">
          <span className="brand-icon" aria-hidden="true"><ShieldCheck size={18} /></span>
          <span className="brand-name">TinhMe Dashboard</span>
        </div>
        <nav className="side-nav">
          <button className={`nav-item ${activeView === "dashboard" ? "active" : ""}`} onClick={() => setActiveView("dashboard")}>
            <span className="nav-icon" aria-hidden="true"><LayoutDashboard size={18} /></span>
            <span>Dashboard</span>
          </button>
          <button className={`nav-item ${activeView === "products" ? "active" : ""}`} onClick={() => setActiveView("products")}>
            <span className="nav-icon" aria-hidden="true"><Package size={18} /></span>
            <span>Products</span>
          </button>
          <button className={`nav-item ${activeView === "orders" ? "active" : ""}`} onClick={() => setActiveView("orders")}>
            <span className="nav-icon" aria-hidden="true"><ShoppingCart size={18} /></span>
            <span>Orders</span>
          </button>
          <button className={`nav-item ${activeView === "users" ? "active" : ""}`} onClick={() => setActiveView("users")}>
            <span className="nav-icon" aria-hidden="true"><UsersIcon size={18} /></span>
            <span>Users</span>
          </button>
          <button className={`nav-item ${activeView === "sales" ? "active" : ""}`} onClick={() => setActiveView("sales")}>
            <span className="nav-icon" aria-hidden="true"><BarChart3 size={18} /></span>
            <span>Reports</span>
          </button>
        </nav>
      </aside>
      <main className="admin-main light">
        <header className="topbar">
          <h1 className="page-title">
            {activeView === "dashboard" && "Overview"}
            {activeView === "products" && "Products"}
            {activeView === "orders" && "Order Management"}
            {activeView === "users" && "User Management"}
            {activeView === "sales" && "Sales Reports"}
          </h1>
          <button
            type="button"
            className="secondary-btn back-home-btn"
            onClick={goHome}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontWeight: 500 }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}><Home size={18} aria-hidden="true" /></span>
            <span>Back Home</span>
          </button>
        </header>

        {activeView === "dashboard" && (
          <div className="overview-grid">
            <div className="card metric">
              <div className="metric-icon">📦</div>
              <div>
                <div className="metric-label">Total Products</div>
                <div className="metric-value">{products.length}</div>
              </div>
            </div>
            <div className="card metric">
              <div className="metric-icon">🧾</div>
              <div>
                <div className="metric-label">Total Orders</div>
                <div className="metric-value">{orders.length}</div>
              </div>
            </div>
            <div className="card metric">
              <div className="metric-icon">⏳</div>
              <div>
                <div className="metric-label">Pending Orders</div>
                <div className="metric-value">{orders.filter(o => o.status === OrderStatus.PENDING).length}</div>
              </div>
            </div>
            <div className="card metric">
              <div className="metric-icon">💰</div>
              <div>
                <div className="metric-label">Total Revenue</div>
                <div className="metric-value">${orders.reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}

        {activeView === "products" && (
          <section className="products-section">
            <div className="section-header">
              <h2 className="section-title">Product Catalog</h2>
              <div className="section-header-actions">
                <button
                  className="primary-btn add-product-btn"
                  onClick={() => {
                    setAddProductStep(1);
                    setSelectedCategory("");
                    setSelectedSubcategory("");
                    setShowAddModal(true);
                  }}
                >
                  <Plus size={16} />
                  Add Product
                </button>
              </div>
            </div>

            <div className="products-table-container">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Subcategory</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        {product.image ? (
                        <img 
                          src={product.image}
                          alt={product.name}
                          className="table-image"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="table-image flex items-center justify-center bg-gray-100 text-xs text-gray-500">No image</div>
                      )}
                      </td>
                      <td className="product-name-cell">{product.name}</td>
                      <td>{product.category}</td>
                      <td>{product.subcategory}</td>
                      <td>
                        <div className="price-cell">
                          <span className="current-price">${product.price}</span>
                          {(product.promotionPercent || 0) > 0 && (
                            <span className="original-price">
                              ${(product.price / (1 - (product.promotionPercent || 0) / 100)).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`stock-badge ${product.stock > 10 ? 'ok' : product.stock > 0 ? 'warn' : 'danger'}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="actions" style={{ justifyContent: 'center' }}>
                          <button
                            className="icon-btn edit-btn"
                            onClick={() => {
                              setEditTarget(product);
                              setEditImageMode('url');
                              setShowEditModal(true);
                            }}
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="icon-btn delete-btn"
                            onClick={() => handleDeleteProduct(product)}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeView === "orders" && (
          <section>
            <OrderManagement />
          </section>
        )}

        {activeView === "users" && (
          <section>
            <UserManagement />
          </section>
        )}

        {activeView === "sales" && (
          <section>
            <SalesReports />
          </section>
        )}
      </main>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => {
          setShowAddModal(false);
          setImageFile(null);
          setImageFileName("");
          setUploadProgress(null);
          setAddProductStep(1);
          setSelectedCategory("");
          setSelectedSubcategory("");
          setNewProduct(prev => ({ ...prev, category: "", subcategory: "" }));
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {addProductStep === 1 ? "Select Main Category" : 
                 addProductStep === 2 ? "Select Subcategory" : 
                 "Add New Product"}
              </h3>
              {(addProductStep === 2 || addProductStep === 3) && (
                <button
                  className="back-btn"
                  onClick={addProductStep === 2 ? handleBackToCategory : handleBackToSubcategory}
                  type="button"
                >
                  ← Back
                </button>
              )}
            </div>
            <div className="modal-body">
              {addProductStep === 1 ? (
                // Step 1: Main Category Selection
                <div className="category-selection">
                  <p className="step-description">Choose a main category for your new product</p>
                  <div className="category-grid">
                    {mainCategories.map((category) => (
                      <button
                        key={category}
                        className="category-option"
                        onClick={() => handleCategorySelect(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              ) : addProductStep === 2 ? (
                // Step 2: Subcategory Selection
                <div className="category-selection">
                  <p className="step-description">Choose a subcategory for {selectedCategory}</p>
                  <div className="category-grid">
                    {subcategories[selectedCategory].map((subcategory) => (
                      <button
                        key={subcategory}
                        className="category-option"
                        onClick={() => handleSubcategorySelect(subcategory)}
                      >
                        {subcategory}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                // Step 3: Product Form
                <form onSubmit={(e) => { e.preventDefault(); handleCreateProduct(); }}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Name *</label>
                      <input
                        type="text"
                        className="input"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                      {formErrors.name && <span className="field-error">{formErrors.name}</span>}
                    </div>

                    <div className="input-row">
                      <div className="form-group">
                        <label className="form-label">Price *</label>
                        <input
                          type="number"
                          step="0.01"
                          className="input"
                          value={newProduct.price}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          required
                        />
                        {formErrors.price && <span className="field-error">{formErrors.price}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Stock *</label>
                        <input
                          type="number"
                          min="0"
                          className="input"
                          value={newProduct.stock}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                          required
                        />
                        {formErrors.stock && <span className="field-error">{formErrors.stock}</span>}
                      </div>
                    </div>

                    <div className="input-row">
                      <div className="form-group">
                        <label className="form-label">Category</label>
                        <input
                          type="text"
                          className="input"
                          value={newProduct.category}
                          disabled
                          style={{ backgroundColor: '#f9fafb', cursor: 'not-allowed' }}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Subcategory</label>
                        <input
                          type="text"
                          className="input"
                          value={newProduct.subcategory}
                          disabled
                          style={{ backgroundColor: '#f9fafb', cursor: 'not-allowed' }}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Colors</label>
                      <div className="color-selection">
                        {['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'].map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`color-option ${newProduct.colors?.includes(color) ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              const colors = newProduct.colors || [];
                              if (colors.includes(color)) {
                                setNewProduct(prev => ({ ...prev, colors: colors.filter(c => c !== color) }));
                              } else {
                                setNewProduct(prev => ({ ...prev, colors: [...colors, color] }));
                              }
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="input-row">
                      <div className="form-group">
                        <label className="form-label">Promotion %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="input"
                          value={newProduct.promotionPercent}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, promotionPercent: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>

                      <div className="form-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={newProduct.isNewArrival}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, isNewArrival: e.target.checked }))}
                          />
                          New Arrival
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea
                        className="input textarea"
                        value={newProduct.description}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Image *</label>
                      <div className="image-input-options">
                        <label>
                          <input
                            type="radio"
                            value="url"
                            checked={imageMode === 'url'}
                            onChange={(e) => {
                              setImageMode(e.target.value as 'url' | 'upload');
                              if (e.target.value === 'url') {
                                setImageFile(null);
                                setImageFileName("");
                                setUploadProgress(null);
                              }
                            }}
                          />
                          Image URL
                        </label>
                        <label>
                          <input
                            type="radio"
                            value="upload"
                            checked={imageMode === 'upload'}
                            onChange={(e) => {
                              setImageMode(e.target.value as 'url' | 'upload');
                              if (e.target.value === 'upload') {
                                setNewProduct(prev => ({ ...prev, image: "" }));
                              }
                            }}
                          />
                          Upload File
                        </label>
                      </div>

                      {imageMode === 'url' ? (
                        <input
                          type="url"
                          className="input"
                          value={newProduct.image}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, image: e.target.value }))}
                          placeholder="https://example.com/image.jpg"
                        />
                      ) : (
                        <div className="file-upload">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setImageFile(file);
                              setImageFileName(file?.name || "");
                            }}
                          />
                          {imageFileName && <div className="file-name">Selected file: {imageFileName}</div>}
                          {uploadProgress !== null && (
                            <div className="upload-progress">
                              <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                              <span>{Math.round(uploadProgress)}%</span>
                            </div>
                          )}
                        </div>
                      )}
                      {formErrors.image && <span className="field-error">{formErrors.image}</span>}
                    </div>
                  </div>
                </form>
              )}
            </div>
            {addProductStep === 3 && (
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn secondary-btn"
                  onClick={() => {
                    setShowAddModal(false);
                    setImageFile(null);
                    setImageFileName("");
                    setUploadProgress(null);
                    setAddProductStep(1);
                    setSelectedCategory("");
                    setSelectedSubcategory("");
                    setNewProduct(prev => ({ ...prev, category: "", subcategory: "" }));
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={saving}
                  onClick={(e) => {
                    e.preventDefault();
                    handleCreateProduct();
                  }}
                >
                  {saving ? "Creating..." : "Create Product"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editTarget && (
        <div className="modal-overlay" onClick={() => {
          setShowEditModal(false);
          setEditTarget(null);
          setImageFile(null);
          setImageFileName("");
          setUploadProgress(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Product</h3>
              <button className="modal-close" type="button" onClick={() => {
                setShowEditModal(false);
                setEditTarget(null);
                setImageFile(null);
                setImageFileName("");
                setUploadProgress(null);
              }}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleUpdateProduct(); }} className="form-grid">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={editTarget.name}
                    onChange={(e) => setEditTarget(prev => prev ? { ...prev, name: e.target.value } : null)}
                    required
                  />
                {formErrors.name && <span className="error">{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label>Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={editTarget.price}
                  onChange={(e) => setEditTarget(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                  required
                />
                {formErrors.price && <span className="error">{formErrors.price}</span>}
              </div>

              <div className="form-group">
                <label>Promotion %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editTarget.promotionPercent}
                  onChange={(e) => setEditTarget(prev => prev ? { ...prev, promotionPercent: parseFloat(e.target.value) || 0 } : null)}
                />
              </div>

              <div className="form-group">
                <label>Stock *</label>
                <input
                  type="number"
                  min="0"
                  value={editTarget.stock}
                  onChange={(e) => setEditTarget(prev => prev ? { ...prev, stock: parseInt(e.target.value) || 0 } : null)}
                  required
                />
                {formErrors.stock && <span className="error">{formErrors.stock}</span>}
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  value={editTarget.category}
                  onChange={(e) => setEditTarget(prev => prev ? { ...prev, category: e.target.value } : null)}
                  required
                >
                  <option value="">Select category</option>
                  {mainCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {formErrors.category && <span className="error">{formErrors.category}</span>}
              </div>

              <div className="form-group">
                <label>Subcategory *</label>
                <select
                  value={editTarget.subcategory}
                  onChange={(e) => setEditTarget(prev => prev ? { ...prev, subcategory: e.target.value } : null)}
                  required
                >
                  <option value="">Select subcategory</option>
                  {editTarget.category && subcategories[editTarget.category]?.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
                {formErrors.subcategory && <span className="error">{formErrors.subcategory}</span>}
              </div>

              <div className="form-group">
                <label>Colors</label>
                <div className="color-selection">
                  {['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${editTarget.colors?.includes(color) ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setEditTarget(prev => {
                          if (!prev) return null;
                          const colors = prev.colors || [];
                          if (colors.includes(color)) {
                            return { ...prev, colors: colors.filter(c => c !== color) };
                          } else {
                            return { ...prev, colors: [...colors, color] };
                          }
                        });
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editTarget.description}
                  onChange={(e) => setEditTarget(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Image *</label>
                <div className="image-input-options">
                  <label>
                    <input
                      type="radio"
                      value="url"
                      checked={editImageMode === 'url'}
                      onChange={(e) => {
                        setEditImageMode(e.target.value as 'url' | 'upload');
                        if (e.target.value === 'url') {
                          setImageFile(null);
                          setImageFileName("");
                          setUploadProgress(null);
                        }
                      }}
                    />
                    Image URL
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="upload"
                      checked={editImageMode === 'upload'}
                      onChange={(e) => {
                        setEditImageMode(e.target.value as 'url' | 'upload');
                        if (e.target.value === 'upload') {
                          setEditTarget(prev => prev ? { ...prev, image: "" } : prev);
                        }
                      }}
                    />
                    Upload File
                  </label>
                </div>

                {editImageMode === 'url' ? (
                  <input
                    type="url"
                    value={editTarget.image}
                    onChange={(e) => setEditTarget(prev => prev ? { ...prev, image: e.target.value } : null)}
                    placeholder="https://example.com/image.jpg"
                  />
                ) : (
                  <div className="file-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setImageFile(file);
                        setImageFileName(file?.name || "");
                      }}
                    />
                    {imageFileName && <div className="file-name">Selected file: {imageFileName}</div>}
                    {uploadProgress !== null && (
                      <div className="upload-progress">
                        <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                    )}
                  </div>
                )}
                {formErrors.image && <span className="error">{formErrors.image}</span>}
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editTarget.isNewArrival}
                    onChange={(e) => setEditTarget(prev => prev ? { ...prev, isNewArrival: e.target.checked } : null)}
                  />
                  Mark as New Arrival
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => {
                  setShowEditModal(false);
                  setEditTarget(null);
                  setImageFile(null);
                  setImageFileName("");
                  setUploadProgress(null);
                }}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? "Updating..." : "Update Product"}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
