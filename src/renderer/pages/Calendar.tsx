// src/renderer/pages/Calendar.tsx
// HabitQuest — Visual Calendar & Progress Page
// New: Calendar skin picker at the top (uses purchased skins from Store)

import { useEffect, useState, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalIcon, X, Palette } from 'lucide-react'
import { useStore, Habit, HabitLog } from '../store/useStore'

const DEMO_USER_ID = 1

function toLocalStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function startOfWeek(date: Date): Date {
  const d = new Date(date); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + n); return d
}
function isSameMonth(a: Date, b: Date) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() }
function isToday(d: Date) { return toLocalStr(d) === toLocalStr(new Date()) }

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_ABBR    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// ── Skin-aware heat color ─────────────────────────────────────
function heatColor(count: number, total: number, skinColors: Record<string,string>|null): { bg: string; text: string } {
  if (total===0||count===0) return { bg:'transparent', text:'var(--ink)' }
  const ratio = count/total
  if (skinColors) {
    if (ratio>=1)   return { bg: skinColors.full,  text:'var(--ink)' }
    if (ratio>=0.7) return { bg: skinColors.high,  text:'var(--ink)' }
    if (ratio>=0.4) return { bg: skinColors.mid,   text:'var(--ink)' }
    return              { bg: skinColors.low,  text:'var(--ink)' }
  }
  if (ratio>=1)   return { bg:'rgba(93,184,114,0.25)',  text:'var(--ink)' }
  if (ratio>=0.7) return { bg:'rgba(232,165,90,0.30)',  text:'var(--ink)' }
  if (ratio>=0.4) return { bg:'rgba(204,120,92,0.25)',  text:'var(--ink)' }
  return              { bg:'rgba(204,120,92,0.12)',  text:'var(--ink)' }
}

