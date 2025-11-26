const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importData() {
  try {
    const data = JSON.parse(fs.readFileSync('production-backup.json', 'utf8'));
    
    console.log('Importing categories...');
    for (const cat of data.categories) {
      await prisma.category.upsert({
        where: { id: cat.id },
        update: cat,
        create: cat
      });
    }
    
    console.log('Importing users...');
    for (const user of data.users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: user
      });
    }
    
    console.log('✅ Import complete!');
    await prisma.$disconnect();
  } catch(e) {
    console.error('Error:', e.message);
    await prisma.$disconnect();
  }
}

importData();