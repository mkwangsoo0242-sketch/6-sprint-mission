import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing (order matters due to FK constraints)
  await prisma.productTag.deleteMany();
  await prisma.product.deleteMany();
  await prisma.tag.deleteMany();

  const tagNames = [
    'digital',
    'fashion',
    'home',
    'book',
    'gaming',
    'apple',
    'premium',
  ];
  const tags = await Promise.all(
    tagNames.map((name) => prisma.tag.create({ data: { name } }))
  );

  const pickTags = (...names) =>
    tags.filter((t) => names.includes(t.name)).map((t) => ({ tagId: t.id }));

  await prisma.product.create({
    data: {
      name: 'iPhone 14 Pro',
      description: '상태 좋음, 가벼운 사용감. 풀박스.',
      price: 1250000.0,
      productTags: { create: pickTags('digital', 'apple', 'premium') },
    },
  });

  await prisma.product.create({
    data: {
      name: '닌텐도 스위치 OLED',
      description: '화이트. 배터리 컨디션 양호.',
      price: 350000.0,
      productTags: { create: pickTags('gaming', 'digital') },
    },
  });

  await prisma.product.create({
    data: {
      name: '무지 티셔츠 3장',
      description: '새상품급, 사이즈 L',
      price: 30000.0,
      productTags: { create: pickTags('fashion') },
    },
  });

  await prisma.product.create({
    data: {
      name: '원목 책상',
      description: '스크래치 조금, 튼튼합니다.',
      price: 80000.0,
      productTags: { create: pickTags('home') },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
