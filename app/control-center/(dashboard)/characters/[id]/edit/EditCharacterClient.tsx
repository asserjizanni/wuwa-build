'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
import {
  Save, ArrowLeft, Loader2, Sparkles, Activity, Shield,
  Zap, Star, Layers, Users, Trash2, Plus, ExternalLink,
  ChevronDown, Image as ImageIcon, CheckCircle2,
  RefreshCw, BarChart3, Swords, MoveUp, MoveDown, Package, ChevronRight, Upload,
  Lock
} from 'lucide-react'
import ImageUploadField from '@/components/admin/ImageUploadField'
import ItemPickerModal, { DbItem } from '@/components/admin/ItemPickerModal'
import EntityPickerModal, { DbWeapon, DbCharacter } from '@/components/admin/EntityPickerModal'

interface Talent {
  key?: string
  category: string
  name: string
  icon?: string
  description: string
}

interface Sequence {
  node: number
  name: string
  icon?: string
  description: string
  priorityStars?: number
}

interface Material {
  name: string
  amount: string
  icon?: string
}

interface WeaponDPS {
  rank: number
  name: string
  refinement: string
  icon?: string
  rarity?: number
  statsText?: string
  relativeDps: string
  echoStat?: string
  avgDamage?: string
  effect?: string
}

interface TeamMember {
  name: string
  slug?: string
  avatar?: string
  role?: string
  weapon?: string
  weaponIcon?: string
}

interface RotationStep {
  characterName: string
  action: string
}

interface RotationGroup {
  title: string
  steps: RotationStep[]
}

interface TeamComp {
  id?: string
  name: string
  rank?: number
  dps?: string
  dpsNote?: string
  members: TeamMember[]
  rotations?: RotationGroup[]
}

interface DamageSegment {
  key: string
  label: string
  percentage: string
  color: string
}

interface DamageDistribution {
  heavy?: string
  liberation?: string
  basic?: string
  skill?: string
  outro?: string
  intro?: string
  tuneBreak?: string
  echo?: string
  segments?: DamageSegment[]
}

interface EchoRec {
  primarySet?: { name: string; icon?: string; desc?: string }
  secondarySet?: { name: string; icon?: string; desc?: string }
  mainEcho?: { name: string; icon?: string; desc?: string }
  cost4Stats?: string[]
  cost3Stats?: string[]
  cost1Stats?: string[]
  substatsPriority?: string[]
}

interface StatsMatrix {
  levels: number[]
  keys: string[]
  rows: string[][]
}


interface CharacterData {
  id: string
  name: string
  nameAr?: string | null
  slug: string
  element: string
  weaponType: string
  rarity: 'FOUR_STAR' | 'FIVE_STAR'
  role?: string | null
  description?: string | null
  descriptionAr?: string | null
  sourceUrl?: string | null
  portraitPath?: string | null
  backgroundPath?: string | null
  isPublished: boolean
  isComingSoon?: boolean
  releaseVersion?: string | null
  isFeatured: boolean
  tags: string[]
  stats?: StatsMatrix | any
  skills?: Talent[]
  sequences?: Sequence[]
  weaponsDPS?: WeaponDPS[]
  teams?: TeamComp[]
  damageDistribution?: DamageDistribution | null
  ascensionMaterials?: Material[]
  skillMaterials?: Material[]
  allMaterials?: Material[]
  recommendedEchoes?: EchoRec
  buildTips?: string | null
}

const STAT_LEVELS = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90]

