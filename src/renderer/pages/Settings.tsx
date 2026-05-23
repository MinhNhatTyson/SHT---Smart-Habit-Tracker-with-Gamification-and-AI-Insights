// src/renderer/pages/Settings.tsx
// User Profile + Cosmetics — edit profile, pick theme, equip title, choose avatar.
// Store-purchased themes, titles and avatars all appear here.

import { useEffect, useState } from 'react'
import { Camera, Check, Loader, User, AlertCircle, Palette, Volume2, Type } from 'lucide-react'
import { useStore } from '../store/useStore'
import { playNotes, SoundNote } from '../lib/soundEngine'

const DEMO_USER_ID = 1
const CLOUDINARY_CLOUD_NAME    = 'dhrd2odvd'
const CLOUDINARY_UPLOAD_PRESET = 'habitquest_avatars'

const GENDER_OPTIONS = [
  { value: '',          label: 'Prefer not to say' },
  { value: 'male',      label: 'Male'              },
  { value: 'female',    label: 'Female'            },
  { value: 'nonbinary', label: 'Non-binary'        },
  { value: 'other',     label: 'Other'             },
]

// Free avatars always available
const FREE_AVATARS = ['🧙','🧝','🧛','🧟','🦸','🦹','🧑','👩','👨','🐉','🦊','🐺','🦁','🐯','🐻','🦝','🦄','🐸']

type SaveState = 'idle' | 'uploading' | 'saving' | 'success' | 'error'

const api = (window as any).api

async function uploadToCloudinary(dataUri: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', dataUri)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  formData.append('folder', 'habitquest/avatars')
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message ?? `Upload failed (${res.status})`) }
  return (await res.json()).secure_url as string
}

