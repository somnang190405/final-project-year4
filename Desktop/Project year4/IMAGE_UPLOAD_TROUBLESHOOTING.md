# Image Upload Troubleshooting Guide

## Common Reasons Why Image Upload Might Not Work

### 1. **File Input Not Properly Interactive**
**Problem**: The file input element is hidden or not clickable
- File `<input type="file">` is not visible on the page
- Click events don't trigger the file picker dialog
- Dropzone area is covered by non-interactive elements

**Solution**: 
```jsx
// Hide the input but make the parent clickable
const fileInputRef = useRef<HTMLInputElement>(null);

const handleFileInputClick = () => {
  fileInputRef.current?.click();
};

<input
  ref={fileInputRef}
  type="file"
  accept="image/png,image/jpeg,image/webp"
  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileInputChange(f); }}
  style={{ display: 'none' }}
/>
<div
  className="dropzone"
  onClick={handleFileInputClick}
  onDrop={handleDrop}
  onDragOver={handleDragOver}
>
  {/* Visual UI */}
</div>
```

### 2. **Preview URL Not Being Created**
**Problem**: File is selected but no preview appears
- `URL.createObjectURL()` never called
- `imagePreviewUrl` state not updated
- Conditional rendering prevents preview from showing

**Solution**:
```jsx
// Use useEffect to create and manage object URL
useEffect(() => {
  if (!imageFile) {
    setImagePreviewUrl(null);
    return;
  }
  console.log('Creating preview for file:', imageFile.name);
  const url = URL.createObjectURL(imageFile);
  setImagePreviewUrl(url);
  
  // Clean up the URL when component unmounts or file changes
  return () => {
    URL.revokeObjectURL(url);
  };
}, [imageFile]);

// Display preview
{imageFile && imagePreviewUrl && (
  <img src={imagePreviewUrl} alt="preview" />
)}
```

### 3. **Invalid File Type**
**Problem**: WebP file is rejected or wrong MIME type detected
- Browser reports different MIME type than expected
- File extension doesn't match actual file type
- Multiple file types not properly whitelisted

**Solution**:
```jsx
const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
if (!validTypes.includes(file.type)) {
  setError(`Invalid file type: ${file.type}. Allowed: ${validTypes.join(', ')}`);
  return;
}

// Accept attribute with both MIME types and extensions
<input
  type="file"
  accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
  onChange={handleFileChange}
/>
```

### 4. **File Size Exceeds Limit**
**Problem**: Selected file is too large
- Default browser file size may be large
- Supabase storage limit exceeded
- Network timeout for large uploads

**Solution**:
```jsx
const maxSizeMB = 5;
if (file.size > maxSizeMB * 1024 * 1024) {
  setError(`File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max: ${maxSizeMB}MB`);
  return;
}

// Optionally compress before upload
const compressedBlob = await compressImage(file);
```

### 5. **Image Preview URL Fallback Issues**
**Problem**: Using `URL.createObjectURL()` in render creates new URLs every render
- Memory leak from unreleased object URLs
- Image flickers or doesn't display
- Performance degrades with multiple files

**Bad**:
```jsx
// DON'T DO THIS - creates new URL every render!
<img src={imagePreviewUrl || URL.createObjectURL(imageFile)} />
```

**Good**:
```jsx
// DO THIS - create URL in useEffect, store in state
useEffect(() => {
  if (imageFile) {
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }
}, [imageFile]);

<img src={imagePreviewUrl} alt="preview" />
```

### 6. **Drag and Drop Not Working**
**Problem**: Dragging files onto dropzone doesn't trigger upload
- `onDrop` event not properly prevented default
- `onDragOver` event not marking as valid drop target
- Event handlers not properly attached

**Solution**:
```jsx
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();  // Important!
  e.stopPropagation();
  const file = e.dataTransfer.files?.[0];
  if (file) handleFileInputChange(file);
};

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();  // Important!
  e.stopPropagation();
  // Optional: add visual feedback
  e.currentTarget.classList.add('drag-over');
};

<div
  onDrop={handleDrop}
  onDragOver={handleDragOver}
  onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
>
  Drop files here
</div>
```

