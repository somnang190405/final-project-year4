const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../firebase-service-account.json'); // You'll need to provide this
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://your-project.firebaseio.com' // Replace with your project URL
});

const db = admin.firestore();

async function updateProductCategories() {
  const productsRef = db.collection('products');
  const snapshot = await productsRef.get();

  const updates = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    let newCategory = data.category;

    // Update categories to include gender/sub-category
    if (data.category === 'Men') {
      newCategory = 'Men/Tops'; // Example, adjust as needed
    } else if (data.category === 'Women') {
      newCategory = 'Women/Tops';
    } else if (data.category === 'Shoes') {
      newCategory = 'Men/Shoes'; // Or based on gender
    } else if (data.category === 'Bags') {
      newCategory = 'Women/Accessories';
    }
    // Add more mappings for Boys/Girls if products exist

    if (newCategory !== data.category) {
      updates.push(productsRef.doc(doc.id).update({ category: newCategory }));
    }
  });

  await Promise.all(updates);
  console.log('Categories updated');
}

updateProductCategories().catch(console.error);