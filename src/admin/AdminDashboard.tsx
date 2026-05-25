import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { listenProducts, listenOrders, updateProduct, deleteProduct, listenCategories, addCategoryIfNotExists } from "../services/firestoreService";
import { supabase } from "../../scripts/supabaseClient";
import { Product, Order, OrderStatus } from "../types";
import "./AdminDashboard.css";
import UserManagement from "./UserManagement";
import OrderManagement from "./OrderManagement";
import SalesReports from "./SalesReports";
import { BarChart3, Home, Package, ShoppingCart, Users as UsersIcon, LayoutDashboard, ShieldCheck, Plus, Edit, Trash2, Upload, LogOut } from "lucide-react";
import { auth } from "../services/firebase";

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  const goHome = () => {
    try {
      navigate('/');
    } catch (e) {
      try { window.location.href = '/'; } catch { }
    }
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState<string>("");
  const filteredProducts = React.useMemo(() => {
    const normalizedSearch = productSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return products;
    }
    return products.filter((product) =>
      [product.name, product.category, product.subcategory, product.description]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [products, productSearchTerm]);
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
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addProductStep, setAddProductStep] = useState<1 | 2 | 3>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newColorInput, setNewColorInput] = useState<string>("");
  const [editColorInput, setEditColorInput] = useState<string>("");
  const [colorInputError, setColorInputError] = useState<string | null>(null);
  const [editColorInputError, setEditColorInputError] = useState<string | null>(null);
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
    if (imageMode !== 'upload' || !imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    console.log('Creating preview for file:', imageFile.name);
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageMode, imageFile]);

  useEffect(() => {
    const unsubCategories = listenCategories((cats) => setCategories(cats.map(c => c.name)));
    return () => {
      unsubCategories && unsubCategories();
    };
  }, []);

  const parseOrderTimestamp = (order: Order): number | null => {
    const raw = order.paidAt || order.date || '';
    const parsed = Date.parse(String(raw));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const dashboardMetrics = React.useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Array.from({ length: 7 }, (_, idx) => {
      const current = new Date(start);
      current.setDate(start.getDate() - (6 - idx));
      return current;
    });

    const trend = days.map((day) => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const dayRevenue = orders.reduce((sum, order) => {
        const ts = parseOrderTimestamp(order);
        if (!ts) return sum;
        if (ts >= dayStart.getTime() && ts <= dayEnd.getTime()) {
          return sum + (Number(order.total) || 0);
        }
        return sum;
      }, 0);
      return {
        label: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: dayRevenue,
      };
    });

    const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const paidRevenue = orders.reduce((sum, order) => {
      const isPaid = order.paymentStatus === 'PAID' || order.status === OrderStatus.DELIVERED;
      return sum + (isPaid ? (Number(order.total) || 0) : 0);
    }, 0);
    const pendingReturns = orders.filter((order) => order.returnRequest?.status === 'Requested').length;
    const activeOrders = orders.filter((order) => order.status !== OrderStatus.CANCELLED).length;

    return {
      totalOrders: orders.length,
      activeOrders,
      totalRevenue,
      paidRevenue,
      pendingReturns,
      trend,
    };
  }, [orders]);

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
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const { width, height } = bitmap as any;
    const scale = Math.min(maxEdge / width, maxEdge / height, 1);
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.drawImage(bitmap as any, 0, 0, canvas.width, canvas.height);

    let quality = qualityStart;
    let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) {
      throw new Error('Failed to compress image');
    }
    while (blob.size > targetMaxBytes && quality > 0.1) {
      quality -= 0.1;
      const nextBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (!nextBlob) {
        throw new Error('Failed to compress image');
      }
      blob = nextBlob;
    }
    return blob;
  };

  // Upload image to Supabase Storage with improved error handling
  const uploadProductImage = async (file: File): Promise<string> => {
    try {
      if (!file) {
        throw new Error('No file selected');
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        throw new Error(`Invalid file type. Allowed types: ${validTypes.join(', ')}`);
      }

      const maxSizeMB = 5;
      if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
      }

      console.log('Starting image upload...', { fileName: file.name, fileSize: file.size, fileType: file.type });

      const compressedBlob = await downscaleImage(file);
      console.log('Image compressed:', { compressedSize: compressedBlob.size });

      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_').replace(/_+/g, '_');
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}.jpg`;
      const filePath = `products/${fileName}`;

      setUploadProgress(0);
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, compressedBlob, {
          contentType: 'image/jpeg',
        });

      if (error || !data) {
        throw error || new Error('Supabase upload failed');
      }

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error('Failed to get public image URL');
      }

      setUploadProgress(100);
      setUploadError(null);
      console.log('Upload successful:', { publicUrl: publicUrlData.publicUrl });
      return publicUrlData.publicUrl;
    } catch (error: any) {
      let message = error?.message || 'Failed to process upload.';
      if (message.includes('ERR_FAILED') || message.includes('NetworkError') || message.includes('CORS')) {
        message = 'Upload blocked by browser network policy. Check your Supabase storage bucket and public URL settings.';
      }
      setUploadProgress(null);
      setUploadError(message);
      throw error;
    }
  };

  // Dropzone and file handlers for Add Product image upload
  const handleFileInputChange = (file?: File | null) => {
    if (!file) return;
    console.log('File selected:', { name: file.name, size: file.size, type: file.type });
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      console.warn('Invalid file type:', file.type);
      setUploadError('Invalid file type. Allowed: PNG, JPG, WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      console.warn('File too large:', file.size);
      setUploadError('File too large. Max 5MB');
      return;
    }
    console.log('File validation passed, setting state');
    setUploadError(null);
    setImageFile(file);
    setImageFileName(file.name);
    setImageMode('upload');
  };

  const handleFileInputClick = () => {
    console.log('File input clicked');
    fileInputRef.current?.click();
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    setImageFileName("");
    setImagePreviewUrl(null);
    setUploadProgress(null);
    setUploadError(null);
    resetFileInput();
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

    const productName = newProduct.name.trim();
    const productCategory = newProduct.category.trim();
    const productSubcategory = newProduct.subcategory.trim();
    const productDescription = newProduct.description.trim();
    const productPrice = Number(newProduct.price);
    const productStock = Number(newProduct.stock);
    const productPromotionPercent = Number(newProduct.promotionPercent);
    const productIsFeatured = Boolean(newProduct.isNewArrival);

    if (!productName) {
      setFormErrors(prev => ({ ...prev, name: "Product name is required" }));
      return;
    }
    if (Number.isNaN(productPrice) || productPrice <= 0) {
      setFormErrors(prev => ({ ...prev, price: "Price must be a valid number greater than 0" }));
      return;
    }
    if (Number.isNaN(productStock) || productStock < 0) {
      setFormErrors(prev => ({ ...prev, stock: "Stock must be a valid non-negative number" }));
      return;
    }
    if (!productCategory) {
      setFormErrors(prev => ({ ...prev, category: "Category is required" }));
      return;
    }
    if (!productSubcategory) {
      setFormErrors(prev => ({ ...prev, subcategory: "Subcategory is required" }));
      return;
    }
    if (!productDescription) {
      setFormErrors(prev => ({ ...prev, description: "Description is required" }));
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
        imageUrl = await uploadProductImage(imageFile);
      }

      if (!imageUrl) {
        throw new Error('Image URL could not be generated. Please try again.');
      }

      type SupabaseProductRow = {
        id: number;
        name: string;
        price: number;
        stock: number;
        category: string;
        subcategory: string;
        promotion_percent: number;
        is_featured: boolean;
        description: string;
        image_url: string;
        created_at: string;
      };

      const payload: Omit<SupabaseProductRow, 'id' | 'created_at'> & { created_at: string } = {
        name: productName,
        price: productPrice,
        stock: productStock,
        category: productCategory,
        subcategory: productSubcategory,
        promotion_percent: Math.round(productPromotionPercent),
        is_featured: productIsFeatured,
        description: productDescription,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      };

      const response = await supabase
      .from('products') // Automatically infers the correct row type
      .insert(payload)
      .select();

      if (response.error) {
        throw response.error;
      }

      const data = response.data as SupabaseProductRow[] | null;
      if (!data || data.length === 0) {
        throw new Error('No product was inserted.');
      }

      const insertedRow = data[0];
      const insertedProduct: Product = {
        id: String(insertedRow.id ?? Date.now()),
        name: insertedRow.name,
        price: Number(insertedRow.price),
        promotionPercent: Number(insertedRow.promotion_percent) || 0,
        category: insertedRow.category,
        subcategory: insertedRow.subcategory,
        image: insertedRow.image_url,
        description: insertedRow.description,
        stock: Number(insertedRow.stock),
        rating: 0,
        isNewArrival: productIsFeatured,
        colors: [],
      };

      setProducts((prev) => [...prev, insertedProduct]);
      await addCategoryIfNotExists(productCategory);

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
    } catch (error: any) {
      console.error("Error creating product:", error);
      let message = error?.message || "Failed to create product. Please try again.";
      if (message.includes('row-level security')) {
        message = 'Insert blocked by Supabase row-level security. Add an insert policy for the products table or use a server-side insert path.';
      }
      setUploadError(message);
      setToast({ message, type: "error" });
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
        imageUrl = await uploadProductImage(imageFile);
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
    } catch (error: any) {
      console.error("Error updating product:", error);
      const message = error?.message || "Failed to update product. Please try again.";
      setUploadError(message);
      setToast({ message, type: "error" });
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

  const isValidHexColor = (value: string) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value.trim());

  const updateColorSelection = (color: string, target: 'new' | 'edit') => {
    const normalizedColor = color.trim();
    if (!isValidHexColor(normalizedColor)) {
      if (target === 'new') setColorInputError('Enter a valid hex code like #FF0000');
      else setEditColorInputError('Enter a valid hex code like #FF0000');
      return;
    }

    const currentColors = target === 'new' ? newProduct.colors || [] : editTarget?.colors || [];
    if (currentColors.includes(normalizedColor)) {
      if (target === 'new') setColorInputError('This color is already selected');
      else setEditColorInputError('This color is already selected');
      return;
    }

    if (currentColors.length >= 3) {
      if (target === 'new') setColorInputError('You can choose up to 3 colors');
      else setEditColorInputError('You can choose up to 3 colors');
      return;
    }

    if (target === 'new') {
      setNewProduct(prev => ({ ...prev, colors: [...(prev.colors || []), normalizedColor] }));
      setNewColorInput('');
      setColorInputError(null);
    } else if (editTarget) {
      setEditTarget(prev => prev ? { ...prev, colors: [...(prev.colors || []), normalizedColor] } : null);
      setEditColorInput('');
      setEditColorInputError(null);
    }
  };

  const removeColor = (color: string, target: 'new' | 'edit') => {
    if (target === 'new') {
      setNewProduct(prev => ({ ...prev, colors: (prev.colors || []).filter(c => c !== color) }));
    } else if (editTarget) {
      setEditTarget(prev => prev ? { ...prev, colors: (prev.colors || []).filter(c => c !== color) } : null);
    }
  };

  const toggleColor = (color: string, target: 'new' | 'edit') => {
    const currentColors = target === 'new' ? newProduct.colors || [] : editTarget?.colors || [];
    if (currentColors.includes(color)) {
      removeColor(color, target);
      return;
    }
    updateColorSelection(color, target);
  };

  return (
    <div className="admin-dashboard-root light">
      <aside className="admin-sidebar light">
        <div className="brand">
          <span className="brand-icon" aria-hidden="true"><ShieldCheck size={18} /></span>
          <button type="button" onClick={goHome} className="brand-name brand-button" style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
            TinhMe Dashboard
          </button>
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
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors font-medium"
              title="Logout"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {activeView === "dashboard" && (
          <div className="overview-grid">
            <div className="card">
              <div className="metric">
                <span className="metric-icon"><ShoppingCart size={24} /></span>
                <div>
                  <div className="metric-label">Total Orders</div>
                  <div className="metric-value">{dashboardMetrics.totalOrders}</div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="metric">
                <span className="metric-icon"><UsersIcon size={24} /></span>
                <div>
                  <div className="metric-label">Active Orders</div>
                  <div className="metric-value">{dashboardMetrics.activeOrders}</div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="metric">
                <span className="metric-icon"><Home size={24} /></span>
                <div>
                  <div className="metric-label">Revenue</div>
                  <div className="metric-value">${dashboardMetrics.totalRevenue.toFixed(2)}</div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="metric">
                <span className="metric-icon"><Package size={24} /></span>
                <div>
                  <div className="metric-label">Pending Returns</div>
                  <div className="metric-value">{dashboardMetrics.pendingReturns}</div>
                </div>
              </div>
            </div>
            <div className="card" style={{ gridColumn: 'span 2' }}>
              <div className="card-title">Revenue Trend (last 7 days)</div>
              {dashboardMetrics.trend.every((point) => point.revenue === 0) ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>No revenue data for the last 7 days.</div>
              ) : (
                <div className="bar-chart">
                  {dashboardMetrics.trend.map((point) => {
                    const max = Math.max(...dashboardMetrics.trend.map((item) => item.revenue), 1);
                    const height = Math.round((point.revenue / max) * 100);
                    return (
                      <div key={point.label} className="bar">
                        <div className="bar-fill" style={{ height: `${height}%` }} title={`$${point.revenue.toFixed(2)}`} />
                        <div className="bar-label">{point.label}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        {activeView === "products" && (
          <section className="products-section">
            <div className="section-header">
              <div>
                <h2 className="section-title">Manage Products</h2>
                <p className="section-subtitle">Search and manage inventory with filters and quick actions.</p>
              </div>
              <div className="section-header-actions">
                <input
                  type="search"
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  placeholder="Search products by name, category or subcategory"
                  className="search-input"
                />
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
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-state">No products match your search.</td>
                    </tr>
                  ) : filteredProducts.map((product) => (
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

                    <div className="form-section">
                      <div className="form-section-title">Category selection</div>
                      <div className="selected-tags">
                        <span className="tag">
                          <strong>Category:</strong> {newProduct.category || 'Not selected'}
                        </span>
                        <span className="tag">
                          <strong>Subcategory:</strong> {newProduct.subcategory || 'Not selected'}
                        </span>
                      </div>
                      <p className="section-note">If you need to change the category, use the back button at the top.</p>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Colors</label>
                      <div className="selected-colors-row">
                        <div className="color-chip-list">
                          {newProduct.colors?.length ? newProduct.colors.map((color) => (
                            <div key={color} className="color-chip">
                              <span className="color-chip-swatch" style={{ backgroundColor: color }} />
                              <span>{color}</span>
                              <button type="button" className="color-chip-remove" onClick={() => removeColor(color, 'new')} aria-label={`Remove ${color}`}>
                                ×
                              </button>
                            </div>
                          )) : (
                            <span className="section-note">Select or add colors.</span>
                          )}
                        </div>
                      </div>
                      <div className="color-selection">
                        {['#000000', '#FFFFFF', '#FF0000','#00FFFF',].map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`color-option ${newProduct.colors?.includes(color) ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => toggleColor(color, 'new')}
                          />
                        ))}
                      </div>
                      <div className="color-input-row">
                        <input
                          type="text"
                          className="input color-code-input"
                          value={newColorInput}
                          onChange={(e) => {
                            setNewColorInput(e.target.value);
                            setColorInputError(null);
                          }}
                          placeholder="#FF0000"
                          maxLength={7}
                        />
                        <button type="button" className="button button-secondary add-color-button" onClick={() => updateColorSelection(newColorInput, 'new')}>
                          Add color
                        </button>
                      </div>
                      {colorInputError && <span className="field-error">{colorInputError}</span>}
                      <p className="section-note">Enter a color code or click one of the swatches.</p>
                    </div>

                    <div className="form-row form-row--spaced">
                      <div className="form-group">
                        <label className="form-label">Promotion %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="input"
                          value={newProduct.promotionPercent}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, promotionPercent: parseFloat(e.target.value) || 0 }))}
                          placeholder="0"
                        />
                        <p className="section-note">Leave as 0 if there is no discount.</p>
                      </div>

                      <div className="form-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={newProduct.isNewArrival}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, isNewArrival: e.target.checked }))}
                          />
                          Feature on New Arrivals
                        </label>
                        <p className="section-note">This product will appear in the New Arrivals section of the shop.</p>
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
                      <label className="form-label">Product Images *</label>

                      <div className="image-input-options">
                        <label>
                          <input type="radio" name="imageMode" checked={imageMode === 'url'} onChange={() => setImageMode('url')} />
                          <span className="ml-2">Use URL</span>
                        </label>
                        <label>
                          <input type="radio" name="imageMode" checked={imageMode === 'upload'} onChange={() => setImageMode('upload')} />
                          <span className="ml-2">Upload</span>
                        </label>
                      </div>

                      {imageMode === 'upload' ? (
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileInputChange(f); }}
                            style={{ display: 'none' }}
                          />
                          <div
                            className="dropzone"
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onClick={handleFileInputClick}
                            style={{ cursor: 'pointer' }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleFileInputClick(); }}
                          >
                            <div className="dropzone-inner">
                              <div className="upload-icon" style={{ fontSize: 30, color: '#667eea' }}>⬆</div>
                              <div className="upload-title" style={{ fontWeight: 700, color: '#111827' }}>Click to upload or drag and drop</div>
                              <div className="upload-sub" style={{ color: '#6b7280', marginTop: 6 }}>PNG, JPG, WebP up to 5MB</div>
                            </div>
                          </div>

                          {uploadError && <div className="upload-error-banner">{uploadError}</div>}

                          {imageFile && imagePreviewUrl && (
                            <div className="mt-4 grid grid-cols-4 gap-3">
                              <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                                <img src={imagePreviewUrl} alt="preview" className="w-full h-full object-cover" />
                                <button type="button" onClick={handleRemoveImage} className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-sm">✕</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="image-input-container">
                          <input
                            type="url"
                            className="input"
                            value={newProduct.image}
                            onChange={(e) =>
                              setNewProduct((prev) => ({ ...prev, image: e.target.value }))
                            }
                            placeholder="https://example.com/image.jpg"
                          />

                          {/* Show preview only if a URL is entered */}
                          {newProduct.image && (
                            <div className="image-preview-container">
                              <img
                                src={newProduct.image}
                                alt="Image preview"
                                className="image-preview"
                                // Optional: handle broken links
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {formErrors.image && (
                        <span className="field-error">{formErrors.image}</span>
                      )}
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
                  <div className="selected-colors-row">
                    <div className="color-chip-list">
                      {editTarget?.colors?.length ? editTarget.colors.map((color) => (
                        <div key={color} className="color-chip">
                          <span className="color-chip-swatch" style={{ backgroundColor: color }} />
                          <span>{color}</span>
                          <button type="button" className="color-chip-remove" onClick={() => removeColor(color, 'edit')} aria-label={`Remove ${color}`}>
                            ×
                          </button>
                        </div>
                      )) : (
                        <span className="section-note">Select or add up to 3 colors.</span>
                      )}
                    </div>
                  </div>
                  <div className="color-selection">
                    {['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`color-option ${editTarget?.colors?.includes(color) ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => editTarget && toggleColor(color, 'edit')}
                      />
                    ))}
                  </div>
                  <div className="color-input-row">
                    <input
                      type="text"
                      className="input color-code-input"
                      value={editColorInput}
                      onChange={(e) => {
                        setEditColorInput(e.target.value);
                        setEditColorInputError(null);
                      }}
                      placeholder="#FF0000"
                      maxLength={7}
                    />
                    <button type="button" className="button button-secondary add-color-button" onClick={() => updateColorSelection(editColorInput, 'edit')}>
                      Add color
                    </button>
                  </div>
                  {editColorInputError && <span className="field-error">{editColorInputError}</span>}
                  <p className="section-note">Enter a color code or click one of the swatches. Maximum 3 colors.</p>
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
                    <>
                      <div className="file-upload">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setEditImageMode('upload');
                            setImageFile(file);
                            setImageFileName(file?.name || "");
                            setUploadError(null);
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
                      {uploadError && <div className="upload-error-banner">{uploadError}</div>}
                    </>
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