// ── Day Tooltip ───────────────────────────────────────────────
interface DayTooltipData { dateStr:string; dayLabel:string; completedHabits:Array<{icon:string;name:string;color:string}>; missedHabits:Array<{icon:string;name:string;color:string}>; rect:DOMRect }
function DayTooltip({ data, onClose }: { data: DayTooltipData; onClose: ()=>void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  return (
    <div ref={ref} style={{ position:'fixed', zIndex:100, top:data.rect.bottom+8, left:Math.max(8,Math.min(data.rect.left,window.innerWidth-280-8)), width:270, background:'var(--canvas)', border:'1px solid var(--hairline)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-lg)', padding:'18px 20px', animation:'fadeIn 150ms ease forwards' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color:'var(--ink)' }}>{data.dayLabel}</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{data.completedHabits.length} of {data.completedHabits.length+data.missedHabits.length} habits</div>
        </div>
        <button onClick={onClose} style={{ width:26, height:26, borderRadius:'var(--radius-md)', border:'1px solid var(--hairline)', background:'var(--canvas)', color:'var(--muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}><X size={12}/></button>
      </div>
      {data.completedHabits.length>0 && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--accent-success)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Done ✓</div>
          {data.completedHabits.map((h,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', borderRadius:'var(--radius-md)', background:'rgba(93,184,114,0.08)', border:'1px solid rgba(93,184,114,0.20)', marginBottom:4 }}>
              <span style={{ fontSize:14 }}>{h.icon}</span><span style={{ fontSize:12, fontWeight:500, color:'var(--ink)' }}>{h.name}</span>
              <div style={{ marginLeft:'auto', width:7, height:7, borderRadius:'50%', background:h.color }} />
            </div>
          ))}
        </div>
      )}
      {data.missedHabits.length>0 && (
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Missed</div>
          {data.missedHabits.map((h,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', borderRadius:'var(--radius-md)', background:'var(--surface-soft)', border:'1px solid var(--hairline)', marginBottom:4 }}>
              <span style={{ fontSize:14, opacity:0.5 }}>{h.icon}</span><span style={{ fontSize:12, color:'var(--muted)' }}>{h.name}</span>
            </div>
          ))}
        </div>
      )}
      {data.completedHabits.length===0 && data.missedHabits.length===0 && (
        <p style={{ fontSize:13, color:'var(--muted)', margin:0, textAlign:'center', padding:'8px 0' }}>No habits tracked yet.</p>
      )}
    </div>
  )
}

// ── Skin Picker ───────────────────────────────────────────────
function SkinPicker({ storeItems, userPurchases, activeCalSkin, onSelect }: {
  storeItems: any[]; userPurchases: any[]; activeCalSkin: string; onSelect: (key: string)=>void
}) {
  const ownedSkins = storeItems.filter(s => s.category==='calendar_skin' && userPurchases.some((p: any) => p.itemKey===s.key))
  if (ownedSkins.length===0) return null

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', background:'var(--canvas)', border:'1px solid var(--hairline)', borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-sm)' }}>
      <Palette size={14} color="var(--coral)" />
      <span style={{ fontSize:12, fontWeight:600, color:'var(--muted)', letterSpacing:'0.06em', textTransform:'uppercase' }}>Calendar Skin</span>
      <div style={{ display:'flex', gap:6, marginLeft:4 }}>
        <button onClick={() => onSelect('default')} style={{ padding:'4px 12px', borderRadius:'var(--radius-full)', border:`1px solid ${activeCalSkin==='default'?'var(--coral)':'var(--hairline)'}`, background:activeCalSkin==='default'?'rgba(204,120,92,0.10)':'var(--canvas)', color:activeCalSkin==='default'?'var(--coral)':'var(--muted)', fontSize:12, fontWeight:activeCalSkin==='default'?700:400, cursor:'pointer', transition:'all var(--transition-fast)' }}>
          Default
        </button>
        {ownedSkins.map((s: any) => {
          const key = (() => { try { return (JSON.parse(s.payload) as any).skinKey } catch { return s.key } })()
          const isActive = activeCalSkin===key || activeCalSkin===s.key
          return (
            <button key={s.key} onClick={() => onSelect(key)} style={{ padding:'4px 12px', borderRadius:'var(--radius-full)', border:`1px solid ${isActive?'var(--coral)':'var(--hairline)'}`, background:isActive?'rgba(204,120,92,0.10)':'var(--canvas)', color:isActive?'var(--coral)':'var(--muted)', fontSize:12, fontWeight:isActive?700:400, cursor:'pointer', transition:'all var(--transition-fast)', display:'flex', alignItems:'center', gap:4 }}>
              {s.icon} {s.name.split(':')[1]?.trim()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Progress bars ─────────────────────────────────────────────
function HabitProgressBars({ habits, logs, rangeStart, rangeEnd, rangeLabel, totalDays }: { habits:Habit[]; logs:HabitLog[]; rangeStart:Date; rangeEnd:Date; rangeLabel:string; totalDays:number }) {
  const progressData = useMemo(() => habits.map(habit => {
    const daysCompleted = new Set(logs.filter(l => { if(l.habitId!==habit.id) return false; const d=new Date(l.completedAt); return d>=rangeStart&&d<=rangeEnd }).map(l=>toLocalStr(new Date(l.completedAt)))).size
    const target = Math.min(totalDays, habit.frequency==='daily'?totalDays:habit.frequency==='weekdays'?Math.round(totalDays*5/7):Math.round(totalDays*(habit.targetDaysPerWeek/7)))
    const pct = target>0?Math.min(100,Math.round((daysCompleted/target)*100)):0
    return { habit, daysCompleted, target, pct }
  }), [habits, logs, rangeStart, rangeEnd, totalDays])

  if (habits.length===0) return null
  return (
    <div style={{ background:'var(--canvas)', border:'1px solid var(--hairline)', borderRadius:'var(--radius-xl)', padding:'28px 32px', boxShadow:'var(--shadow-sm)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <h2 style={{ margin:0, fontSize:'1rem', color:'var(--ink)', display:'flex', alignItems:'center', gap:7 }}><CalIcon size={15} color="var(--coral)"/>Habit Progress</h2>
        <span style={{ fontSize:12, fontWeight:600, color:'var(--muted)', background:'var(--surface-card)', border:'1px solid var(--hairline)', borderRadius:'var(--radius-full)', padding:'3px 10px' }}>{rangeLabel}</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
        {progressData.map(({ habit, daysCompleted, target, pct }) => (
          <div key={habit.id}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
              <div style={{ width:34, height:34, borderRadius:'var(--radius-md)', background:`${habit.color}18`, border:`1px solid ${habit.color}35`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{habit.icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{habit.name}</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{habit.category}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                <span style={{ fontSize:12, color:'var(--muted)' }}>{daysCompleted}/{target} days</span>
                <span style={{ fontSize:11, fontWeight:700, color:pct>=80?'var(--accent-success)':pct>=50?'var(--accent-gold)':'var(--muted)', background:pct>=80?'rgba(93,184,114,0.12)':pct>=50?'rgba(232,165,90,0.12)':'var(--surface-soft)', border:`1px solid ${pct>=80?'rgba(93,184,114,0.25)':pct>=50?'rgba(232,165,90,0.25)':'var(--hairline)'}`, borderRadius:'var(--radius-full)', padding:'2px 9px', minWidth:42, textAlign:'center' }}>{pct}%</span>
              </div>
            </div>
            <div style={{ height:8, borderRadius:'var(--radius-full)', background:'var(--surface-card)', overflow:'hidden', border:'1px solid var(--hairline-soft)' }}>
              <div style={{ height:'100%', width:`${pct}%`, borderRadius:'var(--radius-full)', background:pct>=80?'var(--accent-success)':pct>=50?`linear-gradient(90deg,${habit.color},var(--accent-gold))`:habit.color, transition:'width 0.9s cubic-bezier(0.34,1.56,0.64,1)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Monthly calendar ──────────────────────────────────────────
function MonthlyCalendar({ year, month, habits, logs, onDayClick, skinColors }: { year:number; month:number; habits:Habit[]; logs:HabitLog[]; onDayClick:(ds:string,r:DOMRect)=>void; skinColors:Record<string,string>|null }) {
  const firstDay=new Date(year,month,1); const lastDay=new Date(year,month+1,0)
  const startPad=firstDay.getDay(); const totalCells=Math.ceil((startPad+lastDay.getDate())/7)*7
  const cells: (Date|null)[] = Array.from({length:totalCells},(_,i)=>{ const d=i-startPad+1; if(d<1||d>lastDay.getDate()) return null; return new Date(year,month,d) })
  const completionMap = useMemo(()=>{ const m:Record<string,number>={};  logs.forEach(l=>{ const d=new Date(l.completedAt); if(d.getFullYear()===year&&d.getMonth()===month){ const k=toLocalStr(d); m[k]=(m[k]??0)+1 } }); return m },[logs,year,month])
  return (
    <div style={{ background:'var(--canvas)', border:'1px solid var(--hairline)', borderRadius:'var(--radius-xl)', padding:'24px 28px', boxShadow:'var(--shadow-sm)' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:8 }}>
        {DAY_ABBR.map(d=><div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:'0.06em', textTransform:'uppercase', padding:'4px 0' }}>{d}</div>)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
        {cells.map((day,idx)=>{
          if(!day) return <div key={idx}/>
          const ds=toLocalStr(day); const count=completionMap[ds]??0; const heat=heatColor(count,habits.length,skinColors); const today=isToday(day); const isFuture=day>new Date()
          return (
            <button key={idx} onClick={e=>!isFuture&&onDayClick(ds,(e.currentTarget as HTMLElement).getBoundingClientRect())} style={{ position:'relative', aspectRatio:'1', borderRadius:'var(--radius-md)', border:today?'2px solid var(--coral)':'1px solid var(--hairline)', background:isFuture?'transparent':(heat.bg||'var(--surface-soft)'), color:count>0?heat.text:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', cursor:isFuture?'default':'pointer', opacity:isFuture?0.3:1, transition:'all var(--transition-fast)', fontSize:13, fontWeight:today?800:500, gap:2 }}
              onMouseEnter={e=>{ if(!isFuture){e.currentTarget.style.borderColor='var(--coral)';e.currentTarget.style.transform='scale(1.06)'} }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=today?'var(--coral)':'var(--hairline)';e.currentTarget.style.transform='scale(1)' }}>
              <span>{day.getDate()}</span>
              {count>0&&!isFuture&&<span style={{ fontSize:9, fontWeight:700, opacity:0.8 }}>{count}/{habits.length}</span>}
            </button>
          )
        })}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:20, paddingTop:16, borderTop:'1px solid var(--hairline-soft)', fontSize:11, color:'var(--muted)' }}>
        <span>Less</span>
        {[0,0.3,0.6,1.0].map((r,i)=>{ const f=heatColor(Math.round(r*3),3,skinColors); return <div key={i} style={{ width:16, height:16, borderRadius:4, background:f.bg||'var(--surface-card)', border:'1px solid var(--hairline)' }}/> })}
        <span>More</span>
      </div>
    </div>
  )
}

// ── Weekly calendar ───────────────────────────────────────────
function WeeklyCalendar({ weekStart, habits, logs, onDayClick, skinColors }: { weekStart:Date; habits:Habit[]; logs:HabitLog[]; onDayClick:(ds:string,r:DOMRect)=>void; skinColors:Record<string,string>|null }) {
  const days = Array.from({length:7},(_,i)=>addDays(weekStart,i))
  const completionMap = useMemo(()=>{ const m:Record<string,number>={}; const we=addDays(weekStart,7); logs.forEach(l=>{ const d=new Date(l.completedAt); if(d>=weekStart&&d<we){ const k=toLocalStr(d); m[k]=(m[k]??0)+1 } }); return m },[logs,weekStart])
  return (
    <div style={{ background:'var(--canvas)', border:'1px solid var(--hairline)', borderRadius:'var(--radius-xl)', padding:'28px', boxShadow:'var(--shadow-sm)' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:12 }}>
        {days.map((day,idx)=>{
          const ds=toLocalStr(day); const count=completionMap[ds]??0; const heat=heatColor(count,habits.length,skinColors); const today=isToday(day); const isFuture=day>new Date(); const pct=habits.length>0?Math.round((count/habits.length)*100):0
          return (
            <button key={idx} onClick={e=>!isFuture&&onDayClick(ds,(e.currentTarget as HTMLElement).getBoundingClientRect())} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'20px 8px', borderRadius:'var(--radius-xl)', border:today?'2px solid var(--coral)':'1px solid var(--hairline)', background:isFuture?'var(--surface-soft)':(heat.bg||'var(--surface-soft)'), cursor:isFuture?'default':'pointer', opacity:isFuture?0.35:1, transition:'all var(--transition-fast)' }}
              onMouseEnter={e=>{ if(!isFuture) e.currentTarget.style.borderColor='var(--coral)' }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=today?'var(--coral)':'var(--hairline)' }}>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{DAY_ABBR[day.getDay()]}</span>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.6rem', color:today?'var(--coral)':'var(--ink)', letterSpacing:'-0.04em', lineHeight:1 }}>{day.getDate()}</span>
              <div style={{ position:'relative', width:44, height:44 }}>
                <svg width="44" height="44" style={{ transform:'rotate(-90deg)' }}>
                  <circle cx="22" cy="22" r="18" fill="none" stroke="var(--hairline)" strokeWidth="3"/>
                  {count>0&&<circle cx="22" cy="22" r="18" fill="none" stroke={pct>=100?'var(--accent-success)':pct>=50?'var(--accent-gold)':'var(--coral)'} strokeWidth="3" strokeDasharray={`${(pct/100)*113} 113`} strokeLinecap="round"/>}
                </svg>
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:count>0?'var(--ink)':'var(--muted)' }}>{count>0?`${count}`:'—'}</div>
              </div>
              <span style={{ fontSize:11, fontWeight:600, color:pct>=100?'var(--accent-success)':pct>=50?'var(--accent-gold)':'var(--muted)' }}>{isFuture?'':count>0?`${pct}%`:'none'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Yearly calendar ───────────────────────────────────────────
function YearlyCalendar({ year, habits, logs, onDayClick, skinColors }: { year:number; habits:Habit[]; logs:HabitLog[]; onDayClick:(ds:string,r:DOMRect)=>void; skinColors:Record<string,string>|null }) {
  const completionMap = useMemo(()=>{ const m:Record<string,number>={}; logs.forEach(l=>{ const d=new Date(l.completedAt); if(d.getFullYear()===year){ const k=toLocalStr(d); m[k]=(m[k]??0)+1 } }); return m },[logs,year])
  return (
    <div style={{ background:'var(--canvas)', border:'1px solid var(--hairline)', borderRadius:'var(--radius-xl)', padding:'28px', boxShadow:'var(--shadow-sm)' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:24 }}>
        {MONTH_NAMES.map((mn,mi)=>{
          const fd=new Date(year,mi,1); const ld=new Date(year,mi+1,0); const sp=fd.getDay(); const tc=Math.ceil((sp+ld.getDate())/7)*7
          const cells:(Date|null)[] = Array.from({length:tc},(_,i)=>{ const d=i-sp+1; if(d<1||d>ld.getDate()) return null; return new Date(year,mi,d) })
          return (
            <div key={mi}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{mn}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:3 }}>
                {['S','M','T','W','T','F','S'].map((d,i)=><div key={i} style={{ textAlign:'center', fontSize:9, color:'var(--muted-soft)', fontWeight:600 }}>{d}</div>)}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
                {cells.map((day,idx)=>{
                  if(!day) return <div key={idx} style={{ aspectRatio:'1' }}/>
                  const ds=toLocalStr(day); const count=completionMap[ds]??0; const heat=heatColor(count,habits.length,skinColors); const today=isToday(day); const isFuture=day>new Date()
                  return <button key={idx} onClick={e=>!isFuture&&onDayClick(ds,(e.currentTarget as HTMLElement).getBoundingClientRect())} title={isFuture?'':`${mn} ${day.getDate()}: ${count} completions`} style={{ aspectRatio:'1', borderRadius:3, border:today?'1px solid var(--coral)':'none', background:isFuture?'var(--surface-soft)':(heat.bg||'var(--surface-card)'), cursor:isFuture?'default':'pointer', opacity:isFuture?0.25:1, transition:'transform var(--transition-fast)', display:'block', padding:0 }} onMouseEnter={e=>{ if(!isFuture) e.currentTarget.style.transform='scale(1.4)' }} onMouseLeave={e=>{ e.currentTarget.style.transform='scale(1)' }}/>
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:20, paddingTop:16, borderTop:'1px solid var(--hairline-soft)', fontSize:11, color:'var(--muted)' }}>
        <span>Less</span>
        {[0,0.3,0.6,1.0].map((r,i)=>{ const f=heatColor(Math.round(r*3),3,skinColors); return <div key={i} style={{ width:12, height:12, borderRadius:2, background:f.bg||'var(--surface-card)', border:'1px solid var(--hairline)' }}/> })}
        <span>More</span>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
type CalView = 'monthly'|'weekly'|'yearly'

export default function CalendarPage() {
  const { user, habits, logs, loading, loadAll, storeItems, userPurchases, activeCalSkin, equipCalSkin, getActiveSkinColors } = useStore()
  useEffect(()=>{ if(!user) loadAll(DEMO_USER_ID) },[])

  const today = new Date(); today.setHours(0,0,0,0)
  const [view,      setView]      = useState<CalView>('monthly')
  const [year,      setYear]      = useState(today.getFullYear())
  const [month,     setMonth]     = useState(today.getMonth())
  const [weekStart, setWeekStart] = useState(startOfWeek(today))
  const [tooltip,   setTooltip]   = useState<DayTooltipData|null>(null)

  const skinColors = getActiveSkinColors()

  const goPrev = () => { if(view==='monthly'){ if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1) } else if(view==='weekly') setWeekStart(d=>addDays(d,-7)); else setYear(y=>y-1) }
  const goNext = () => { if(view==='monthly'){ if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1) } else if(view==='weekly') setWeekStart(d=>addDays(d,7)); else setYear(y=>y+1) }
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setWeekStart(startOfWeek(today)) }

  const periodLabel = useMemo(()=>{
    if(view==='monthly') return `${MONTH_NAMES[month]} ${year}`
    if(view==='yearly')  return `${year}`
    const we=addDays(weekStart,6)
    return `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} – ${!isSameMonth(weekStart,we)?MONTH_NAMES[we.getMonth()]+' ':''}${we.getDate()}, ${we.getFullYear()}`
  },[view,year,month,weekStart])

  const { rangeStart, rangeEnd, rangeLabel, totalDays } = useMemo(()=>{
    if(view==='monthly'){ const s=new Date(year,month,1); const e=new Date(year,month+1,0,23,59,59); return { rangeStart:s, rangeEnd:e, rangeLabel:`${MONTH_NAMES[month]} ${year}`, totalDays:new Date(year,month+1,0).getDate() } }
    if(view==='weekly'){  const s=new Date(weekStart); const e=addDays(weekStart,6); e.setHours(23,59,59); return { rangeStart:s, rangeEnd:e, rangeLabel:`Week of ${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()}`, totalDays:7 } }
    const s=new Date(year,0,1); const e=new Date(year,11,31,23,59,59); const leap=(year%4===0&&(year%100!==0||year%400===0))
    return { rangeStart:s, rangeEnd:e, rangeLabel:`${year}`, totalDays:leap?366:365 }
  },[view,year,month,weekStart])

  const handleDayClick = (dateStr: string, rect: DOMRect) => {
    const completedIds = new Set(logs.filter(l=>toLocalStr(new Date(l.completedAt))===dateStr).map(l=>l.habitId))
    const d=new Date(dateStr+'T00:00:00')
    setTooltip({ dateStr, dayLabel:`${DAY_ABBR[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
      completedHabits: habits.filter(h=>completedIds.has(h.id)).map(h=>({icon:h.icon,name:h.name,color:h.color})),
      missedHabits:    habits.filter(h=>!completedIds.has(h.id)).map(h=>({icon:h.icon,name:h.name,color:h.color})),
      rect })
  }

  if(loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:16 }}>
      <div style={{ width:40, height:40, border:'3px solid var(--hairline)', borderTop:'3px solid var(--coral)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <p style={{ color:'var(--muted)', fontSize:14 }}>Loading calendar…</p>
    </div>
  )

  return (
    <>
      <div style={{ display:'flex', flexDirection:'column', gap:24, animation:'fadeIn 220ms ease forwards' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
          <div>
            <h1 style={{ margin:0, color:'var(--ink)' }}>Calendar</h1>
            <p style={{ margin:'6px 0 0', color:'var(--muted)', fontSize:14 }}>Your habit history at a glance</p>
          </div>
          <div style={{ display:'flex', gap:4, background:'var(--surface-card)', border:'1px solid var(--hairline)', borderRadius:'var(--radius-md)', padding:4 }}>
            {(['monthly','weekly','yearly'] as CalView[]).map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{ padding:'7px 16px', borderRadius:'var(--radius-sm)', border:'none', background:view===v?'var(--coral)':'transparent', color:view===v?'var(--on-primary)':'var(--muted)', fontFamily:'var(--font-body)', fontSize:13, fontWeight:view===v?600:400, cursor:'pointer', transition:'all var(--transition-fast)', textTransform:'capitalize' }}>{v}</button>
            ))}
          </div>
        </div>

        {/* Skin picker */}
        <SkinPicker storeItems={storeItems} userPurchases={userPurchases} activeCalSkin={activeCalSkin} onSelect={equipCalSkin} />

        {/* Nav bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--canvas)', border:'1px solid var(--hairline)', borderRadius:'var(--radius-lg)', padding:'12px 20px', boxShadow:'var(--shadow-sm)' }}>
          <button onClick={goPrev} style={{ width:36, height:36, borderRadius:'var(--radius-md)', border:'1px solid var(--hairline)', background:'var(--canvas)', color:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.borderColor='var(--coral)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--hairline)'}><ChevronLeft size={16}/></button>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.1rem', color:'var(--ink)', letterSpacing:'-0.03em' }}>{periodLabel}</span>
            <button onClick={goToday} style={{ padding:'4px 12px', borderRadius:'var(--radius-full)', border:'1px solid var(--hairline)', background:'var(--canvas)', color:'var(--muted)', fontFamily:'var(--font-body)', fontSize:12, fontWeight:500, cursor:'pointer' }} onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--coral)'; e.currentTarget.style.color='var(--coral)' }} onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--hairline)'; e.currentTarget.style.color='var(--muted)' }}>Today</button>
          </div>
          <button onClick={goNext} style={{ width:36, height:36, borderRadius:'var(--radius-md)', border:'1px solid var(--hairline)', background:'var(--canvas)', color:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.borderColor='var(--coral)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--hairline)'}><ChevronRight size={16}/></button>
        </div>

        {view==='monthly' && <MonthlyCalendar year={year} month={month} habits={habits} logs={logs} onDayClick={handleDayClick} skinColors={skinColors}/>}
        {view==='weekly'  && <WeeklyCalendar  weekStart={weekStart} habits={habits} logs={logs} onDayClick={handleDayClick} skinColors={skinColors}/>}
        {view==='yearly'  && <YearlyCalendar  year={year} habits={habits} logs={logs} onDayClick={handleDayClick} skinColors={skinColors}/>}

        <HabitProgressBars habits={habits} logs={logs} rangeStart={rangeStart} rangeEnd={rangeEnd} rangeLabel={rangeLabel} totalDays={totalDays}/>

        {habits.length===0 && (
          <div style={{ textAlign:'center', padding:'40px', background:'var(--canvas)', border:'1px dashed var(--hairline)', borderRadius:'var(--radius-xl)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
            <h3 style={{ margin:'0 0 8px', color:'var(--ink)' }}>No habits to display</h3>
            <p style={{ margin:0, color:'var(--muted)', fontSize:14 }}>Add some habits first, then come back to track your progress here.</p>
          </div>
        )}
      </div>
      {tooltip && <DayTooltip data={tooltip} onClose={()=>setTooltip(null)}/>}
    </>
  )
}