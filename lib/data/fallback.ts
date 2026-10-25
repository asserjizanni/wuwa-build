export interface CharacterFallback {
  id: string
  name: string
  nameEn: string
  slug: string
  element: 'AERO' | 'SPECTRO' | 'FUSION' | 'ELECTRO' | 'GLACIO' | 'HAVOC'
  weaponType: 'BROADBLADE' | 'SWORD' | 'PISTOLS' | 'GAUNTLETS' | 'RECTIFIER'
  rarity: 'FIVE_STAR' | 'FOUR_STAR'
  description: string
  portraitPath: string | null
  backgroundPath: string | null
  sortOrder: number
  isPublished: boolean
  isComingSoon?: boolean
  releaseVersion?: string | null
  isFeatured?: boolean
  tags: string[]
  nameAr?: string | null
  descriptionAr?: string | null
  role?: string | null
  version?: string | null
  stats?: any
  skills?: any[]
  sequences?: any[]
  teamComps?: any[]
  teams?: any[]
  ascensionMaterials?: any[]
  skillMaterials?: any[]
  allMaterials?: any[]
  recommendedEchoes?: any
  recommendedWeapons?: any[]
  damageDistribution?: any
  buildTips?: string | null
  guides: {
    id: string
    title: string
    version: number
    pageCount: number
    publishedAt: string
    pages?: {
      id: string
      pageNumber: number
      imagePath: string
      thumbnailPath: string | null
      width: number | null
      height: number | null
    }[]
  }[]
}

// No hardcoded characters. All characters are managed via the admin panel.
export const FALLBACK_CHARACTERS: CharacterFallback[] = []
