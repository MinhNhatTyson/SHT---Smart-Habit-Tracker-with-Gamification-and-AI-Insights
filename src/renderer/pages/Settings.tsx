// src/renderer/pages/Settings.tsx
// User Profile page — edit fullName, username, gender, bio, avatar photo
//
// Image flow:
//   1. User clicks avatar → Electron dialog opens native file picker
//   2. Main process reads file → returns base64 data URI to renderer
//   3. Renderer uploads base64 to Cloudinary via unsigned upload API
//   4. Cloudinary returns a secure_url → saved to DB via user:update
//
// Design.md:
//   • Cream canvas page floor
//   • Dark navy panel for the avatar/photo section (product-mockup-card-dark)
//   • Coral only on primary save CTA
//   • Hairline borders, warm shadows throughout

import { useEffect, useState, useRef } from 'react'
import { Camera, Check, Loader, User, AlertCircle } from 'lucide-react'
import { useStore } from '../store/useStore'

const DEMO_USER_ID = 1

// ── Cloudinary config ─────────────────────────────────────────
// Unsigned upload — only cloud name + preset needed in the renderer.
// Never put API secret in frontend code.
const CLOUDINARY_CLOUD_NAME    = 'dhrd2odvd'
const CLOUDINARY_UPLOAD_PRESET = 'habitquest_avatars'

const GENDER_OPTIONS = [
  { value: '',         label: 'Prefer not to say' },
  { value: 'male',     label: 'Male'               },
  { value: 'female',   label: 'Female'             },
  { value: 'nonbinary',label: 'Non-binary'         },
  { value: 'other',    label: 'Other'              },
]

const AVATAR_EMOJIS = [
  '🧙','🧝','🧛','🧟','🦸','🦹','🧑','👩','👨',
  '🐉','🦊','🐺','🦁','🐯','🐻','🦝','🦄','🐸',
]

type SaveState = 'idle' | 'uploading' | 'saving' | 'success' | 'error'

const api = (window as any).api