### 7. **Supabase Upload Failure**
**Problem**: File selected but upload to Supabase fails
- Storage bucket doesn't exist or not public
- Row-level security (RLS) policies blocking insert
- CORS policy restrictions
- Authentication token expired

**Solution**:
```jsx
try {
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, {
      contentType: file.type,
    });

  if (error) {
    console.error('Upload error:', error);
    if (error.message.includes('ERR_FAILED')) {
      setError('Network error. Check your connection and Supabase storage.');
    } else {
      setError(error.message);
    }
    return;
  }

  const { data: publicUrlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);
    
  return publicUrlData.publicUrl;
} catch (error: any) {
  console.error('Upload failed:', error);
  setError(error.message);
}
```

### 8. **State Not Updating After File Selection**
**Problem**: File is selected but component doesn't re-render
- setState calls not triggering
- Event handler not properly bound
- State updates batched incorrectly

**Solution**:
```jsx
const handleFileInputChange = (file?: File | null) => {
  if (!file) return;
  
  console.log('File selected:', { name: file.name, size: file.size });
  
  // Validate
  if (!isValidFile(file)) return;
  
  // Update state in correct order
  setUploadError(null);    // Clear errors first
  setImageFile(file);      // Set file
  setImageFileName(file.name);
  setImageMode('upload');  // Switch mode last
  
  console.log('State updated successfully');
};
```

## Debugging Checklist

- [ ] Browser console logs file selection events
- [ ] `imageFile` state shows correct file object
- [ ] `imagePreviewUrl` state has valid blob URL (starts with `blob:`)
- [ ] File input ref is properly attached (`fileInputRef.current` exists)
- [ ] onClick handler properly calls `fileInputRef.current.click()`
- [ ] Validation passes (file type, size, etc.)
- [ ] useEffect runs when `imageFile` changes
- [ ] Preview condition `{imageFile && imagePreviewUrl && <img />}` evaluates to true
- [ ] No error messages in `uploadError` state
- [ ] Supabase storage bucket is public and accessible
- [ ] CORS headers allow image uploads from your domain

## Testing Your Upload

```javascript
// In browser console to test file handling
const file = new File(['test'], 'test.webp', { type: 'image/webp' });
const event = new Event('change', { bubbles: true });
Object.defineProperty(event, 'target', {
  value: { files: [file] },
  enumerable: true
});
// Then check if handlers execute correctly
```

## What I Fixed in Your Code

1. **Added file input ref** - Allows proper control of the hidden file input
2. **Made dropzone clickable** - Added `onClick={handleFileInputClick}` and `style={{ display: 'none' }}` on input
3. **Fixed preview URL logic** - Now uses proper useEffect with cleanup, only shows preview when URL exists
4. **Added console logging** - Helps debug which steps are executing
5. **Added keyboard accessibility** - Can now open file picker with Enter/Space keys
6. **Fixed cleanup** - Properly revokes object URLs to prevent memory leaks
7. **Improved error handling** - Better error messages with file details

## Alternative: Accept URLs Instead of Files

If upload continues to fail, provide URL fallback:

```jsx
{imageMode === 'upload' ? (
  <FileUploadSection />
) : (
  <div>
    <input
      type="url"
      value={imageUrl}
      onChange={(e) => setImageUrl(e.target.value)}
      placeholder="https://example.com/image.jpg"
    />
    {imageUrl && <img src={imageUrl} alt="preview" />}
  </div>
)}
```

## Next Steps

1. Check browser console for file selection logs
2. Verify `imageFile` state contains the file
3. Confirm `imagePreviewUrl` is a valid blob URL
4. If still failing, add more detailed logging:

```jsx
console.log('File:', imageFile);
console.log('Preview URL:', imagePreviewUrl);
console.log('Image Mode:', imageMode);
console.log('DOM Image:', document.querySelector('img[alt="preview"]'));
```
