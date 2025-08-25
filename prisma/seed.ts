import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Chips' },
      update: {},
      create: { name: 'Chips' }
    }),
    prisma.category.upsert({
      where: { name: 'Chocolates' },
      update: {},
      create: { name: 'Chocolates' }
    }),
    prisma.category.upsert({
      where: { name: 'Biscuits' },
      update: {},
      create: { name: 'Biscuits' }
    }),
    prisma.category.upsert({
      where: { name: 'Noodles' },
      update: {},
      create: { name: 'Noodles' }
    }),
    prisma.category.upsert({
      where: { name: 'Beverages' },
      update: {},
      create: { name: 'Beverages' }
    })
  ])

  // Create products
  const products = [
    // Chips
    { name: 'Lays Classic', price: 20, category: 'Chips', stock: 50 },
    { name: 'Kurkure Masala Munch', price: 15, category: 'Chips', stock: 30 },
    { name: 'Balaji Wafers', price: 10, category: 'Chips', stock: 25 },
    { name: 'Bingo Mad Angles', price: 20, category: 'Chips', stock: 40 },
    
    // Chocolates
    { name: 'Dairy Milk', price: 40, category: 'Chocolates', stock: 35 },
    { name: 'KitKat', price: 20, category: 'Chocolates', stock: 45 },
    { name: '5 Star', price: 10, category: 'Chocolates', stock: 60 },
    { name: 'Snickers', price: 35, category: 'Chocolates', stock: 20 },
    
    // Biscuits
    { name: 'Parle-G', price: 15, category: 'Biscuits', stock: 40 },
    { name: 'Oreo', price: 30, category: 'Biscuits', stock: 25 },
    { name: 'Good Day', price: 25, category: 'Biscuits', stock: 35 },
    { name: 'Hide & Seek', price: 30, category: 'Biscuits', stock: 20 },
    
    // Noodles
    { name: 'Maggi 2-Minute', price: 12, category: 'Noodles', stock: 80 },
    { name: 'Yippee Noodles', price: 12, category: 'Noodles', stock: 60 },
    { name: 'Top Ramen', price: 15, category: 'Noodles', stock: 40 },
    { name: 'Wai Wai', price: 10, category: 'Noodles', stock: 50 },
    
    // Beverages
    { name: 'Frooti', price: 20, category: 'Beverages', stock: 30 },
    { name: 'Coca Cola', price: 25, category: 'Beverages', stock: 40 },
    { name: 'Thumbs Up', price: 25, category: 'Beverages', stock: 35 },
    { name: 'Red Bull', price: 120, category: 'Beverages', stock: 15 }
  ]

  // Clear existing products first (optional - for clean seeding)
  await prisma.product.deleteMany({})

  for (const product of products) {
    const category = categories.find(cat => cat.name === product.category)
    if (category) {
      await prisma.product.create({
        data: {
          name: product.name,
          price: product.price,
          stockQuantity: product.stock,
          isAvailable: true,
          categoryId: category.id
        }
      })
    }
  }

  console.log('✅ Database seeded successfully!')
  console.log(`📦 Created ${categories.length} categories`)
  console.log(`🛍️ Created ${products.length} products`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })