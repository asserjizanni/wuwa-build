'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Search, Edit2, Trash2, Shield, Check, X, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import ImageUploadField from '@/components/admin/ImageUploadField'

interface Weapon {
  id: string
  slug: string
  name: string
  nameAr: string | null
  weaponType: string
  stars: number
  iconUrl: string | null
  baseAtk: number | null
  secondaryStat: string | null
  secondaryStatValue: string | null
  desc: string | null
  descAr: string | null
  isPublished: boolean
}

const WEAPON_TYPES = ['SWORD', 'BROADBLADE', 'PISTOLS', 'GAUNTLETS', 'RECTIFIER']

export default function WeaponsAdminClient({ initialWeapons }: { initialWeapons: Weapon[] }) {
  const [weapons, setWeapons] = useState<Weapon[]>(initialWeapons)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingWeapon, setEditingWeapon] = useState<Weapon | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    slug: '',
    weaponType: 'SWORD',
    stars: 5,
    iconUrl: '',
    baseAtk: 587,
    secondaryStat: 'CRIT Rate',
    secondaryStatValue: '24.3%',
    desc: '',
    descAr: '',
    isPublished: true,
  })

  const openCreateModal = () => {
    setEditingWeapon(null)
    setFormData({
      name: '',
      nameAr: '',
      slug: '',
      weaponType: 'SWORD',
      stars: 5,
      iconUrl: '',
      baseAtk: 587,
      secondaryStat: 'CRIT Rate',
      secondaryStatValue: '24.3%',
      desc: '',
      descAr: '',
      isPublished: true,
    })
    setModalOpen(true)
  }

  const openEditModal = (w: Weapon) => {
    setEditingWeapon(w)
    setFormData({
      name: w.name,
      nameAr: w.nameAr || '',
      slug: w.slug,
      weaponType: w.weaponType,
      stars: w.stars,
      iconUrl: w.iconUrl || '',
      baseAtk: w.baseAtk || 500,
      secondaryStat: w.secondaryStat || '',
      secondaryStatValue: w.secondaryStatValue || '',
      desc: w.desc || '',
      descAr: w.descAr || '',
      isPublished: w.isPublished,
    })
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/admin/weapons', {
        method: editingWeapon ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: editingWeapon?.id,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'فشلت العملية')
      }

      const saved = await res.json()
      if (editingWeapon) {
        setWeapons((prev) => prev.map((w) => (w.id === saved.id ? saved : w)))
        toast.success('تم تحديث السلاح بنجاح')
      } else {
        setWeapons((prev) => [saved, ...prev])
        toast.success('تمت إضافة السلاح بنجاح')
      }
      setModalOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (w: Weapon) => {
    if (!confirm(`هل أنت متأكد من حذف السلاح "${w.nameAr || w.name}"؟`)) return

    try {
      const res = await fetch(`/api/admin/weapons?id=${w.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('فشل الحذف')

      setWeapons((prev) => prev.filter((item) => item.id !== w.id))
      toast.success('تم حذف السلاح بنجاح')
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  const filtered = weapons.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.nameAr && w.nameAr.includes(search)) ||
      w.weaponType.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو النوع..."
            className="w-full bg-[#040812] border border-white/10 rounded-xl pr-10 pl-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
        >
          <Plus className="w-4 h-4" />
          إضافة سلاح جديد
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#050913] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase font-black">
              <tr>
                <th className="py-3 px-4">السلاح</th>
                <th className="py-3 px-4">النوع</th>
                <th className="py-3 px-4">الندرة</th>
                <th className="py-3 px-4">الهجوم الأساسي</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((w) => (
                <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-xl bg-black/40 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                      {w.iconUrl ? (
                        <Image
                          src={w.iconUrl}
                          alt={w.name}
                          fill
                          className="object-contain p-1"
                          unoptimized
                        />
                      ) : (
                        <Shield className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-white block">{w.nameAr || w.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{w.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-cyan-400">{w.weaponType}</td>
                  <td className="py-3 px-4 font-bold text-amber-400">{'★'.repeat(w.stars)}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{w.baseAtk || '—'}</td>
                  <td className="py-3 px-4">
                    {w.isPublished ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <Check className="w-3 h-3" /> منشور
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
                        مسودة
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(w)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                        title="تعديل"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(w)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-xl bg-[#090e1c] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl text-right">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute left-6 top-6 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-black text-white mb-6">
              {editingWeapon ? 'تعديل بيانات السلاح' : 'إضافة سلاح جديد إلى القاعدة'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">الاسم بالإنجليزي *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#040812] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">الاسم بالعربي</label>
                  <input
                    type="text"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    className="w-full bg-[#040812] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">المعرف (Slug) *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full bg-[#040812] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">نوع السلاح</label>
                  <select
                    value={formData.weaponType}
                    onChange={(e) => setFormData({ ...formData, weaponType: e.target.value })}
                    className="w-full bg-[#040812] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {WEAPON_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">النجوم (الندرة)</label>
                  <select
                    value={formData.stars}
                    onChange={(e) => setFormData({ ...formData, stars: Number(e.target.value) })}
                    className="w-full bg-[#040812] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value={5}>5 نجوم ★★★★★</option>
                    <option value={4}>4 نجوم ★★★★</option>
                    <option value={3}>3 نجوم ★★★</option>
                  </select>
                </div>
              </div>

              <div>
                <ImageUploadField
                  label="أيقونة السلاح (Weapon Icon)"
                  value={formData.iconUrl || ''}
                  onChange={(url) => setFormData({ ...formData, iconUrl: url })}
                  folder="weapons"
                  type="icon"
                  placeholder="/images/weapons/weapon-name.webp"
                  helperText="اختر صورة السلاح من جهازك (PNG, WebP, SVG)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">الوصف بالعربي</label>
                <textarea
                  rows={3}
                  value={formData.descAr}
                  onChange={(e) => setFormData({ ...formData, descAr: e.target.value })}
                  className="w-full bg-[#040812] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pub"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="rounded bg-black border-white/10 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="pub" className="text-xs font-bold text-slate-300">
                  نشر السلاح فوراً في الموقع
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 hover:text-white text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50"
                >
                  {saving ? 'جارٍ الحفظ...' : 'حفظ السلاح'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
