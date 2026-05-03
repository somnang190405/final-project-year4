# CSS & Tailwind Improvements - Ready to Copy

**Drop-in styles for professional UI**

---

## 🎨 Reusable Tailwind Classes

### Buttons - Copy These Classes

#### Primary Button (Black)
```jsx
className="px-6 py-3 bg-black text-white font-semibold rounded-lg 
           hover:bg-gray-900 active:scale-95 
           transition-all duration-200 transform hover:scale-105 
           shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
```

#### Secondary Button (White Border)
```jsx
className="px-6 py-3 bg-white border-2 border-black text-black 
           font-semibold rounded-lg hover:bg-black hover:text-white
           active:scale-95 transition-all duration-200"
```

#### Outline Button (Gray)
```jsx
className="px-6 py-3 border border-gray-300 text-gray-700 
           font-medium rounded-lg hover:bg-gray-50
           transition-all duration-200"
```

#### Danger Button (Red)
```jsx
className="px-6 py-3 bg-red-600 text-white font-semibold 
           rounded-lg hover:bg-red-700 active:scale-95
           transition-all duration-200"
```

#### Success Button (Green)
```jsx
className="px-6 py-3 bg-green-600 text-white font-semibold 
           rounded-lg hover:bg-green-700 active:scale-95
           transition-all duration-200"
```

#### Icon Button (Circular)
```jsx
className="w-10 h-10 rounded-full flex items-center justify-center
           hover:bg-gray-100 transition-colors duration-200
           active:bg-gray-200"
```

---

### Form Inputs - Copy These

#### Text/Email Input
```jsx
className="w-full px-4 py-3 border border-gray-300 rounded-lg
           focus:ring-2 focus:ring-black focus:border-transparent
           transition-all duration-200 text-base"
```

#### Select Dropdown
```jsx
className="w-full px-4 py-3 border border-gray-300 rounded-lg
           focus:ring-2 focus:ring-black focus:border-transparent
           appearance-none cursor-pointer bg-white"
```

#### Textarea
```jsx
className="w-full px-4 py-3 border border-gray-300 rounded-lg
           focus:ring-2 focus:ring-black focus:border-transparent
           resize-vertical min-h-32 font-sans text-base"
```

#### Form Label
```jsx
className="block text-sm font-medium text-gray-700 mb-2"
```

#### Form Group (with label + input)
```jsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Email Address
  </label>
  <input 
    type="email"
    className="w-full px-4 py-3 border border-gray-300 rounded-lg 
               focus:ring-2 focus:ring-black focus:border-transparent"
  />
</div>
```

---

### Cards & Containers

#### Basic Card
```jsx
className="bg-white rounded-xl border border-gray-200 
           shadow-sm hover:shadow-md transition-shadow duration-300
           p-6"
```

#### Elevated Card (Hover Effect)
```jsx
className="bg-white rounded-xl border border-gray-200
           shadow-md hover:shadow-xl transition-all duration-300
           transform hover:-translate-y-1 p-6"
```

#### Gradient Header
```jsx
className="bg-gradient-to-r from-gray-900 to-gray-800 
           text-white px-8 py-8"
```

#### Light Background Section
```jsx
className="bg-gray-50 rounded-xl border border-gray-200 p-6"
```

#### Alert Box - Success
```jsx
className="p-4 bg-green-50 border border-green-200 rounded-lg
           flex items-start gap-3"
```

#### Alert Box - Error
```jsx
className="p-4 bg-red-50 border border-red-200 rounded-lg
           flex items-start gap-3"
```

#### Alert Box - Warning
```jsx
className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg
           flex items-start gap-3"
```

#### Alert Box - Info
```jsx
className="p-4 bg-blue-50 border border-blue-200 rounded-lg
           flex items-start gap-3"
```

---

### Typography & Text

#### Hero Heading (Large)
```jsx
className="text-6xl lg:text-7xl font-bold leading-tight text-gray-900"
```

#### Page Title
```jsx
className="text-4xl font-bold text-gray-900"
```

#### Section Heading
```jsx
className="text-2xl font-bold text-gray-900"
```

#### Card Title
```jsx
className="text-lg font-semibold text-gray-900"
```

#### Body Text
```jsx
className="text-base text-gray-700 leading-relaxed"
```

#### Secondary Text (Gray)
```jsx
className="text-sm text-gray-600"
```

#### Muted/Disabled Text
```jsx
className="text-sm text-gray-500"
```

