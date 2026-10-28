import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma, safeDb } from '@/lib/db'
import { getAdminSession } from '@/lib/session'
import { generateSlug, initCharacterStorage } from '@/lib/storage'
import { FALLBACK_CHARACTERS } from '@/lib/data/fallback'
import { getStoredCharacters, createStoredCharacter } from '@/lib/data/characterStore'
import { z } from 'zod'

const createCharacterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().max(100).optional().nullable().or(z.literal('')),
  element: z.string().transform(v => v.toUpperCase()).pipe(z.enum(['AERO', 'SPECTRO', 'FUSION', 'ELECTRO', 'GLACIO', 'HAVOC'])),
  weaponType: z.string().transform(v => v.toUpperCase()).pipe(z.enum(['BROADBLADE', 'SWORD', 'PISTOLS', 'GAUNTLETS', 'RECTIFIER'])),
  rarity: z.enum(['FOUR_STAR', 'FIVE_STAR']).optional().default('FIVE_STAR'),
  description: z.string().max(2000).optional().nullable().or(z.literal('')),
  sourceUrl: z.string().max(500).optional().nullable().or(z.literal('')),
  isPublished: z.boolean().optional().default(true),
  isComingSoon: z.boolean().optional().default(false),
  releaseVersion: z.string().max(20).optional().nullable().or(z.literal('')),
  isFeatured: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
  portraitPath: z.string().optional().nullable().or(z.literal('')),
  backgroundPath: z.string().optional().nullable().or(z.literal('')),
})

export async function GET(request: NextRequest) {
  const session = await getAdminSession()
  if (!session.adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search') || ''
  const element = searchParams.get('element') || ''
  const published = searchParams.get('published')
  const status = searchParams.get('status') || published

  const result = await safeDb(async () => {
    const where: any = {}
    if (search) where.name = { contains: search, mode: 'insensitive' }
    if (element) where.element = element

    if (status === 'COMING_SOON') {
      where.isComingSoon = true
    } else if (status === 'AVAILABLE' || status === 'true') {
      where.isPublished = true
      where.isComingSoon = false
    } else if (status === 'DRAFT' || status === 'false') {
      where.isPublished = false
    }

    const [characters, total] = await Promise.all([
      prisma.character.findMany({
        where,
        select: {
          id: true,
          name: true,
          nameAr: true,
          slug: true,
          element: true,
          weaponType: true,
          rarity: true,
          role: true,
          isPublished: true,
          isComingSoon: true,
          releaseVersion: true,
          isFeatured: true,
          sortOrder: true,
          portraitPath: true,
          iconUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ isComingSoon: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.character.count({ where }),
    ])

    return {
      characters,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
  }, null)

  if (result) {
    return NextResponse.json(result)
  }

  // Fallback characters from persistent store
  let list = [...getStoredCharacters()]
  if (search) list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  if (element) list = list.filter(c => c.element === element)
  if (status === 'COMING_SOON') {
    list = list.filter(c => Boolean(c.isComingSoon))
  } else if (status === 'AVAILABLE' || status === 'true') {
    list = list.filter(c => c.isPublished === true && !c.isComingSoon)
  } else if (status === 'DRAFT' || status === 'false') {
    list = list.filter(c => c.isPublished === false)
  }
  list.sort((a, b) => {
    if (a.isComingSoon && !b.isComingSoon) return -1
    if (!a.isComingSoon && b.isComingSoon) return 1
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  })

  const total = list.length
  const paginated = list.slice((page - 1) * limit, page * limit).map(c => ({
    ...c,
    _count: { guides: c.guides ? c.guides.length : 0 },
  }))

  return NextResponse.json({
    characters: paginated,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession()
  if (!session.adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Sanitize: fallback session ID is not a real DB cuid — use null for audit log
  const auditAdminId = session.adminId && session.adminId !== 'admin-system-master' ? session.adminId : null

  try {
    const body = await request.json()
    const data = createCharacterSchema.parse(body)

    let slug = (data.slug && data.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')) || generateSlug(data.name)
    if (!slug) {
      slug = `resonator-${Date.now().toString(36)}`
    }

    const existing = await safeDb(() => prisma.character.findUnique({ where: { slug } }), null)
    if (existing) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`
    }

    const character = await safeDb(async () => {
      return prisma.$transaction(async (tx) => {
        const char = await tx.character.create({
          data: {
            name: data.name,
            slug,
            element: data.element,
            weaponType: data.weaponType,
            rarity: data.rarity,
            description: data.description || null,
            sourceUrl: data.sourceUrl || null,
            isPublished: data.isPublished,
            isComingSoon: data.isComingSoon,
            releaseVersion: data.releaseVersion || null,
            sortOrder: data.isComingSoon ? 0 : undefined,
            isFeatured: data.isFeatured,
            tags: data.tags,
            portraitPath: data.portraitPath || null,
            backgroundPath: data.backgroundPath || null,
          },
        })

        await tx.auditLog.create({
          data: {
            adminUserId: auditAdminId,
            action: 'CREATE_CHARACTER',
            targetType: 'Character',
            targetId: char.id,
            details: { name: char.name, slug: char.slug },
          },
        })

        return char
      })
    }, null)

    try {
      await initCharacterStorage(slug)
    } catch (storageErr) {
      console.error('[storage] Failed to create directories for', slug, storageErr)
    }

    if (character) {
      // Also sync to local store
      createStoredCharacter({
        ...data,
        slug,
      })

      try {
        revalidatePath('/')
        revalidatePath('/characters')
        revalidatePath('/spin')
        revalidatePath(`/characters/${slug}`)
      } catch {}

      return NextResponse.json({ character }, { status: 201 })
    }

    // Fallback store when DB is offline
    const fallbackChar = createStoredCharacter({
      ...data,
      slug,
    })

    try {
      revalidatePath('/')
      revalidatePath('/characters')
      revalidatePath('/spin')
      revalidatePath(`/characters/${slug}`)
    } catch {}

    return NextResponse.json({ character: fallbackChar }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 422 })
    }
    console.error('[create character]', err)
    return NextResponse.json({ error: 'Failed to create character' }, { status: 500 })
  }
}