// ─────────────────────────────────────────────────────────────
// Upload a base64 data URI to Cloudinary
// Returns the secure_url of the uploaded image
// ─────────────────────────────────────────────────────────────
async function uploadToCloudinary(dataUri: string): Promise<string> {
  const formData = new FormData()
  formData.append('file',          dataUri)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  formData.append('folder',        'habitquest/avatars')
  // Do NOT append api_key here — unsigned presets don't need it
  // and sending it actually causes Cloudinary to reject the request

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Cloudinary upload failed (${res.status})`)
  }

  const data = await res.json()
  return data.secure_url as string
}

// ─────────────────────────────────────────────────────────────
// Settings / Profile Page
// ─────────────────────────────────────────────────────────────
export default function Settings() {
  const { user, loading, loadAll, updateProfile } = useStore()

  // Form state
  const [fullName,   setFullName]   = useState('')
  const [username,   setUsername]   = useState('')
  const [gender,     setGender]     = useState('')
  const [bio,        setBio]        = useState('')
  const [avatar,     setAvatar]     = useState('🧙')
  const [avatarUrl,  setAvatarUrl]  = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null) // local preview before upload

  const [saveState,  setSaveState]  = useState<SaveState>('idle')
  const [errorMsg,   setErrorMsg]   = useState('')

  // Track whether form has unsaved changes
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!user) loadAll(DEMO_USER_ID)
  }, [])

  // Populate form when user loads
  useEffect(() => {
    if (!user) return
    setFullName(user.fullName  ?? '')
    setUsername(user.username  ?? '')
    setGender(  user.gender    ?? '')
    setBio(     user.bio       ?? '')
    setAvatar(  user.avatar    ?? '🧙')
    setAvatarUrl(user.avatarUrl ?? null)
    setPreviewUrl(null)
    setDirty(false)
  }, [user?.id])

  // ── Pick image via Electron dialog ──────────────────────────
  const handlePickImage = async () => {
    try {
      const dataUri: string | null = await api.dialog.openImage()
      if (!dataUri) return
      // Show local preview immediately
      setPreviewUrl(dataUri)
      setDirty(true)
    } catch {
      setErrorMsg('Could not open file picker.')
    }
  }

  // ── Remove avatar photo ──────────────────────────────────────
  const handleRemovePhoto = () => {
    setPreviewUrl(null)
    setAvatarUrl(null)
    setDirty(true)
  }

  // ── Save profile ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return
    setErrorMsg('')

    try {
      let finalAvatarUrl = avatarUrl

      // If user picked a new image, upload it first
      if (previewUrl && previewUrl.startsWith('data:')) {
        setSaveState('uploading')
        finalAvatarUrl = await uploadToCloudinary(previewUrl)
        setAvatarUrl(finalAvatarUrl)
        setPreviewUrl(null)
      }

      setSaveState('saving')
      await updateProfile({
        fullName:  fullName.trim()  || null,
        username:  username.trim()  || user.username,
        gender:    gender           || null,
        bio:       bio.trim()       || null,
        avatar:    avatar,
        avatarUrl: finalAvatarUrl,
      })

      setSaveState('success')
      setDirty(false)
      setTimeout(() => setSaveState('idle'), 2000)
    } catch (e: any) {
      setSaveState('error')
      setErrorMsg(e.message ?? 'Something went wrong. Please try again.')
    }
  }

  const mark = () => setDirty(true)

  // ── Loading ──────────────────────────────────────────────────
  if (loading || !user) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '60vh', flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid var(--hairline)',
          borderTop: '3px solid var(--coral)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading profile…</p>
      </div>
    )
  }

  // Determine what to show in the avatar circle
  const displayPhoto = previewUrl ?? avatarUrl

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 24,
      animation: 'fadeIn 220ms ease forwards',
      maxWidth: 680,
    }}>

      {/* ── Page header ── */}
      <div>
        <h1 style={{ margin: 0, color: 'var(--ink)' }}>Profile</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 14 }}>
          Manage your personal info and avatar
        </p>
      </div>

      {/* ── Avatar section — dark navy card ── */}
      <div style={{
        background:   'var(--surface-dark)',
        border:       '1px solid rgba(255,255,255,0.07)',
        borderRadius: 'var(--radius-xl)',
        padding:      '28px 32px',
        display:      'flex',
        alignItems:   'center',
        gap:          28,
      }}>
        {/* Avatar circle */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width:        96,
            height:       96,
            borderRadius: '50%',
            background:   displayPhoto ? 'transparent' : 'rgba(204,120,92,0.20)',
            border:       '3px solid rgba(204,120,92,0.40)',
            display:      'flex',
            alignItems:   'center',
            justifyContent:'center',
            fontSize:     44,
            overflow:     'hidden',
            flexShrink:   0,
          }}>
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt="Avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              avatar
            )}
          </div>

          {/* Camera button overlay */}
          <button
            onClick={handlePickImage}
            title="Change photo"
            style={{
              position:      'absolute',
              bottom:        0,
              right:         0,
              width:         30,
              height:        30,
              borderRadius:  '50%',
              background:    'var(--coral)',
              border:        '2px solid var(--surface-dark)',
              color:         'var(--on-primary)',
              display:       'flex',
              alignItems:    'center',
              justifyContent:'center',
              cursor:        'pointer',
              transition:    'background var(--transition-fast)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--coral-active)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--coral)')}
          >
            <Camera size={13} />
          </button>
        </div>

        {/* Avatar info + actions */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily:    'var(--font-display)',
            fontWeight:    800,
            fontSize:      '1.2rem',
            color:         'var(--on-dark)',
            letterSpacing: '-0.03em',
            marginBottom:  4,
          }}>
            {user.fullName || user.username}
          </div>
          <div style={{ fontSize: 13, color: 'var(--on-dark-soft)', marginBottom: 16 }}>
            @{user.username} · Level {user.level}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handlePickImage}
              style={{
                padding:      '7px 16px',
                borderRadius: 'var(--radius-md)',
                border:       '1px solid rgba(255,255,255,0.15)',
                background:   'var(--surface-dark-elevated)',
                color:        'var(--on-dark)',
                fontFamily:   'var(--font-body)',
                fontSize:     13, fontWeight: 500,
                cursor:       'pointer',
                display:      'flex', alignItems: 'center', gap: 6,
                transition:   'all var(--transition-fast)',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--coral)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
            >
              <Camera size={13} /> Upload photo
            </button>

            {displayPhoto && (
              <button
                onClick={handleRemovePhoto}
                style={{
                  padding:      '7px 16px',
                  borderRadius: 'var(--radius-md)',
                  border:       '1px solid rgba(239,68,68,0.30)',
                  background:   'transparent',
                  color:        'var(--accent-danger)',
                  fontFamily:   'var(--font-body)',
                  fontSize:     13, fontWeight: 500,
                  cursor:       'pointer',
                  transition:   'all var(--transition-fast)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Emoji avatar picker (when no photo) ── */}
      {!displayPhoto && (
        <div style={{
          background:   'var(--canvas)',
          border:       '1px solid var(--hairline)',
          borderRadius: 'var(--radius-xl)',
          padding:      '24px 28px',
          boxShadow:    'var(--shadow-sm)',
        }}>
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: 'var(--muted)', letterSpacing: '0.08em',
            textTransform: 'uppercase', marginBottom: 14,
          }}>
            Emoji avatar
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {AVATAR_EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => { setAvatar(e); mark() }}
                style={{
                  width:        44,
                  height:       44,
                  borderRadius: 'var(--radius-md)',
                  border:       avatar === e
                    ? '2px solid var(--coral)'
                    : '2px solid var(--hairline)',
                  background:   avatar === e ? 'rgba(204,120,92,0.10)' : 'var(--canvas)',
                  fontSize:     22,
                  cursor:       'pointer',
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent:'center',
                  transition:   'all var(--transition-fast)',
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Personal info form ── */}
      <div style={{
        background:   'var(--canvas)',
        border:       '1px solid var(--hairline)',
        borderRadius: 'var(--radius-xl)',
        padding:      '28px',
        boxShadow:    'var(--shadow-sm)',
        display:      'flex',
        flexDirection:'column',
        gap:          20,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: 'var(--muted)', letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Personal info
        </div>

        {/* Full name + Username row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Full name</label>
            <input
              value={fullName}
              onChange={e => { setFullName(e.target.value); mark() }}
              placeholder="e.g. Alex Johnson"
              maxLength={80}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--coral)')}
              onBlur={e  => (e.currentTarget.style.borderColor = 'var(--hairline)')}
            />
          </div>
          <div>
            <label style={labelStyle}>Username</label>
            <input
              value={username}
              onChange={e => { setUsername(e.target.value); mark() }}
              placeholder="hero"
              maxLength={30}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--coral)')}
              onBlur={e  => (e.currentTarget.style.borderColor = 'var(--hairline)')}
            />
          </div>
        </div>

        {/* Gender */}
        <div>
          <label style={labelStyle}>Gender</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {GENDER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setGender(opt.value); mark() }}
                style={{
                  padding:      '7px 16px',
                  borderRadius: 'var(--radius-full)',
                  border:       `1px solid ${gender === opt.value ? 'var(--coral)' : 'var(--hairline)'}`,
                  background:   gender === opt.value ? 'rgba(204,120,92,0.10)' : 'var(--canvas)',
                  color:        gender === opt.value ? 'var(--coral)' : 'var(--muted)',
                  fontFamily:   'var(--font-body)',
                  fontSize:     13, fontWeight: 500,
                  cursor:       'pointer',
                  transition:   'all var(--transition-fast)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div>
          <label style={labelStyle}>
            Bio
            <span style={{ color: 'var(--muted-soft)', fontWeight: 400, marginLeft: 6 }}>
              (optional)
            </span>
          </label>
          <textarea
            value={bio}
            onChange={e => { setBio(e.target.value); mark() }}
            placeholder="Tell us a little about yourself…"
            maxLength={160}
            rows={3}
            style={{
              ...inputStyle,
              height:     'auto',
              padding:    '12px 14px',
              resize:     'none',
              lineHeight: '1.6',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--coral)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--hairline)')}
          />
          <div style={{ fontSize: 11, color: 'var(--muted-soft)', marginTop: 4, textAlign: 'right' }}>
            {bio.length}/160
          </div>
        </div>
      </div>

      {/* ── Error message ── */}
      {saveState === 'error' && errorMsg && (
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          10,
          padding:      '12px 16px',
          borderRadius: 'var(--radius-md)',
          background:   'rgba(239,68,68,0.08)',
          border:       '1px solid rgba(239,68,68,0.25)',
          color:        'var(--accent-danger)',
          fontSize:     13,
        }}>
          <AlertCircle size={15} />
          {errorMsg}
        </div>
      )}

      {/* ── Save button ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={handleSave}
          disabled={saveState === 'uploading' || saveState === 'saving' || !dirty}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          8,
            padding:      '0 28px',
            height:       44,
            borderRadius: 'var(--radius-md)',
            border:       'none',
            background:   (!dirty || saveState === 'success')
              ? (saveState === 'success' ? 'var(--accent-success)' : 'var(--coral-disabled)')
              : 'var(--coral)',
            color:        'var(--on-primary)',
            fontFamily:   'var(--font-body)',
            fontSize:     14, fontWeight: 600,
            cursor:       (!dirty || saveState === 'uploading' || saveState === 'saving')
              ? 'not-allowed' : 'pointer',
            transition:   'background var(--transition-fast)',
            opacity:      saveState === 'uploading' || saveState === 'saving' ? 0.85 : 1,
          }}
          onMouseEnter={e => {
            if (dirty && saveState === 'idle')
              e.currentTarget.style.background = 'var(--coral-active)'
          }}
          onMouseLeave={e => {
            if (dirty && saveState === 'idle')
              e.currentTarget.style.background = 'var(--coral)'
          }}
        >
          {saveState === 'uploading' && (
            <Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
          )}
          {saveState === 'saving' && (
            <Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
          )}
          {saveState === 'success' && <Check size={15} />}
          {saveState === 'idle'  && <User size={15} />}
          {saveState === 'error' && <User size={15} />}

          {saveState === 'uploading' ? 'Uploading photo…'
            : saveState === 'saving'   ? 'Saving…'
            : saveState === 'success'  ? 'Saved!'
            : 'Save profile'}
        </button>

        {dirty && saveState === 'idle' && (
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            You have unsaved changes
          </span>
        )}
      </div>

      {/* ── Stats (read-only) ── */}
      <div style={{
        background:   'var(--canvas)',
        border:       '1px solid var(--hairline)',
        borderRadius: 'var(--radius-xl)',
        padding:      '24px 28px',
        boxShadow:    'var(--shadow-sm)',
      }}>
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: 'var(--muted)', letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 16,
        }}>
          Account stats
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Level',          value: user.level },
            { label: 'Total points',   value: user.totalPoints.toLocaleString() },
            { label: 'Longest streak', value: `${user.longestStreak} days` },
          ].map(({ label, value }) => (
            <div key={label} style={{
              padding:      '14px 16px',
              borderRadius: 'var(--radius-lg)',
              background:   'var(--surface-soft)',
              border:       '1px solid var(--hairline-soft)',
            }}>
              <div style={{
                fontFamily:    'var(--font-display)',
                fontWeight:    800,
                fontSize:      '1.4rem',
                color:         'var(--ink)',
                letterSpacing: '-0.03em',
                lineHeight:    1,
              }}>
                {value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5, fontWeight: 500 }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display:       'block',
  fontSize:      12,
  fontWeight:    600,
  color:         'var(--muted)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom:  8,
}

const inputStyle: React.CSSProperties = {
  width:        '100%',
  height:       42,
  padding:      '0 14px',
  borderRadius: 'var(--radius-md)',
  border:       '1px solid var(--hairline)',
  background:   'var(--canvas)',
  color:        'var(--ink)',
  fontFamily:   'var(--font-body)',
  fontSize:     14,
  outline:      'none',
  transition:   'border-color var(--transition-fast)',
  boxSizing:    'border-box',
}
