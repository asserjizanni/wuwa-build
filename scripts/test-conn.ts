import { PrismaClient } from '@prisma/client'

async function test(name: string, url: string) {
  console.log(`Testing ${name}...`)
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  })
  try {
    const count = await prisma.character.count()
    console.log(`✅ ${name} SUCCESS: ${count} characters found`)
  } catch (err: any) {
    console.error(`❌ ${name} ERROR:`, err.message)
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  await test('DATABASE_URL', process.env.DATABASE_URL)
  await test('DIRECT_URL', process.env.DIRECT_URL)
}

main()