#### Highlighted/Badge
```jsx
className="text-xs font-bold text-white bg-red-600 px-3 py-1 rounded-full"
```

---

### Grids & Layouts

#### 2-Column Layout
```jsx
className="grid grid-cols-1 lg:grid-cols-2 gap-8"
```

#### 3-Column Layout  
```jsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
```

#### 4-Column Layout (Responsive)
```jsx
className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
```

#### Flex Center (All)
```jsx
className="flex items-center justify-center"
```

#### Flex Column
```jsx
className="flex flex-col items-center gap-4"
```

#### Flex Between (Space-between)
```jsx
className="flex items-center justify-between"
```

#### Sticky Container
```jsx
className="sticky top-6 bg-white rounded-xl border border-gray-200 p-6"
```

---

### Images & Media

#### Image Container (Square)
```jsx
className="aspect-square bg-gray-100 rounded-lg overflow-hidden"
```

#### Image with Hover Zoom
```jsx
className="w-full h-full object-cover group-hover:scale-110 
           transition-transform duration-700 ease-out"
```

#### Avatar (Profile Picture)
```jsx
className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
```

#### Hero Image (Full Width)
```jsx
className="w-full h-96 lg:h-[500px] object-cover rounded-xl"
```

---

### Loading & Animations

#### Spinner (Loading)
```jsx
className="w-6 h-6 border-4 border-gray-200 border-t-black 
           rounded-full animate-spin"
```

#### Pulse Animation (Shimmer)
```jsx
className="animate-pulse w-full h-32 bg-gray-200 rounded-lg"
```

#### Fade In
```jsx
className="animate-fade-in opacity-0 animation-triggered:opacity-100"
```

#### Bounce
```jsx
className="animate-bounce"
```

#### Scale Transform
```jsx
className="transform hover:scale-110 transition-transform duration-300"
```

---

### Badges & Labels

#### Badge - Red (Sale)
```jsx
className="inline-block text-xs font-bold text-white bg-red-600 
           px-3 py-1 rounded-full"
```

#### Badge - Green (New)
```jsx
className="inline-block text-xs font-bold text-white bg-green-600 
           px-3 py-1 rounded-full"
```

#### Badge - Gray (Info)
```jsx
className="inline-block text-xs font-semibold text-gray-700 
           bg-gray-100 px-3 py-1 rounded-full"
```

---

### Dividers & Separators

#### Horizontal Line
```jsx
className="border-t border-gray-200"
```

#### Divider with Text
```jsx
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-gray-300"></div>
  </div>
  <div className="relative flex justify-center text-sm">
    <span className="px-2 bg-white text-gray-500">Or</span>
  </div>
</div>
```

---

### Shadows

#### Light Shadow
```jsx
className="shadow-sm"
```

#### Normal Shadow
```jsx
className="shadow"
```

#### Medium Shadow
```jsx
className="shadow-md hover:shadow-lg transition-shadow"
```

#### Large Shadow
```jsx
className="shadow-lg"
```

#### Extra Large Shadow (Hero)
```jsx
className="shadow-2xl"
```

---

## 📋 Complete Component Examples

### Complete Form Section
```jsx
<div className="bg-white rounded-xl border border-gray-200 p-8">
  <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
  
  <form className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Your Name
      </label>
      <input 
        type="text"
        placeholder="John Doe"
        className="w-full px-4 py-3 border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-black focus:border-transparent
                   transition-all duration-200"
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Email Address
      </label>
      <input 
        type="email"
        placeholder="john@example.com"
        className="w-full px-4 py-3 border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-black focus:border-transparent
                   transition-all duration-200"
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Message
      </label>
      <textarea 
        placeholder="Your message..."
        className="w-full px-4 py-3 border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-black focus:border-transparent
                   resize-vertical min-h-32"
      ></textarea>
    </div>
    
    <div className="flex gap-3 pt-4">
      <button className="px-6 py-3 bg-black text-white font-semibold 
                         rounded-lg hover:bg-gray-900 transition-all">
        Send Message
      </button>
      <button className="px-6 py-3 border border-gray-300 text-gray-700 
                         font-semibold rounded-lg hover:bg-gray-50 transition-all">
        Cancel
      </button>
    </div>
  </form>
</div>
```

