import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listenProducts, listenOrders, createProduct, updateProduct, deleteProduct, listenCategories, addCategoryIfNotExists } from "../services/firestoreService";
import { firebaseApp } from "../services/firebase";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Product, Order } from "../types";
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
    image: "",
    description: "",
    stock: 0,
    rating: 0,
    isNewArrival: false,
    colors: [],
  });
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [categories, setCategories] = useState<string[]>(["Men", "Women", "Shoes", "Bags", "Accessory"]);
  const [formErrors, setFormErrors] = useState<{ name?: string; price?: string; stock?: string; category?: string; image?: string }>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

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
    const storageRef = ref(storage, `products/${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, compressedBlob);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        reject,
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
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
        image: "",
        description: "",
        stock: 0,
        rating: 0,
        isNewArrival: false,
        colors: [],
      });
      setImageFile(null);
      setUploadProgress(null);
      setShowAddModal(false);
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

    setSaving(true);
    try {
      await updateProduct(editTarget.id, updatedProduct);
      await addCategoryIfNotExists(updatedProduct.category);
      setShowEditModal(false);
      setEditTarget(null);
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

  // Handle delete product
  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;

    try {
      await deleteProduct(deleteTarget.id);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      setToast({ message: "Product deleted successfully!", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Error deleting product:", error);
      setToast({ message: "Failed to delete product. Please try again.", type: "error" });
      setTimeout(() => setToast(null), 3000);
    }
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
            className="secondary-btn"
            onClick={goHome}
          >
            <Home size={16} aria-hidden="true" />
            Back Home
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
          </div>
        )}

        {activeView === "products" && (
          <section className="products-section">
            <div className="section-header">
              <h2 className="section-title">Products</h2>
              <button
                className="primary-btn"
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={16} />
                Add Product
              </button>
            </div>

            <div className="products-grid">
              {products.map((product) => (
                <div key={product.id} className="product-card">
                  <div className="product-image">
                    <img src={product.image} alt={product.name} />
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-category">{product.category}</p>
                    <div className="product-price">
                      <span className="current-price">${product.price}</span>
                      {(product.promotionPercent || 0) > 0 && (
                        <span className="original-price">
                          ${(product.price / (1 - (product.promotionPercent || 0) / 100)).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="product-stock">Stock: {product.stock}</div>
                  </div>
                  <div className="product-actions">
                    <button
                      className="action-btn edit-btn"
                      onClick={() => {
                        setEditTarget(product);
                        setShowEditModal(true);
                      }}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={() => {
                        setDeleteTarget(product);
                        setShowDeleteModal(true);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
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
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add New Product</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateProduct(); }}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                {formErrors.name && <span className="error">{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label>Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
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
                  value={newProduct.promotionPercent}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, promotionPercent: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="form-group">
                <label>Stock *</label>
                <input
                  type="number"
                  min="0"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                  required
                />
                {formErrors.stock && <span className="error">{formErrors.stock}</span>}
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {formErrors.category && <span className="error">{formErrors.category}</span>}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
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
                      checked={imageMode === 'url'}
                      onChange={(e) => setImageMode(e.target.value as 'url' | 'upload')}
                    />
                    Image URL
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="upload"
                      checked={imageMode === 'upload'}
                      onChange={(e) => setImageMode(e.target.value as 'url' | 'upload')}
                    />
                    Upload File
                  </label>
                </div>

                {imageMode === 'url' ? (
                  <input
                    type="url"
                    value={newProduct.image}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                  />
                ) : (
                  <div className="file-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    />
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
                    checked={newProduct.isNewArrival}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, isNewArrival: e.target.checked }))}
                  />
                  Mark as New Arrival
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? "Creating..." : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Product</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateProduct(); }}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
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
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {formErrors.category && <span className="error">{formErrors.category}</span>}
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
                <label>Image URL</label>
                <input
                  type="url"
                  value={editTarget.image}
                  onChange={(e) => setEditTarget(prev => prev ? { ...prev, image: e.target.value } : null)}
                  placeholder="https://example.com/image.jpg"
                />
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

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? "Updating..." : "Update Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <h3>Delete Product</h3>
            <p>Are you sure you want to delete "{deleteTarget.name}"? This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-btn"
                onClick={handleDeleteProduct}
              >
                Delete Product
              </button>
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