export default function Settings() {
  const {
    user, loading, loadAll, updateProfile,
    storeItems, userPurchases,
    equipTheme, equipHabitSound, equipBadgeSound, equipTitle,
    hasPurchased, getUnlockedTitles, getUnlockedAvatars,
  } = useStore()

  // Profile form state
  const [fullName,   setFullName]   = useState('')
  const [username,   setUsername]   = useState('')
  const [gender,     setGender]     = useState('')
  const [bio,        setBio]        = useState('')
  const [avatar,     setAvatar]     = useState('🧙')
  const [avatarUrl,  setAvatarUrl]  = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saveState,  setSaveState]  = useState<SaveState>('idle')
  const [errorMsg,   setErrorMsg]   = useState('')
  const [dirty,      setDirty]      = useState(false)

  useEffect(() => { if (!user) loadAll(DEMO_USER_ID) }, [])
  useEffect(() => {
    if (!user) return
    setFullName(user.fullName ?? '')
    setUsername(user.username ?? '')
    setGender(user.gender ?? '')
    setBio(user.bio ?? '')
    setAvatar(user.avatar ?? '🧙')
    setAvatarUrl(user.avatarUrl ?? null)
    setPreviewUrl(null)
    setDirty(false)
  }, [user?.id])

  const mark = () => setDirty(true)

  const handlePickImage = async () => {
    try {
      const dataUri: string | null = await api.dialog.openImage()
      if (!dataUri) return
      setPreviewUrl(dataUri); setDirty(true)
    } catch { setErrorMsg('Could not open file picker.') }
  }

  const handleSave = async () => {
    if (!user) return
    setErrorMsg('')
    try {
      let finalAvatarUrl = avatarUrl
      if (previewUrl?.startsWith('data:')) {
        setSaveState('uploading')
        finalAvatarUrl = await uploadToCloudinary(previewUrl)
        setAvatarUrl(finalAvatarUrl); setPreviewUrl(null)
      }
      setSaveState('saving')
      await updateProfile({ fullName: fullName.trim() || null, username: username.trim() || user.username, gender: gender || null, bio: bio.trim() || null, avatar, avatarUrl: finalAvatarUrl })
      setSaveState('success'); setDirty(false)
      setTimeout(() => setSaveState('idle'), 2000)
    } catch (e: any) { setSaveState('error'); setErrorMsg(e.message ?? 'Something went wrong.') }
  }

  // ── Cosmetics data ──────────────────────────────────────────
  const unlockedAvatars = getUnlockedAvatars()
  const allAvatars      = [...FREE_AVATARS, ...unlockedAvatars.filter(a => !FREE_AVATARS.includes(a))]
  const unlockedTitles  = getUnlockedTitles()

  // Themes
  const themeItems   = storeItems.filter(s => s.category === 'theme')
  const habitSounds  = storeItems.filter(s => s.category === 'sound' && s.key.includes('habit'))
  const badgeSounds  = storeItems.filter(s => s.category === 'sound' && s.key.includes('badge'))

  // Title metadata from store
  const getTitleMeta = (titleStr: string) => {
    const item = storeItems.find(s => {
      try { return (JSON.parse(s.payload) as { title?: string }).title === titleStr }
      catch { return false }
    })
    if (!item) return { color: 'var(--muted)' }
    try { return JSON.parse(item.payload) as { title: string; color: string } }
    catch { return { color: 'var(--muted)' } }
  }

  const previewSound = (payload: string) => {
    try {
      const notes = (JSON.parse(payload) as { notes?: SoundNote[] }).notes
      if (notes) playNotes(notes).catch(() => {})
    } catch {}
  }

  const displayPhoto = previewUrl ?? avatarUrl

  if (loading || !user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--hairline)', borderTop: '3px solid var(--coral)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading profile…</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 220ms ease forwards', maxWidth: 680 }}>

      <div>
        <h1 style={{ margin: 0, color: 'var(--ink)' }}>Profile & Settings</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 14 }}>Manage your identity and personalise your experience</p>
      </div>

      {/* ── Avatar section ── */}
      <div style={{ background: 'var(--surface-dark)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius-xl)', padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 28 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: displayPhoto ? 'transparent' : 'rgba(204,120,92,0.20)', border: '3px solid rgba(204,120,92,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, overflow: 'hidden', flexShrink: 0 }}>
            {displayPhoto ? <img src={displayPhoto} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : avatar}
          </div>
          <button onClick={handlePickImage} title="Change photo" style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: '50%', background: 'var(--coral)', border: '2px solid var(--surface-dark)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Camera size={13} />
          </button>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--on-dark)', letterSpacing: '-0.03em', marginBottom: 2 }}>
            {user.fullName || user.username}
          </div>
          {user.activeTitle && (
            <div style={{ fontSize: 12, fontWeight: 700, color: getTitleMeta(user.activeTitle).color ?? 'var(--coral)', marginBottom: 6 }}>
              {user.activeTitle}
            </div>
          )}
          <div style={{ fontSize: 13, color: 'var(--on-dark-soft)', marginBottom: 16 }}>@{user.username} · Level {user.level}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handlePickImage} style={{ padding: '7px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.15)', background: 'var(--surface-dark-elevated)', color: 'var(--on-dark)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Camera size={13} /> Upload photo
            </button>
            {displayPhoto && (
              <button onClick={() => { setPreviewUrl(null); setAvatarUrl(null); setDirty(true) }} style={{ padding: '7px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.30)', background: 'transparent', color: 'var(--accent-danger)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Remove photo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Emoji avatar picker ── */}
      {!displayPhoto && (
        <div style={{ background: 'var(--canvas)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-xl)', padding: '24px 28px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={sectionLabel}>Emoji Avatar {unlockedAvatars.length > 0 && <span style={{ color: 'var(--coral)', fontWeight: 400, fontSize: 11 }}>+{unlockedAvatars.length} unlocked from store</span>}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {allAvatars.map(e => {
              const isUnlocked = !FREE_AVATARS.includes(e)
              return (
                <button key={e} onClick={() => { setAvatar(e); mark() }} style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', border: avatar === e ? '2px solid var(--coral)' : '2px solid var(--hairline)', background: avatar === e ? 'rgba(204,120,92,0.10)' : 'var(--canvas)', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all var(--transition-fast)', position: 'relative' }}>
                  {e}
                  {isUnlocked && <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: 'var(--coral)', border: '1px solid var(--canvas)' }} />}
                </button>
              )
            })}
          </div>
          {unlockedAvatars.length === 0 && (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--muted)' }}>Purchase Avatar Packs in the Store to unlock more emoji!</p>
          )}
        </div>
      )}

      {/* ── Profile title ── */}
      {unlockedTitles.length > 0 && (
        <div style={{ background: 'var(--canvas)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-xl)', padding: '24px 28px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Type size={14} color="var(--coral)" />
            <span style={sectionLabel}>Profile Title</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* No title option */}
            <button
              onClick={() => equipTitle(null)}
              style={{ padding: '7px 16px', borderRadius: 'var(--radius-full)', border: `1px solid ${!user.activeTitle ? 'var(--coral)' : 'var(--hairline)'}`, background: !user.activeTitle ? 'rgba(204,120,92,0.10)' : 'var(--canvas)', color: !user.activeTitle ? 'var(--coral)' : 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all var(--transition-fast)' }}
            >
              None
            </button>
            {unlockedTitles.map(title => {
              const meta    = getTitleMeta(title)
              const isActive = user.activeTitle === title
              return (
                <button
                  key={title}
                  onClick={() => equipTitle(title)}
                  style={{ padding: '7px 16px', borderRadius: 'var(--radius-full)', border: `1px solid ${isActive ? (meta.color ?? 'var(--coral)') : 'var(--hairline)'}`, background: isActive ? `${meta.color ?? 'var(--coral)'}15` : 'var(--canvas)', color: isActive ? (meta.color ?? 'var(--coral)') : 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: 'pointer', transition: 'all var(--transition-fast)' }}
                >
                  {title}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Theme chooser ── */}
      <div style={{ background: 'var(--canvas)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-xl)', padding: '24px 28px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Palette size={14} color="var(--coral)" />
          <span style={sectionLabel}>App Theme</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Default theme */}
          <button onClick={() => equipTheme('default')} style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: `1px solid ${user.activeTheme === 'default' ? 'var(--coral)' : 'var(--hairline)'}`, background: user.activeTheme === 'default' ? 'rgba(204,120,92,0.10)' : 'var(--canvas)', color: user.activeTheme === 'default' ? 'var(--coral)' : 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: user.activeTheme === 'default' ? 700 : 500, cursor: 'pointer', transition: 'all var(--transition-fast)', display: 'flex', alignItems: 'center', gap: 6 }}>
            ☀️ Default {user.activeTheme === 'default' && <Check size={12} />}
          </button>
          {themeItems.filter(t => hasPurchased(t.key)).map(theme => {
            const isActive = user.activeTheme === theme.key
            return (
              <button key={theme.key} onClick={() => equipTheme(theme.key)} style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: `1px solid ${isActive ? 'var(--coral)' : 'var(--hairline)'}`, background: isActive ? 'rgba(204,120,92,0.10)' : 'var(--canvas)', color: isActive ? 'var(--coral)' : 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: 'pointer', transition: 'all var(--transition-fast)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {theme.icon} {theme.name.replace('Mode', '').trim()} {isActive && <Check size={12} />}
              </button>
            )
          })}
          {themeItems.filter(t => !hasPurchased(t.key)).length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              🔒 {themeItems.filter(t => !hasPurchased(t.key)).length} more in the Store
            </span>
          )}
        </div>
      </div>

      {/* ── Sound chooser ── */}
      {(habitSounds.some(s => hasPurchased(s.key)) || badgeSounds.some(s => hasPurchased(s.key))) && (
        <div style={{ background: 'var(--canvas)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-xl)', padding: '24px 28px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Volume2 size={14} color="var(--coral)" />
            <span style={sectionLabel}>Sounds</span>
          </div>
          {/* Habit sounds */}
          {habitSounds.some(s => hasPurchased(s.key)) && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>Habit Completion Sound</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => equipHabitSound('default')} style={soundBtn(user.activeHabitSound === 'default')}>🔔 Default {user.activeHabitSound === 'default' && <Check size={11} />}</button>
                {habitSounds.filter(s => hasPurchased(s.key)).map(s => (
                  <div key={s.key} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button onClick={() => equipHabitSound(s.key)} style={soundBtn(user.activeHabitSound === s.key)}>{s.icon} {s.name.split(':')[1]?.trim()} {user.activeHabitSound === s.key && <Check size={11} />}</button>
                    <button onClick={() => previewSound(s.payload)} style={{ padding: '5px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', background: 'var(--canvas)', color: 'var(--muted)', fontSize: 10, cursor: 'pointer' }}>▶</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Badge sounds */}
          {badgeSounds.some(s => hasPurchased(s.key)) && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>Badge Earned Sound</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => equipBadgeSound('default')} style={soundBtn(user.activeBadgeSound === 'default')}>✨ Default {user.activeBadgeSound === 'default' && <Check size={11} />}</button>
                {badgeSounds.filter(s => hasPurchased(s.key)).map(s => (
                  <div key={s.key} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button onClick={() => equipBadgeSound(s.key)} style={soundBtn(user.activeBadgeSound === s.key)}>{s.icon} {s.name.split(':')[1]?.trim()} {user.activeBadgeSound === s.key && <Check size={11} />}</button>
                    <button onClick={() => previewSound(s.payload)} style={{ padding: '5px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', background: 'var(--canvas)', color: 'var(--muted)', fontSize: 10, cursor: 'pointer' }}>▶</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Personal info form ── */}
      <div style={{ background: 'var(--canvas)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-xl)', padding: '28px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={sectionLabel}>Personal Info</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Full name</label>
            <input value={fullName} onChange={e => { setFullName(e.target.value); mark() }} placeholder="e.g. Alex Johnson" maxLength={80} style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = 'var(--coral)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--hairline)')} />
          </div>
          <div>
            <label style={labelStyle}>Username</label>
            <input value={username} onChange={e => { setUsername(e.target.value); mark() }} placeholder="hero" maxLength={30} style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = 'var(--coral)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--hairline)')} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Gender</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {GENDER_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => { setGender(opt.value); mark() }} style={{ padding: '7px 16px', borderRadius: 'var(--radius-full)', border: `1px solid ${gender === opt.value ? 'var(--coral)' : 'var(--hairline)'}`, background: gender === opt.value ? 'rgba(204,120,92,0.10)' : 'var(--canvas)', color: gender === opt.value ? 'var(--coral)' : 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all var(--transition-fast)' }}>{opt.label}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Bio <span style={{ color: 'var(--muted-soft)', fontWeight: 400, marginLeft: 6 }}>(optional)</span></label>
          <textarea value={bio} onChange={e => { setBio(e.target.value); mark() }} placeholder="Tell us a little about yourself…" maxLength={160} rows={3} style={{ ...inputStyle, height: 'auto', padding: '12px 14px', resize: 'none', lineHeight: '1.6' }} onFocus={e => (e.currentTarget.style.borderColor = 'var(--coral)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--hairline)')} />
          <div style={{ fontSize: 11, color: 'var(--muted-soft)', marginTop: 4, textAlign: 'right' }}>{bio.length}/160</div>
        </div>
      </div>

      {/* ── Error ── */}
      {saveState === 'error' && errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--accent-danger)', fontSize: 13 }}>
          <AlertCircle size={15} />{errorMsg}
        </div>
      )}

      {/* ── Save ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={handleSave}
          disabled={saveState === 'uploading' || saveState === 'saving' || !dirty}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 28px', height: 44, borderRadius: 'var(--radius-md)', border: 'none', background: (!dirty || saveState === 'success') ? (saveState === 'success' ? 'var(--accent-success)' : 'var(--coral-disabled)') : 'var(--coral)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: (!dirty || saveState === 'uploading' || saveState === 'saving') ? 'not-allowed' : 'pointer', transition: 'background var(--transition-fast)' }}
        >
          {(saveState === 'uploading' || saveState === 'saving') && <Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} />}
          {saveState === 'success' && <Check size={15} />}
          {(saveState === 'idle' || saveState === 'error') && <User size={15} />}
          {saveState === 'uploading' ? 'Uploading…' : saveState === 'saving' ? 'Saving…' : saveState === 'success' ? 'Saved!' : 'Save profile'}
        </button>
        {dirty && saveState === 'idle' && <span style={{ fontSize: 13, color: 'var(--muted)' }}>You have unsaved changes</span>}
      </div>

      {/* ── Account stats ── */}
      <div style={{ background: 'var(--canvas)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-xl)', padding: '24px 28px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={sectionLabel}>Account Stats</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 4 }}>
          {[
            { label: 'Level',          value: user.level },
            { label: 'Total Points',   value: user.totalPoints.toLocaleString() },
            { label: 'Longest Streak', value: `${user.longestStreak}d` },
            { label: 'Habit Slots',    value: `${user.habitSlots ?? 5}` },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--surface-soft)', border: '1px solid var(--hairline-soft)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const sectionLabel: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 0,
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8,
}
const inputStyle: React.CSSProperties = {
  width: '100%', height: 42, padding: '0 14px',
  borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)',
  background: 'var(--canvas)', color: 'var(--ink)',
  fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
  transition: 'border-color var(--transition-fast)', boxSizing: 'border-box',
}
const soundBtn = (active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 5,
  padding: '6px 14px', borderRadius: 'var(--radius-full)',
  border: `1px solid ${active ? 'var(--coral)' : 'var(--hairline)'}`,
  background: active ? 'rgba(204,120,92,0.10)' : 'var(--canvas)',
  color: active ? 'var(--coral)' : 'var(--muted)',
  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: active ? 700 : 500,
  cursor: 'pointer', transition: 'all var(--transition-fast)',
})