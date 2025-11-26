const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function exportData() {
  try {
    const data = {
      users: await prisma.user.findMany(),
      categories: await prisma.category.findMany(),
      products: await prisma.product.findMany(),
      orders: await prisma.order.findMany({ 
        include: { 
          orderItems: true, 
          messages: true 
        } 
      }),
      listings: await prisma.itemListing.findMany(),
      rentals: await prisma.rentalTransaction.findMany({ 
        include: { 
          rentalMessages: true 
        } 
      }),
      shopSettings: await prisma.shopSettings.findMany()
    };
    
    fs.writeFileSync('production-backup.json', JSON.stringify(data, null, 2));
    
    console.log('✅ Data saved to production-backup.json');
    console.log('Users:', data.users.length);
    console.log('Categories:', data.categories.length);
    console.log('Products:', data.products.length);
    
    await prisma.$disconnect();
  } catch(e) {
    console.error('Error:', e.message);
    await prisma.$disconnect();
  }
}

exportData();