export default function EditCharacterClient({ characterId }: { characterId: string }) {
  const router = useRouter()
  const [character, setCharacter] = useState<CharacterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'details' | 'stats' | 'skills' | 'sequences' | 'weapons' | 'echoes' | 'teams' | 'calculations' | 'materials' | 'media'
  >('details')

  // Image upload state
  const [uploadingPortrait, setUploadingPortrait] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const portraitInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  // Delete state
  const [showDeleteCharModal, setShowDeleteCharModal] = useState(false)
  const [isDeletingChar, setIsDeletingChar] = useState(false)

  // Item picker state
  const [itemPickerOpen, setItemPickerOpen] = useState(false)
  const [itemPickerTarget, setItemPickerTarget] = useState<{
    group: 'ascension' | 'skill' | 'all'
    idx: number
  } | null>(null)

  // Weapon picker state
  const [weaponPickerOpen, setWeaponPickerOpen] = useState(false)
  const [weaponPickerIdx, setWeaponPickerIdx] = useState<number>(-1)

  // Character picker state
  const [charPickerOpen, setCharPickerOpen] = useState(false)
  const [charPickerTarget, setCharPickerTarget] = useState<{ tIdx: number; mIdx: number } | null>(null)

  const openItemPicker = (group: 'ascension' | 'skill' | 'all', idx: number) => {
    setItemPickerTarget({ group, idx })
    setItemPickerOpen(true)
  }

  const handleItemSelected = (item: DbItem) => {
    if (!itemPickerTarget || !character) return
    const { group, idx } = itemPickerTarget
    const matKey = group === 'ascension' ? 'ascensionMaterials' : group === 'skill' ? 'skillMaterials' : 'allMaterials'
    const mats = [...((character as any)[matKey] || [])]
    mats[idx] = { ...mats[idx], name: item.nameAr || item.name, icon: item.iconUrl || mats[idx].icon }
    setCharacter({ ...character, [matKey]: mats })
    setItemPickerOpen(false)
  }

  const uploadMaterialIcon = async (file: File, group: 'ascension' | 'skill' | 'all', idx: number) => {
    if (!file || !character) return
    const loadingToast = toast.loading('جاري رفع صورة المادة...')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'materials')
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل الرفع')
      const matKey = group === 'ascension' ? 'ascensionMaterials' : group === 'skill' ? 'skillMaterials' : 'allMaterials'
      const mats = [...((character as any)[matKey] || [])]
      mats[idx] = { ...mats[idx], icon: data.url }
      setCharacter({ ...character, [matKey]: mats })
      toast.success('تم رفع صورة المادة بنجاح', { id: loadingToast })
    } catch (err: any) {
      toast.error(err.message || 'فشل رفع الصورة', { id: loadingToast })
    }
  }

  const fetchCharacter = async () => {
    try {
      const res = await fetch(`/api/admin/characters/${characterId}`)
      if (!res.ok) throw new Error('Failed to load character')
      const data = await res.json()
      const char = data.character || {}

      // If teams is empty in DB but exists in fallback JSON
      let rawTeams = Array.isArray(char.teams) ? char.teams : (Array.isArray(char.teamComps) ? char.teamComps : [])
      // Ensure every team has valid members/rotations arrays to prevent crash on render
      let teams = rawTeams.map((t: any) => ({
        ...t,
        members: Array.isArray(t.members) ? t.members : [],
        rotations: Array.isArray(t.rotations)
          ? t.rotations.map((r: any) => ({
              ...r,
              steps: Array.isArray(r.steps) ? r.steps : [],
            }))
          : [],
      }))

      setCharacter({
        ...char,
        isComingSoon: char.isComingSoon ?? false,
        releaseVersion: char.releaseVersion || '',
        nameAr: char.nameAr || '',
        role: char.role || '',
        descriptionAr: char.descriptionAr || '',
        tags: Array.isArray(char.tags) ? char.tags : [],
        skills: Array.isArray(char.skills) ? char.skills : [],
        sequences: Array.isArray(char.sequences) ? char.sequences : [],
        weaponsDPS: Array.isArray(char.weaponsDPS) ? char.weaponsDPS : (Array.isArray(char.recommendedWeapons) ? char.recommendedWeapons : []),
        teams: teams,
        damageDistribution: char.damageDistribution || null,
        ascensionMaterials: Array.isArray(char.ascensionMaterials) ? char.ascensionMaterials : [],
        skillMaterials: Array.isArray(char.skillMaterials) ? char.skillMaterials : [],
        allMaterials: Array.isArray(char.allMaterials) ? char.allMaterials : [],
      })
    } catch {
      toast.error('Failed to load character details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCharacter()
  }, [characterId])

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!character) return

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/characters/${character.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: character.name,
          nameAr: character.nameAr,
          role: character.role,
          element: character.element,
          weaponType: character.weaponType,
          rarity: character.rarity,
          description: character.description,
          descriptionAr: character.descriptionAr,
          sourceUrl: character.sourceUrl,
          isPublished: character.isPublished,
          isComingSoon: character.isComingSoon,
          releaseVersion: character.releaseVersion,
          isFeatured: character.isFeatured,
          tags: character.tags,
          stats: character.stats,
          skills: character.skills,
          sequences: character.sequences,
          weaponsDPS: character.weaponsDPS,
          teams: character.teams,
          damageDistribution: character.damageDistribution,
          ascensionMaterials: character.ascensionMaterials,
          skillMaterials: character.skillMaterials,
          allMaterials: character.allMaterials,
          recommendedEchoes: character.recommendedEchoes,
          buildTips: character.buildTips,
          portraitPath: character.portraitPath,
          backgroundPath: character.backgroundPath,
        }),
      })

      if (!res.ok) throw new Error('Failed to update character')
      toast.success('تم حفظ وتحديث جميع أقسام وبيانات الشخصية بنجاح!')
    } catch (err: any) {
      toast.error(err.message || 'Error updating character')
    } finally {
      setSaving(false)
    }
  }

  // Auto-generate level scaling between Lv 1 and Lv 90
  const handleAutoGenerateStats = () => {
    if (!character) return
    const currentRows = character.stats?.rows || []
    const firstRow = currentRows[0] || ['800', '25', '90', '100', '5%', '150%', '0%', '0%', '0', '100']
    const lastRow = currentRows[currentRows.length - 1] || ['10000', '280', '1100', '100', '5%', '150%', '0%', '0%', '0', '100']

    const hp1 = parseFloat(firstRow[0]) || 800
    const hp90 = parseFloat(lastRow[0]) || 10000
    const atk1 = parseFloat(firstRow[1]) || 25
    const atk90 = parseFloat(lastRow[1]) || 280
    const def1 = parseFloat(firstRow[2]) || 90
    const def90 = parseFloat(lastRow[2]) || 1100

    const newRows: string[][] = STAT_LEVELS.map((lvl) => {
      const t = (lvl - 1) / (90 - 1)
      const hp = Math.round(hp1 + (hp90 - hp1) * t).toString()
      const atk = Math.round(atk1 + (atk90 - atk1) * t).toString()
      const def = Math.round(def1 + (def90 - def1) * t).toString()
      return [
        hp, atk, def,
        firstRow[3] || '100',
        firstRow[4] || '5%',
        firstRow[5] || '150%',
        firstRow[6] || '0%',
        firstRow[7] || '0%',
        firstRow[8] || '0',
        firstRow[9] || '100'
      ]
    })

    setCharacter({
      ...character,
      stats: {
        levels: STAT_LEVELS,
        keys: ['hp', 'atk', 'def', 'energy', 'critRate', 'critDmg', 'healing', 'element', 'tuneBreak', 'offTune'],
        rows: newRows
      }
    })
    toast.success('تم توليد التدرج الإحصائي لجميع المستويات 1-90 بنجاح!')
  }

  const handleImageUpload = async (type: 'portrait' | 'background', file: File) => {
    if (!character) return
    const isPortrait = type === 'portrait'
    if (isPortrait) setUploadingPortrait(true)
    else setUploadingBanner(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      formData.append('characterId', character.id)

      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Upload failed')
      const json = await res.json()
      const path = json.url || json.path

      if (isPortrait) {
        setCharacter(prev => prev ? { ...prev, portraitPath: path } : null)
        toast.success('Portrait uploaded!')
      } else {
        setCharacter(prev => prev ? { ...prev, backgroundPath: path } : null)
        toast.success('Background banner uploaded!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Image upload failed')
    } finally {
      if (isPortrait) setUploadingPortrait(false)
      else setUploadingBanner(false)
    }
  }



  const handleDeleteCharacter = async () => {
    if (!character) return
    setIsDeletingChar(true)
    try {
      const res = await fetch(`/api/admin/characters/${character.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true })
      })
      if (!res.ok) throw new Error('Failed to delete character')
      toast.success('Character deleted')
      router.push('/control-center/characters')
    } catch (err: any) {
      toast.error(err.message || 'Error deleting character')
      setIsDeletingChar(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!character) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Character not found.</p>
        <Link href="/control-center/characters" className="text-primary mt-2 inline-block">
          Back to list
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 text-right" dir="rtl">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/control-center/characters"
            className="p-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition"
          >
            <ArrowLeft className="w-5 h-5 rotate-180" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white font-tajawal">
                {character.nameAr || character.name}
              </h1>
              <span className="text-xs font-mono text-cyan-400 px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                {character.slug}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400 font-mono">{character.name}</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-semibold text-amber-400">
                {character.rarity === 'FIVE_STAR' ? '5 نجوم ★★★★★' : '4 نجوم ★★★★'}
              </span>
              {character.role && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs text-cyan-300 font-medium">{character.role}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href={`/characters/${character.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-xs font-semibold transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            معاينة الصفحة العامة
          </Link>

          <button
            type="button"
            onClick={() => handleSaveAll()}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>حفظ جميع التغييرات</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteCharModal(true)}
            className="p-2 rounded-xl border border-rose-500/30 text-rose-400 hover:text-white hover:bg-rose-500/20 transition"
            title="حذف الشخصية"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex border-b border-white/10 gap-1 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'details', label: 'المعلومات العامة', icon: Sparkles },
          { key: 'stats', label: 'الستات (1-90)', icon: Activity },
          { key: 'skills', label: `السكلات (${character.skills?.length || 0})`, icon: Zap },
          { key: 'sequences', label: `السيكوينسات (${character.sequences?.length || 0})`, icon: Star },
          { key: 'weapons', label: `الأسلحة والدمج (${character.weaponsDPS?.length || 0})`, icon: Swords },
          { key: 'echoes', label: 'الإيكوز والبيلد', icon: Shield },
          { key: 'teams', label: `الفرق والتيمات (${character.teams?.length || 0})`, icon: Users },
          { key: 'calculations', label: 'الحسابات وتوزيع الدمج', icon: BarChart3 },
          { key: 'materials', label: 'مواد الترقية (3 مجموعات)', icon: Layers },
          { key: 'media', label: 'الصور والخلفيات', icon: ImageIcon },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition -mb-px rounded-t-xl ${
                isActive
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: GENERAL DETAILS
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              البيانات التعريفية للشخصية
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-300 mb-2">
                  الاسم بالعربي (Name AR)
                </label>
                <input
                  type="text"
                  value={character.nameAr || ''}
                  onChange={e => setCharacter({ ...character, nameAr: e.target.value })}
                  placeholder="مثال: الشوركيبر"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-300 mb-2">
                  الاسم بالإنجليزي (Name EN)
                </label>
                <input
                  type="text"
                  required
                  value={character.name}
                  onChange={e => setCharacter({ ...character, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-300 mb-2">
                  الدور القتالي (Role)
                </label>
                <input
                  type="text"
                  value={character.role || ''}
                  onChange={e => setCharacter({ ...character, role: e.target.value })}
                  placeholder="مثال: مين ديس / ساب ديس / معالج وسبورت"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-300 mb-2">
                  العنصر (Element)
                </label>
                <select
                  value={character.element}
                  onChange={e => setCharacter({ ...character, element: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none"
                >
                  {['AERO', 'SPECTRO', 'FUSION', 'ELECTRO', 'GLACIO', 'HAVOC'].map(el => (
                    <option key={el} value={el} className="bg-zinc-900">{el}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-300 mb-2">
                  نوع السلاح (Weapon Type)
                </label>
                <select
                  value={character.weaponType}
                  onChange={e => setCharacter({ ...character, weaponType: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none"
                >
                  {['BROADBLADE', 'SWORD', 'PISTOLS', 'GAUNTLETS', 'RECTIFIER'].map(wt => (
                    <option key={wt} value={wt} className="bg-zinc-900">{wt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-300 mb-2">
                  الندرة (Rarity)
                </label>
                <select
                  value={character.rarity}
                  onChange={e => setCharacter({ ...character, rarity: e.target.value as any })}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none"
                >
                  <option value="FIVE_STAR" className="bg-zinc-900">5 نجوم (★★★★★)</option>
                  <option value="FOUR_STAR" className="bg-zinc-900">4 نجوم (★★★★)</option>
                </select>
              </div>
            </div>

            {/* ── Publishing Status & Coming Soon ── */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                حالة الدليل والعرض للجمهور (Status & Coming Soon)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-300 mb-2">
                    حالة الصفحة
                  </label>
                  <select
                    value={character.isComingSoon || !character.isPublished ? 'COMING_SOON' : 'AVAILABLE'}
                    onChange={e => {
                      const isSoon = e.target.value === 'COMING_SOON'
                      setCharacter({
                        ...character,
                        isComingSoon: isSoon,
                        isPublished: !isSoon,
                      })
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none font-semibold"
                  >
                    <option value="AVAILABLE" className="bg-zinc-900 text-emerald-400">
                      🟢 متاح (منشور ومفتوح للجميع)
                    </option>
                    <option value="COMING_SOON" className="bg-zinc-900 text-amber-400">
                      🟡 قريباً (معروض ببطاقة قريباً والدليل مقفل)
                    </option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    عند اختيار &quot;قريباً&quot;، تظهر بطاقة الشخصية بعلامة قريباً ويكون الدليل مقفلاً. عند تحويلها إلى &quot;متاح&quot;، يتم فتح ونشر الدليل فوراً.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-300 mb-2">
                    رقم التحديث / الإصدار (Release Version)
                  </label>
                  <input
                    type="text"
                    value={character.releaseVersion || ''}
                    onChange={e => setCharacter({ ...character, releaseVersion: e.target.value })}
                    placeholder="مثال: 3.4 أو 3.5 أو 3.7"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    يظهر كرقم إصدار في أسفل بطاقة الشخصية مثل (3.4، 3.5، 3.6، إلخ).
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-300 mb-2">
                الوصف والمقدمة بالعربي (Arabic Description)
              </label>
              <textarea
                rows={3}
                value={character.descriptionAr || ''}
                onChange={e => setCharacter({ ...character, descriptionAr: e.target.value })}
                placeholder="نبذة شاملة ومختصرة عن الشخصية باللغة العربية..."
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: STATS MATRIX (1-90)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  مصفوفة الإحصائيات (Stats Matrix Lv. 1 - Lv. 90)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  القيم الدقيقة للإحصائيات لكل مستوى تظهر مباشرة عند تحريك السلايدر في صفحة الشخصية.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAutoGenerateStats}
                className="px-4 py-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 text-xs font-bold transition flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                توليد التدرج الإحصائي تلقائياً
              </button>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto border border-white/10 rounded-2xl bg-black/40">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-white/[0.04] text-slate-400 border-b border-white/10">
                    <th className="p-3 font-bold text-white">المستوى</th>
                    <th className="p-3">HP</th>
                    <th className="p-3">ATK</th>
                    <th className="p-3">DEF</th>
                    <th className="p-3">Energy</th>
                    <th className="p-3">Crit Rate</th>
                    <th className="p-3">Crit DMG</th>
                    <th className="p-3">Healing</th>
                    <th className="p-3">Element</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {STAT_LEVELS.map((lvl, rIdx) => {
                    const row = character.stats?.rows?.[rIdx] || ['0', '0', '0', '100', '5%', '150%', '0%', '0%']
                    return (
                      <tr key={lvl} className="hover:bg-white/[0.02]">
                        <td className="p-2.5 font-bold font-mono text-cyan-400">Lv. {lvl}</td>
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((colIdx) => (
                          <td key={colIdx} className="p-1.5">
                            <input
                              type="text"
                              value={row[colIdx] || ''}
                              onChange={(e) => {
                                const newRows = [...(character.stats?.rows || [])]
                                if (!newRows[rIdx]) newRows[rIdx] = [...row]
                                newRows[rIdx][colIdx] = e.target.value
                                setCharacter({
                                  ...character,
                                  stats: {
                                    levels: STAT_LEVELS,
                                    keys: ['hp', 'atk', 'def', 'energy', 'critRate', 'critDmg', 'healing', 'element', 'tuneBreak', 'offTune'],
                                    rows: newRows
                                  }
                                })
                              }}
                              className="w-20 px-2 py-1 rounded bg-zinc-900 border border-white/10 text-white font-mono text-center focus:border-cyan-500/50 outline-none text-xs"
                            />
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: SKILLS / TALENTS (السكلات والقدرات)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'skills' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                قائمة السكلات والقدرات
              </h2>

              <button
                type="button"
                onClick={() => {
                  const skills = [...(character.skills || [])]
                  skills.push({ category: 'مهارة جديدة', name: 'اسم المهارة', icon: '', description: 'شرح المهارة' })
                  setCharacter({ ...character, skills })
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 text-xs font-bold transition flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة سكل جديد
              </button>
            </div>

            <div className="space-y-4">
              {(character.skills || []).map((t, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={t.category || ''}
                        onChange={(e) => {
                          const skills = [...(character.skills || [])]
                          skills[idx].category = e.target.value
                          setCharacter({ ...character, skills })
                        }}
                        placeholder="تصنيف السكل (مثال: الهجوم الأساسي / سكل الرنين)"
                        className="w-48 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-cyan-300 text-xs font-bold"
                      />
                      <input
                        type="text"
                        value={t.name || ''}
                        onChange={(e) => {
                          const skills = [...(character.skills || [])]
                          skills[idx].name = e.target.value
                          setCharacter({ ...character, skills })
                        }}
                        placeholder="اسم المهارة"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const skills = (character.skills || []).filter((_, i) => i !== idx)
                        setCharacter({ ...character, skills })
                      }}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <ImageUploadField
                      label="أيقونة المهارة (Skill Icon)"
                      value={t.icon || ''}
                      onChange={(url) => {
                        const skills = [...(character.skills || [])]
                        skills[idx].icon = url
                        setCharacter({ ...character, skills })
                      }}
                      folder="skills"
                      type="icon"
                      placeholder="/images/skills/..."
                      helperText="اختر أيقونة المهارة من جهازك"
                    />
                  </div>

                  <textarea
                    rows={3}
                    value={t.description || ''}
                    onChange={(e) => {
                      const skills = [...(character.skills || [])]
                      skills[idx].description = e.target.value
                      setCharacter({ ...character, skills })
                    }}
                    placeholder="شرح المهارة وتأثيرها..."
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-slate-300 text-xs leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: SEQUENCES S1 - S6 (السيكوينسات)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'sequences' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
              <Star className="w-4 h-4 text-amber-400" />
              سيكوينسات الشخصية (S1 - S6)
            </h2>

            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map((nodeNum) => {
                const seq = (character.sequences || []).find(s => s.node === nodeNum) || {
                  node: nodeNum,
                  name: `سيكوينس S${nodeNum}`,
                  description: '',
                  priorityStars: 5
                }
                return (
                  <div key={nodeNum} className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center font-mono">
                          S{nodeNum}
                        </span>
                        <input
                          type="text"
                          value={seq.name}
                          onChange={(e) => {
                            const sequences = [...(character.sequences || [])]
                            const sIdx = sequences.findIndex(s => s.node === nodeNum)
                            if (sIdx >= 0) sequences[sIdx].name = e.target.value
                            else sequences.push({ ...seq, name: e.target.value })
                            setCharacter({ ...character, sequences })
                          }}
                          placeholder={`اسم السيكوينس S${nodeNum}`}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs font-bold"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">الأولوية:</span>
                        <select
                          value={seq.priorityStars || 5}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            const sequences = [...(character.sequences || [])]
                            const sIdx = sequences.findIndex(s => s.node === nodeNum)
                            if (sIdx >= 0) sequences[sIdx].priorityStars = val
                            else sequences.push({ ...seq, priorityStars: val })
                            setCharacter({ ...character, sequences })
                          }}
                          className="px-2 py-1 rounded bg-zinc-900 border border-white/10 text-amber-300 text-xs font-bold"
                        >
                          {[5, 4, 3, 2, 1].map(st => (
                            <option key={st} value={st}>{st} نجوم</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <ImageUploadField
                        label={`أيقونة السيكوينس S${nodeNum}`}
                        value={seq.icon || ''}
                        onChange={(url) => {
                          const sequences = [...(character.sequences || [])]
                          const sIdx = sequences.findIndex(s => s.node === nodeNum)
                          if (sIdx >= 0) sequences[sIdx].icon = url
                          else sequences.push({ ...seq, icon: url })
                          setCharacter({ ...character, sequences })
                        }}
                        folder="sequences"
                        type="icon"
                        placeholder="/images/sequences/..."
                        helperText="اختر أيقونة السيكوينس من جهازك"
                      />
                    </div>

                    <textarea
                      rows={2}
                      value={seq.description}
                      onChange={(e) => {
                        const sequences = [...(character.sequences || [])]
                        const sIdx = sequences.findIndex(s => s.node === nodeNum)
                        if (sIdx >= 0) sequences[sIdx].description = e.target.value
                        else sequences.push({ ...seq, description: e.target.value })
                        setCharacter({ ...character, sequences })
                      }}
                      placeholder={`شرح تأثير السيكوينس S${nodeNum}...`}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-slate-300 text-xs leading-relaxed"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 5: WEAPONS DPS COMPARISON (مقارنة الأسلحة والدمج النسبي)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'weapons' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Swords className="w-4 h-4 text-cyan-400" />
                  مقارنة الأسلحة: الدمج النسبي (Weapon DPS Comparison)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  ترتيب الأسلحة حسب الدمج النسبي المئوي ومتوسط الضرر وتأثير كل سلاح.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const weapons = [...(character.weaponsDPS || [])]
                  weapons.push({
                    rank: weapons.length + 1,
                    name: 'اسم السلاح',
                    refinement: 'R1',
                    relativeDps: '100%',
                    statsText: 'ATK 500 | Crit Rate 36%',
                    avgDamage: '2,000,000',
                    echoStat: 'كوست-4 كرت دمج',
                    effect: 'شرح تأثير وباسيف السلاح...',
                    icon: '/images/weapons/150px/glint-of-clouds.webp'
                  })
                  setCharacter({ ...character, weaponsDPS: weapons })
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 text-xs font-bold transition flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة سلاح جديد
              </button>
            </div>

            <div className="space-y-4">
              {(character.weaponsDPS || []).map((w, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center justify-center font-mono">
                        #{w.rank || idx + 1}
                      </span>
                      <input
                        type="text"
                        value={w.name}
                        onChange={(e) => {
                          const weapons = [...(character.weaponsDPS || [])]
                          weapons[idx].name = e.target.value
                          setCharacter({ ...character, weaponsDPS: weapons })
                        }}
                        placeholder="اسم السلاح"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs font-bold"
                      />
                      <input
                        type="text"
                        value={w.refinement}
                        onChange={(e) => {
                          const weapons = [...(character.weaponsDPS || [])]
                          weapons[idx].refinement = e.target.value
                          setCharacter({ ...character, weaponsDPS: weapons })
                        }}
                        placeholder="R1"
                        className="w-16 px-2 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-amber-300 text-xs font-bold text-center"
                      />
                      <input
                        type="text"
                        value={w.relativeDps}
                        onChange={(e) => {
                          const weapons = [...(character.weaponsDPS || [])]
                          weapons[idx].relativeDps = e.target.value
                          setCharacter({ ...character, weaponsDPS: weapons })
                        }}
                        placeholder="120.5%"
                        className="w-24 px-2 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-cyan-400 font-mono text-xs font-bold text-center"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const weapons = (character.weaponsDPS || []).filter((_, i) => i !== idx)
                        setCharacter({ ...character, weaponsDPS: weapons })
                      }}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={w.statsText || ''}
                      onChange={(e) => {
                        const weapons = [...(character.weaponsDPS || [])]
                        weapons[idx].statsText = e.target.value
                        setCharacter({ ...character, weaponsDPS: weapons })
                      }}
                      placeholder="الإحصائيات (مثال: ATK 500 | Crit Rate 36%)"
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-slate-300 text-xs font-mono"
                    />
                    <input
                      type="text"
                      value={w.avgDamage || ''}
                      onChange={(e) => {
                        const weapons = [...(character.weaponsDPS || [])]
                        weapons[idx].avgDamage = e.target.value
                        setCharacter({ ...character, weaponsDPS: weapons })
                      }}
                      placeholder="متوسط الدمج (مثال: 2,036,984)"
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-slate-300 text-xs font-mono"
                    />
                    <input
                      type="text"
                      value={w.echoStat || ''}
                      onChange={(e) => {
                        const weapons = [...(character.weaponsDPS || [])]
                        weapons[idx].echoStat = e.target.value
                        setCharacter({ ...character, weaponsDPS: weapons })
                      }}
                      placeholder="كوست الإيكو (مثال: كوست-4 كرت دمج)"
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-slate-300 text-xs"
                    />
                  </div>

                  <div className="space-y-3">
                    {/* Weapon DB Picker */}
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-black/30 border border-white/10">
                      <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {w.icon ? (
                          <Image src={w.icon} alt={w.name} width={40} height={40} className="w-full h-full object-cover" unoptimized onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} />
                        ) : (
                          <Shield className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-slate-300 font-tajawal mb-1">{w.name || 'لم يُختر سلاح'}</div>
                        <button
                          type="button"
                          onClick={() => { setWeaponPickerIdx(idx); setWeaponPickerOpen(true) }}
                          className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                        >
                          <Shield className="w-3 h-3" /> اختر سلاحاً من قاعدة البيانات
                        </button>
                      </div>
                    </div>
                    <ImageUploadField
                      label="أو ارفع أيقونة السلاح يدوياً"
                      value={w.icon || ''}
                      onChange={(url) => {
                        const weapons = [...(character.weaponsDPS || [])]
                        weapons[idx].icon = url
                        setCharacter({ ...character, weaponsDPS: weapons })
                      }}
                      folder="weapons"
                      type="icon"
                      placeholder="/images/weapons/..."
                      helperText="رفع الأيقونة يدوياً من جهازك"
                    />
                    <textarea
                      rows={2}
                      value={w.effect || ''}
                      onChange={(e) => {
                        const weapons = [...(character.weaponsDPS || [])]
                        weapons[idx].effect = e.target.value
                        setCharacter({ ...character, weaponsDPS: weapons })
                      }}
                      placeholder="شرح تأثير السلاح (باسيف السلاح)..."
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-slate-300 text-xs leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 6: ECHOES & BUILD (الإيكوز والبيلد)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'echoes' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
              <Shield className="w-4 h-4 text-cyan-400" />
              أطقم السوناتا والإيكو الرئيسي
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Set */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                <h3 className="text-xs font-bold text-cyan-400 uppercase">طقم السوناتا الأساسي (5 قطع)</h3>
                <input
                  type="text"
                  value={character.recommendedEchoes?.primarySet?.name || ''}
                  onChange={(e) => {
                    const rec = { ...(character.recommendedEchoes || {}) }
                    rec.primarySet = {
                      name: e.target.value,
                      icon: rec.primarySet?.icon || '',
                      desc: rec.primarySet?.desc || ''
                    }
                    setCharacter({ ...character, recommendedEchoes: rec })
                  }}
                  placeholder="اسم الطقم (مثال: هارت أوف إيفلز بيرج)"
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs font-bold"
                />
                <ImageUploadField
                  label="أيقونة الطقم الأساسي"
                  value={character.recommendedEchoes?.primarySet?.icon || ''}
                  onChange={(url) => {
                    const rec = { ...(character.recommendedEchoes || {}) }
                    rec.primarySet = {
                      name: rec.primarySet?.name || '',
                      icon: url,
                      desc: rec.primarySet?.desc || ''
                    }
                    setCharacter({ ...character, recommendedEchoes: rec })
                  }}
                  folder="sonata-sets"
                  type="icon"
                  placeholder="/images/set/..."
                  helperText="اختر أيقونة الطقم من جهازك"
                />
                <textarea
                  rows={3}
                  value={character.recommendedEchoes?.primarySet?.desc || ''}
                  onChange={(e) => {
                    const rec = { ...(character.recommendedEchoes || {}) }
                    rec.primarySet = {
                      name: rec.primarySet?.name || '',
                      icon: rec.primarySet?.icon || '',
                      desc: e.target.value
                    }
                    setCharacter({ ...character, recommendedEchoes: rec })
                  }}
                  placeholder="تأثير السيت (2 قطع و 5 قطع)..."
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-slate-300 text-xs leading-relaxed"
                />
              </div>

              {/* Main Echo */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                <h3 className="text-xs font-bold text-amber-400 uppercase">الإيكو الرئيسي (Main Echo Slot)</h3>
                <input
                  type="text"
                  value={character.recommendedEchoes?.mainEcho?.name || ''}
                  onChange={(e) => {
                    const rec = { ...(character.recommendedEchoes || {}) }
                    rec.mainEcho = {
                      name: e.target.value,
                      icon: rec.mainEcho?.icon || '',
                      desc: rec.mainEcho?.desc || ''
                    }
                    setCharacter({ ...character, recommendedEchoes: rec })
                  }}
                  placeholder="اسم الإيكو الرئيسي (مثال: كالاميتي إفيجي)"
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs font-bold"
                />
                <ImageUploadField
                  label="أيقونة الإيكو الرئيسي"
                  value={character.recommendedEchoes?.mainEcho?.icon || ''}
                  onChange={(url) => {
                    const rec = { ...(character.recommendedEchoes || {}) }
                    rec.mainEcho = {
                      name: rec.mainEcho?.name || '',
                      icon: url,
                      desc: rec.mainEcho?.desc || ''
                    }
                    setCharacter({ ...character, recommendedEchoes: rec })
                  }}
                  folder="echoes"
                  type="icon"
                  placeholder="/images/echoes/..."
                  helperText="اختر أيقونة الإيكو من جهازك"
                />
                <textarea
                  rows={3}
                  value={character.recommendedEchoes?.mainEcho?.desc || ''}
                  onChange={(e) => {
                    const rec = { ...(character.recommendedEchoes || {}) }
                    rec.mainEcho = {
                      name: rec.mainEcho?.name || '',
                      icon: rec.mainEcho?.icon || '',
                      desc: e.target.value
                    }
                    setCharacter({ ...character, recommendedEchoes: rec })
                  }}
                  placeholder="شرح مهارة وبونس الإيكو الرئيسي..."
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-slate-300 text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Substats Priority */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <h3 className="text-xs font-bold text-slate-300 uppercase">أولوية السب ستات (مفصولة بفاصلة)</h3>
              <input
                type="text"
                value={(character.recommendedEchoes?.substatsPriority || []).join('، ')}
                onChange={(e) => {
                  const items = e.target.value.split(/[,،]/).map(s => s.trim()).filter(Boolean)
                  const rec = { ...(character.recommendedEchoes || {}) }
                  rec.substatsPriority = items
                  setCharacter({ ...character, recommendedEchoes: rec })
                }}
                placeholder="الكرت ريت، كرت دمج، أتاك%، إنيرجي ريجن"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-cyan-300 text-xs font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 7: MULTI-TEAMS & ROTATIONS (فرق الشخصية والتيمات والروتيشن)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  فرق وتيمات الشخصية والروتيشن (Team Comps & Rotations)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  إدارة عدة تيمات مقسمة (فريق 1، فريق 2...) مع تحديد خانات الشخصيات، أدوارها، أسلحتها، وشرح الروتيشن لكل شخصية.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const teams = [...(character.teams || [])]
                  teams.push({
                    id: `team-${Date.now()}`,
                    name: `فريق مقترح جديد (${teams.length + 1})`,
                    rank: teams.length + 1,
                    dps: '100,000',
                    dpsNote: 'ديس 3 روتيشنات',
                    members: [
                      { name: character.nameAr || character.name, role: 'مين ديس', weapon: 'السلاح المميز R1' },
                      { name: 'اسم الشريك 1', role: 'ساب ديس', weapon: 'سلاح 5 نجوم R1' },
                      { name: 'اسم الشريك 2', role: 'معالج وسبورت', weapon: 'فارييشن R5' },
                    ],
                    rotations: [
                      {
                        title: 'الروتيشن الأول',
                        steps: [
                          { characterName: 'الشخصية 1', action: 'إنترو، سكل، ألت، أوترو' },
                          { characterName: 'الشخصية 2', action: 'إنترو، سكل، هيفي، أوترو' },
                          { characterName: character.nameAr || character.name, action: 'إنترو، ألت، سكل، ماكس دمج' },
                        ]
                      }
                    ]
                  })
                  setCharacter({ ...character, teams })
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 text-xs font-bold transition flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة فريق جديد
              </button>
            </div>

            {/* Teams List */}
            <div className="space-y-8">
              {(character.teams || []).map((team, tIdx) => (
                <div key={team.id || tIdx} className="p-5 rounded-2xl bg-black/50 border border-white/10 space-y-5">
                  {/* Team Top Header */}
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center font-mono">
                        #{team.rank || tIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) => {
                          const teams = [...(character.teams || [])]
                          teams[tIdx].name = e.target.value
                          setCharacter({ ...character, teams })
                        }}
                        placeholder="عنوان الفريق (مثال: جنقران مع يونو وشوركيبر)"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm font-bold font-tajawal"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={team.dps || ''}
                        onChange={(e) => {
                          const teams = [...(character.teams || [])]
                          teams[tIdx].dps = e.target.value
                          setCharacter({ ...character, teams })
                        }}
                        placeholder="ديس التيم (مثال: 92,996)"
                        className="w-28 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-cyan-400 font-mono text-xs font-bold text-center"
                      />
                      <input
                        type="text"
                        value={team.dpsNote || ''}
                        onChange={(e) => {
                          const teams = [...(character.teams || [])]
                          teams[tIdx].dpsNote = e.target.value
                          setCharacter({ ...character, teams })
                        }}
                        placeholder="ملاحظة الديس (مثال: ديس 3 روتيشنات)"
                        className="w-32 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-slate-400 text-xs text-center"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const teams = (character.teams || []).filter((_, i) => i !== tIdx)
                          setCharacter({ ...character, teams })
                        }}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition"
                        title="حذف هذا الفريق"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 3 Character Slots */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(team.members || []).map((member, mIdx) => (
                      <div key={mIdx} className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 space-y-2">
                        <span className="text-[11px] font-bold text-cyan-400 block">الخانة #{mIdx + 1}</span>
                        {/* Character avatar + DB picker */}
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-black/40 border-2 border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                            {member.avatar ? (
                              <Image
                                src={member.avatar.endsWith('/') ? member.avatar.slice(0, -1) : member.avatar}
                                alt={member.name}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                                unoptimized
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement
                                  if (!target.dataset.fallback) {
                                    target.dataset.fallback = '1'
                                    target.src = `/images/characters/${member.slug || 'aemeath'}.webp`
                                  }
                                }}
                              />
                            ) : (
                              <Users className="w-4 h-4 text-slate-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={member.name}
                              onChange={(e) => {
                                const teams = [...(character.teams || [])]
                                teams[tIdx].members[mIdx].name = e.target.value
                                setCharacter({ ...character, teams })
                              }}
                              placeholder="اسم الشخصية"
                              className="w-full px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-white text-xs font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => { setCharPickerTarget({ tIdx, mIdx }); setCharPickerOpen(true) }}
                              className="mt-0.5 text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            >
                              <Users className="w-3 h-3" /> اختر من قاعدة البيانات
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={member.role || ''}
                            onChange={(e) => {
                              const teams = [...(character.teams || [])]
                              teams[tIdx].members[mIdx].role = e.target.value
                              setCharacter({ ...character, teams })
                            }}
                            placeholder="الدور (مين ديس/سبورت)"
                            className="px-2 py-1 rounded bg-black/40 border border-white/10 text-cyan-300 text-[11px]"
                          />
                          <input
                            type="text"
                            value={member.weapon || ''}
                            onChange={(e) => {
                              const teams = [...(character.teams || [])]
                              teams[tIdx].members[mIdx].weapon = e.target.value
                              setCharacter({ ...character, teams })
                            }}
                            placeholder="السلاح والرتبة"
                            className="px-2 py-1 rounded bg-black/40 border border-white/10 text-amber-300 text-[11px]"
                          />
                        </div>
                        <ImageUploadField
                          label="أو ارفع صورة عضو الفريق"
                          value={member.avatar || ''}
                          onChange={(url) => {
                            const teams = [...(character.teams || [])]
                            teams[tIdx].members[mIdx].avatar = url
                            setCharacter({ ...character, teams })
                          }}
                          folder="characters"
                          type="icon"
                          placeholder="/images/characters/..."
                          helperText="ارفع صورة العضو من جهازك"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Rotations Editor */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase">روتيشنات الفريق (Rotations):</span>
                      <button
                        type="button"
                        onClick={() => {
                          const teams = [...(character.teams || [])]
                          const rots = [...(teams[tIdx].rotations || [])]
                          rots.push({
                            title: `الروتيشن ${rots.length + 1}`,
                            steps: [
                              { characterName: team.members[0]?.name || 'شخصية 1', action: 'إنترو، سكل، ألت' },
                              { characterName: team.members[1]?.name || 'شخصية 2', action: 'سكل، إيكو، أوترو' },
                              { characterName: team.members[2]?.name || 'شخصية 3', action: 'ماكس دمج' },
                            ]
                          })
                          teams[tIdx].rotations = rots
                          setCharacter({ ...character, teams })
                        }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        إضافة روتيشن جديد
                      </button>
                    </div>

                    {(team.rotations || []).map((rot, rIdx) => (
                      <div key={rIdx} className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={rot.title}
                            onChange={(e) => {
                              const teams = [...(character.teams || [])]
                              teams[tIdx].rotations![rIdx].title = e.target.value
                              setCharacter({ ...character, teams })
                            }}
                            className="px-2.5 py-1 rounded bg-black/40 border border-white/10 text-amber-300 text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const teams = [...(character.teams || [])]
                              teams[tIdx].rotations = teams[tIdx].rotations!.filter((_, i) => i !== rIdx)
                              setCharacter({ ...character, teams })
                            }}
                            className="text-rose-400 hover:text-rose-300 text-xs"
                          >
                            حذف الروتيشن
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {(rot.steps || []).map((st, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={st.characterName}
                                onChange={(e) => {
                                  const teams = [...(character.teams || [])]
                                  teams[tIdx].rotations![rIdx].steps[sIdx].characterName = e.target.value
                                  setCharacter({ ...character, teams })
                                }}
                                className="w-28 px-2 py-1 rounded bg-black/40 border border-white/10 text-cyan-300 text-xs font-bold"
                              />
                              <input
                                type="text"
                                value={st.action}
                                onChange={(e) => {
                                  const teams = [...(character.teams || [])]
                                  teams[tIdx].rotations![rIdx].steps[sIdx].action = e.target.value
                                  setCharacter({ ...character, teams })
                                }}
                                placeholder="الكومبو والخطوات (مثال: إنترو، سكل، ألت، أوترو...)"
                                className="flex-1 px-2.5 py-1 rounded bg-black/40 border border-white/10 text-slate-200 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 8: CALCULATIONS & DAMAGE BREAKDOWN (الحسابات وتوزيع مصادر الدمج)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'calculations' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              توزيع مصادر الدمج (Damage Source Breakdown %)
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'الهجوم الأساسي (Basic Attack)', key: 'basic', defColor: '#9E9E9E' },
                { label: 'الهجوم الثقيل (Heavy Attack)', key: 'heavy', defColor: '#E74C3C' },
                { label: 'سكل الرنين (Resonance Skill)', key: 'skill', defColor: '#19D85C' },
                { label: 'الألت (Resonance Liberation)', key: 'liberation', defColor: '#6C5CE7' },
                { label: 'مهارة الأوترو (Outro Skill)', key: 'outro', defColor: '#FF7F0E' },
                { label: 'مهارة الإنترو (Intro Skill)', key: 'intro', defColor: '#FAF322' },
                { label: 'كسر التون (Tune Break)', key: 'tuneBreak', defColor: '#95A5A6' },
                { label: 'ضرر الإيكو (Echo Skill)', key: 'echo', defColor: '#0A8997' },
              ].map((item) => {
                const currentVal = (character.damageDistribution as any)?.[item.key] || '0'
                return (
                  <div key={item.key} className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-300 block truncate">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.defColor }} />
                      <input
                        type="text"
                        value={currentVal}
                        onChange={(e) => {
                          const dist = { ...(character.damageDistribution || {}) }
                          ;(dist as any)[item.key] = e.target.value

                          // Also sync segments array
                          const segs = [...(dist.segments || [])]
                          const segIdx = segs.findIndex(s => s.key === item.key)
                          if (segIdx >= 0) {
                            segs[segIdx].percentage = e.target.value.includes('%') ? e.target.value : `${e.target.value}%`
                          } else {
                            segs.push({
                              key: item.key,
                              label: item.label.split('(')[0].trim(),
                              percentage: e.target.value.includes('%') ? e.target.value : `${e.target.value}%`,
                              color: item.defColor
                            })
                          }
                          dist.segments = segs

                          setCharacter({ ...character, damageDistribution: dist })
                        }}
                        placeholder="0%"
                        className="w-full px-2.5 py-1 rounded bg-zinc-900 border border-white/10 text-cyan-400 font-mono text-xs font-bold"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 9: MATERIALS (مواد الترقية - 3 مجموعات كاملة)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-8">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
              <Layers className="w-4 h-4 text-cyan-400" />
              مواد التطوير والترقية (3 مجموعات متكاملة)
            </h2>

            {/* Group 1: Ascension Materials */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white font-tajawal">1. مواد تطوير الشخصية (Ascension)</h3>
                <button
                  type="button"
                  onClick={() => {
                    const mats = [...(character.ascensionMaterials || [])]
                    mats.push({ name: '', amount: '10×', icon: '' })
                    setCharacter({ ...character, ascensionMaterials: mats })
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة مادة
                </button>
              </div>

              <div className="space-y-3">
                {(character.ascensionMaterials || []).map((m, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center gap-3">
                      {/* Icon preview with click-to-upload */}
                      <label className="w-11 h-11 rounded-lg bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:border-cyan-400/50 group relative" title="اضغط لرفع صورة المادة من جهازك">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) uploadMaterialIcon(f, 'ascension', idx)
                          }}
                        />
                        {m.icon ? (
                          <Image src={m.icon} alt={m.name} width={44} height={44} className="w-full h-full object-cover" unoptimized onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} />
                        ) : (
                          <Package className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition" />
                        )}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Upload className="w-4 h-4 text-cyan-300" />
                        </div>
                      </label>
                      {/* Name & Action buttons */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <input
                          type="text"
                          value={m.name || ''}
                          onChange={(e) => {
                            const mats = [...(character.ascensionMaterials || [])]
                            mats[idx].name = e.target.value
                            setCharacter({ ...character, ascensionMaterials: mats })
                          }}
                          placeholder="اسم المادة"
                          className="w-full px-2 py-1 rounded bg-zinc-900 border border-white/10 text-white font-tajawal text-xs font-bold"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openItemPicker('ascension', idx)}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
                          >
                            <Package className="w-3 h-3" /> قاعدة البيانات
                          </button>
                          <span className="text-white/20 text-[10px]">•</span>
                          <label className="cursor-pointer text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold">
                            <Upload className="w-3 h-3" /> رفع صورة
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) uploadMaterialIcon(f, 'ascension', idx)
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      {/* Amount */}
                      <input
                        type="text"
                        value={m.amount}
                        onChange={(e) => {
                          const mats = [...(character.ascensionMaterials || [])]
                          mats[idx].amount = e.target.value
                          setCharacter({ ...character, ascensionMaterials: mats })
                        }}
                        placeholder="الكمية"
                        className="w-16 px-2 py-1.5 rounded bg-zinc-900 border border-white/10 text-white font-mono text-xs font-bold text-center"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const mats = (character.ascensionMaterials || []).filter((_, i) => i !== idx)
                          setCharacter({ ...character, ascensionMaterials: mats })
                        }}
                        className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Group 2: Skill Materials */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white font-tajawal">2. مواد السكلات المهمة</h3>
                <button
                  type="button"
                  onClick={() => {
                    const mats = [...(character.skillMaterials || [])]
                    mats.push({ name: '', amount: '25×', icon: '' })
                    setCharacter({ ...character, skillMaterials: mats })
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة مادة
                </button>
              </div>

              <div className="space-y-3">
                {(character.skillMaterials || []).map((m, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center gap-3">
                      <label className="w-11 h-11 rounded-lg bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:border-cyan-400/50 group relative" title="اضغط لرفع صورة المادة من جهازك">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) uploadMaterialIcon(f, 'skill', idx)
                          }}
                        />
                        {m.icon ? (
                          <Image src={m.icon} alt={m.name} width={44} height={44} className="w-full h-full object-cover" unoptimized onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} />
                        ) : (
                          <Package className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition" />
                        )}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Upload className="w-4 h-4 text-cyan-300" />
                        </div>
                      </label>
                      <div className="flex-1 min-w-0 space-y-1">
                        <input
                          type="text"
                          value={m.name || ''}
                          onChange={(e) => {
                            const mats = [...(character.skillMaterials || [])]
                            mats[idx].name = e.target.value
                            setCharacter({ ...character, skillMaterials: mats })
                          }}
                          placeholder="اسم المادة"
                          className="w-full px-2 py-1 rounded bg-zinc-900 border border-white/10 text-white font-tajawal text-xs font-bold"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openItemPicker('skill', idx)}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
                          >
                            <Package className="w-3 h-3" /> قاعدة البيانات
                          </button>
                          <span className="text-white/20 text-[10px]">•</span>
                          <label className="cursor-pointer text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold">
                            <Upload className="w-3 h-3" /> رفع صورة
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) uploadMaterialIcon(f, 'skill', idx)
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={m.amount}
                        onChange={(e) => {
                          const mats = [...(character.skillMaterials || [])]
                          mats[idx].amount = e.target.value
                          setCharacter({ ...character, skillMaterials: mats })
                        }}
                        placeholder="الكمية"
                        className="w-16 px-2 py-1.5 rounded bg-zinc-900 border border-white/10 text-white font-mono text-xs font-bold text-center"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const mats = (character.skillMaterials || []).filter((_, i) => i !== idx)
                          setCharacter({ ...character, skillMaterials: mats })
                        }}
                        className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Group 3: All Materials to Max */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white font-tajawal">3. كل مواد الشخصية والسكلات للماكس</h3>
                <button
                  type="button"
                  onClick={() => {
                    const mats = [...(character.allMaterials || [])]
                    mats.push({ name: '', amount: '50×', icon: '' })
                    setCharacter({ ...character, allMaterials: mats })
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة مادة
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(character.allMaterials || []).map((m, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center gap-3">
                      <label className="w-11 h-11 rounded-lg bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:border-cyan-400/50 group relative" title="اضغط لرفع صورة المادة من جهازك">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) uploadMaterialIcon(f, 'all', idx)
                          }}
                        />
                        {m.icon ? (
                          <Image src={m.icon} alt={m.name} width={44} height={44} className="w-full h-full object-cover" unoptimized onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} />
                        ) : (
                          <Package className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition" />
                        )}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Upload className="w-4 h-4 text-cyan-300" />
                        </div>
                      </label>
                      <div className="flex-1 min-w-0 space-y-1">
                        <input
                          type="text"
                          value={m.name || ''}
                          onChange={(e) => {
                            const mats = [...(character.allMaterials || [])]
                            mats[idx].name = e.target.value
                            setCharacter({ ...character, allMaterials: mats })
                          }}
                          placeholder="اسم المادة"
                          className="w-full px-2 py-1 rounded bg-zinc-900 border border-white/10 text-white font-tajawal text-xs font-bold"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openItemPicker('all', idx)}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
                          >
                            <Package className="w-3 h-3" /> قاعدة البيانات
                          </button>
                          <span className="text-white/20 text-[10px]">•</span>
                          <label className="cursor-pointer text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold">
                            <Upload className="w-3 h-3" /> رفع صورة
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) uploadMaterialIcon(f, 'all', idx)
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={m.amount}
                        onChange={(e) => {
                          const mats = [...(character.allMaterials || [])]
                          mats[idx].amount = e.target.value
                          setCharacter({ ...character, allMaterials: mats })
                        }}
                        placeholder="الكمية"
                        className="w-16 px-2 py-1.5 rounded bg-zinc-900 border border-white/10 text-white font-mono text-xs font-bold text-center"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const mats = (character.allMaterials || []).filter((_, i) => i !== idx)
                          setCharacter({ ...character, allMaterials: mats })
                        }}
                        className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 10: MEDIA & ARTWORK (الصور والوسائط)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'media' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              صورة البورتريه (Portrait Image)
            </h2>
            <ImageUploadField
              label="ملف صورة البورتريه"
              value={character.portraitPath || ''}
              onChange={(url) => setCharacter({ ...character, portraitPath: url })}
              folder="characters"
              type="portrait"
              characterId={character.id}
              aspectRatio="portrait"
              placeholder="/characters/slug.webp or https://..."
              helperText="ارفع صورة بورتريه عالية الجودة للشخصية من جهازك"
            />
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-400" />
              خلفية الشخصية (Background Banner)
            </h2>
            <ImageUploadField
              label="ملف خلفية أو بانر الشخصية"
              value={character.backgroundPath || ''}
              onChange={(url) => setCharacter({ ...character, backgroundPath: url })}
              folder="characters"
              type="background"
              characterId={character.id}
              aspectRatio="banner"
              placeholder="/characters/slug-bg.webp or https://..."
              helperText="ارفع صورة خلفية أو بانر عريض من جهازك"
            />
          </div>
        </div>
      )}



      {/* Item Picker Modal */}
      <ItemPickerModal
        open={itemPickerOpen}
        onClose={() => setItemPickerOpen(false)}
        onSelect={handleItemSelected}
        title="اختر مادة من قاعدة البيانات"
      />

      {/* Weapon Picker Modal */}
      <EntityPickerModal
        open={weaponPickerOpen}
        onClose={() => setWeaponPickerOpen(false)}
        mode="weapon"
        weaponType={character?.weaponType}
        onSelect={(item) => {
          const w = item as DbWeapon
          if (weaponPickerIdx < 0 || !character) return
          const weapons = [...(character.weaponsDPS || [])]
          weapons[weaponPickerIdx] = {
            ...weapons[weaponPickerIdx],
            name: w.nameAr || w.name,
            icon: w.iconUrl || weapons[weaponPickerIdx]?.icon,
          }
          setCharacter({ ...character, weaponsDPS: weapons })
          setWeaponPickerOpen(false)
        }}
        title="اختر سلاحاً من قاعدة البيانات"
      />

      {/* Character Picker Modal (for team members) */}
      <EntityPickerModal
        open={charPickerOpen}
        onClose={() => setCharPickerOpen(false)}
        mode="character"
        onSelect={(item) => {
          const c = item as DbCharacter
          if (!charPickerTarget || !character) return
          const { tIdx, mIdx } = charPickerTarget
          const teams = [...(character.teams || [])]
          teams[tIdx].members[mIdx] = {
            ...teams[tIdx].members[mIdx],
            name: c.nameAr || c.name,
            slug: c.slug,
            avatar: c.iconUrl || c.portraitPath || teams[tIdx].members[mIdx].avatar,
          }
          setCharacter({ ...character, teams })
          setCharPickerOpen(false)
        }}
        title="اختر شخصية من قاعدة البيانات"
      />

      {/* Delete Confirmation Modal */}
      {showDeleteCharModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 text-right">
            <h3 className="text-lg font-bold text-white">تأكيد حذف الشخصية</h3>
            <p className="text-sm text-gray-300">
              هل أنت متأكد من رغبتك في حذف الشخصية <span className="font-bold text-white">{character.name}</span>؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteCharModal(false)}
                className="px-4 py-2 rounded-xl text-gray-300 hover:bg-white/5 text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteCharacter}
                disabled={isDeletingChar}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {isDeletingChar ? 'جارٍ الحذف...' : 'حذف نهائي'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