### Complete Card Grid
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => (
    <div key={item.id} className="bg-white rounded-xl border border-gray-200 
                                  shadow-md hover:shadow-xl transition-all 
                                  duration-300 overflow-hidden group">
      {/* Image */}
      <div className="aspect-video bg-gray-100 overflow-hidden">
        <img 
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 
                     transition-transform duration-700"
        />
      </div>
      
      {/* Content */}
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-2 text-gray-900">
          {item.name}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {item.description}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900">
            ${item.price.toFixed(2)}
          </span>
          <button className="px-4 py-2 bg-black text-white rounded-lg 
                           hover:bg-gray-900 transition-all text-sm font-medium">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  ))}
</div>
```

### Complete Section with Header
```jsx
<section className="py-20 bg-gray-50">
  <div className="max-w-7xl mx-auto px-6">
    {/* Section Header */}
    <div className="text-center mb-12">
      <h2 className="text-4xl font-bold text-gray-900 mb-4">
        Our Features
      </h2>
      <p className="text-lg text-gray-600 max-w-2xl mx-auto">
        Everything you need for a great shopping experience
      </p>
    </div>
    
    {/* Feature Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {features.map(feature => (
        <div key={feature.id} className="bg-white rounded-xl p-8 
                                        text-center border border-gray-200
                                        hover:shadow-lg transition-shadow">
          <div className="inline-flex w-16 h-16 bg-black rounded-full 
                         items-center justify-center mb-4 text-white">
            <feature.icon size={24} />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-gray-900">
            {feature.title}
          </h3>
          <p className="text-gray-600">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>
```

---

## 🎯 Common Patterns

### Loading State
```jsx
{loading ? (
  <div className="flex items-center justify-center p-8">
    <div className="w-8 h-8 border-4 border-gray-200 border-t-black 
                    rounded-full animate-spin"></div>
  </div>
) : (
  // Content here
)}
```

### Error Message
```jsx
{error && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg 
                  flex items-start gap-3">
    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
    <div>
      <p className="font-semibold text-red-800">Error</p>
      <p className="text-sm text-red-700">{error}</p>
    </div>
  </div>
)}
```

### Success Message
```jsx
{success && (
  <div className="p-4 bg-green-50 border border-green-200 rounded-lg 
                  flex items-start gap-3">
    <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
    <div>
      <p className="font-semibold text-green-800">Success</p>
      <p className="text-sm text-green-700">{success}</p>
    </div>
  </div>
)}
```

### Empty State
```jsx
<div className="flex flex-col items-center justify-center py-12">
  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center 
                  justify-center mb-4">
    <ShoppingBag size={32} className="text-gray-400" />
  </div>
  <h3 className="text-lg font-semibold text-gray-900 mb-2">
    Nothing here yet
  </h3>
  <p className="text-gray-600 mb-6">
    Start by adding some items
  </p>
  <button className="px-6 py-3 bg-black text-white rounded-lg 
                     hover:bg-gray-900 transition-all">
    Get Started
  </button>
</div>
```

### Modal/Overlay
```jsx
{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center 
                  justify-center z-50">
    <div className="bg-white rounded-xl max-w-md w-full mx-4 p-8 shadow-2xl">
      <h2 className="text-2xl font-bold mb-4">Are you sure?</h2>
      <p className="text-gray-600 mb-6">This action cannot be undone.</p>
      <div className="flex gap-3">
        <button className="flex-1 px-4 py-2 bg-black text-white rounded-lg 
                          hover:bg-gray-900 transition-all">
          Confirm
        </button>
        <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg
                          hover:bg-gray-50 transition-all">
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
```

---

## 🎨 Global CSS Variables (Optional)

Add to your global `index.css`:

```css
:root {
  /* Colors */
  --color-primary: #000000;
  --color-primary-light: #333333;
  --color-primary-dark: #000000;
  
  --color-accent: #ef4444;
  --color-accent-light: #fecaca;
  
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  
  --color-background: #ffffff;
  --color-background-light: #f9fafb;
  --color-border: #e5e7eb;
  --color-text: #111827;
  --color-text-secondary: #6b7280;
  
  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1);
  
  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  
  /* Transitions */
  --transition: all 0.3s ease;
  --transition-fast: all 0.15s ease;
  --transition-slow: all 0.5s ease;
}
```

---

## ✅ Quick Copy-Paste Checklist

- [ ] Copy button classes above
- [ ] Update form inputs styling
- [ ] Apply card styles to components
- [ ] Add badge styles
- [ ] Implement loading spinners
- [ ] Add error/success messages
- [ ] Update empty states
- [ ] Improve responsive grids

---

**Ready to make your UI look professional? Start with buttons and forms - big impact!**
