'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const S: Record<string, React.CSSProperties> = {
  card: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:16, marginBottom:14 },
  lbl:  { fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:'#5A627A', display:'block', marginBottom:6 },
  badge:{ fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:20 },
  bar:  { height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden', marginTop:6 },
  muted:{ color:'#5A627A', fontSize:11 } as React.CSSProperties,
  row:  { display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' } as React.CSSProperties,
}

const BarFill = ({ pct, color }: { pct: number; color: string }) => (
  <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3 }} />
)

const Dot = ({ color }: { color: string }) => (
  <div style={{ width:7, height:7, borderRadius:'50%', background:color, flexShrink:0 }} />
)

const GaugeCircle = ({ value, color }: { value: number; color: string }) => {
  const pct = (value / 10) * 100
  const dash = (pct / 100) * 100
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16" stroke={`${color}25`} strokeWidth="5" fill="none"/>
      <circle cx="20" cy="20" r="16" stroke={color} strokeWidth="5" fill="none"
        strokeDasharray={`${dash} ${100-dash}`} strokeDashoffset="25"
        strokeLinecap="round" transform="rotate(-90 20 20)"/>
      <text x="20" y="24" fill={color} fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="monospace">{value}</text>
    </svg>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <main style={{ minHeight:'100vh', background:'#0D0F1A', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:'2px solid rgba(139,123,255,0.3)', borderTopColor:'#8B7BFF', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )

  return (
    <main style={{ minHeight:'100vh', background:'#0D0F1A', color:'#F0F2FF', fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* NAVBAR */}
      <nav style={{ height:56, borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', background:'#0D0F1A', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#0D0F1A' }}>PR</div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:'#F0F2FF' }}>PRO Reports</div>
            <div style={{ fontSize:10, color:'#5A627A' }}>Inteligencia Competitiva · AI</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(110,231,164,0.1)', border:'1px solid rgba(110,231,164,0.2)', borderRadius:20, padding:'4px 12px' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#6EE7A4' }} />
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'#6EE7A4' }}>SISTEMA ACTIVO</span>
          </div>
          <span style={{ fontSize:12, color:'#5A627A' }}>{user?.email}</span>
          <button onClick={handleLogout} style={{ fontSize:11, color:'#5A627A', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Salir →</button>
        </div>
      </nav>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 28px 60px' }}>

        {/* ZONA 1 — HEADER */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <span style={S.lbl}>DASHBOARD · INTELIGENCIA COMPETITIVA</span>
            <div style={{ fontSize:26, fontWeight:900, color:'#F0F2FF', lineHeight:1.1 }}>
              Bienvenido, <span style={{ color:'#8B7BFF' }}>Nova Studio</span>
            </div>
            <div style={{ fontSize:12, color:'#5A627A', marginTop:4 }}>Fintech · Plan Semanal · {new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#5A627A', marginBottom:5 }}>TRIAL: 5 DÍAS RESTANTES</div>
            <div style={{ width:160 }}>
              <div style={S.bar}><BarFill pct={28} color="#8B7BFF"/></div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
              <span style={S.muted}>Día 2</span><span style={S.muted}>Día 7</span>
            </div>
          </div>
        </div>

        {/* ZONA 2 — KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:14 }}>
          {[
            { label:'SEÑALES ESTA SEMANA', value:'1,240', sub:'+18% vs anterior', color:'#8B7BFF', pct:78 },
            { label:'MOVIMIENTOS', value:'14', sub:'4 críticos · 10 menores', color:'#F2C063', pct:45 },
            { label:'ALERTAS ACTIVAS', value:'3', sub:'Requieren atención hoy', color:'#FF6B6B', pct:30 },
            { label:'PRÓXIMO REPORTE', value:'Lun 07:00', sub:'En 2 días · Email + WA', color:'#6EE7A4', pct:62 },
          ].map((k,i) => (
            <div key={i} style={{...S.card, margin:0}}>
              <span style={S.lbl}>{k.label}</span>
              <div style={{ fontSize: i===3?18:26, fontWeight:900, color:k.color }}>{k.value}</div>
              <div style={S.muted}>{k.sub}</div>
              <div style={S.bar}><BarFill pct={k.pct} color={k.color}/></div>
            </div>
          ))}
        </div>

        {/* ZONA 3 — HISTOGRAMA */}
        <div style={S.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div>
              <span style={S.lbl}>ACTIVIDAD COMPETITIVA · ÚLTIMAS 8 SEMANAS</span>
              <div style={{ fontSize:13, fontWeight:700, color:'#F0F2FF' }}>Histograma de señales e intensidad</div>
            </div>
            <div style={{ display:'flex', gap:14 }}>
              {[['#8B7BFF','Señales'],['#F2C063','Movimientos'],['#FF6B6B','Alertas']].map(([c,l])=>(
                <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:c }}/>
                  <span style={S.muted}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <svg viewBox="0 0 600 140" style={{ width:'100%', height:'auto' }}>
            <defs>
              <linearGradient id="gv" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8B7BFF" stopOpacity="0.9"/><stop offset="100%" stopColor="#8B7BFF" stopOpacity="0.3"/></linearGradient>
              <linearGradient id="ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#F2C063" stopOpacity="0.9"/><stop offset="100%" stopColor="#F2C063" stopOpacity="0.3"/></linearGradient>
              <linearGradient id="gr" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.9"/><stop offset="100%" stopColor="#FF6B6B" stopOpacity="0.3"/></linearGradient>
            </defs>
            {[20,50,80,110].map(y=><line key={y} x1="40" x2="590" y1={y} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>)}
            {['1.4k','1.0k','600','200'].map((l,i)=><text key={l} x="32" y={20+i*30+3} fill="#5A627A" fontSize="8" textAnchor="end" fontFamily="monospace">{l}</text>)}
            {[
              [46,90,30],[116,75,45],[186,65,55],[256,30,90],[326,55,65],[396,70,50],[466,50,70],[536,38,82]
            ].map(([x,yv,yh],i)=>(
              <g key={i}>
                <rect x={x} y={yv} width="14" height={130-yv} fill="url(#gv)" rx="2"/>
                <rect x={x+16} y={yv+15} width="8" height={130-yv-15} fill="url(#ga)" rx="2"/>
                <rect x={x+26} y={yv+25} width="5" height={130-yv-25} fill="url(#gr)" rx="2"/>
              </g>
            ))}
            <circle cx="263" cy="28" r="4" fill="#8B7BFF" stroke="#0D0F1A" strokeWidth="2"/>
            <text x="263" y="18" fill="#8B7BFF" fontSize="7" textAnchor="middle" fontWeight="700" fontFamily="monospace">PICO</text>
            <rect x="530" y="20" width="46" height="110" fill="rgba(139,123,255,0.05)" rx="3"/>
            <text x="543" y="16" fill="#8B7BFF" fontSize="7" fontWeight="700" fontFamily="monospace">HOY</text>
            {['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8'].map((l,i)=>(
              <text key={l} x={56+i*70} y="138" fill={i===7?'#8B7BFF':'#5A627A'} fontSize="8" textAnchor="middle" fontFamily="monospace" fontWeight={i===7?'700':'400'}>{l}</text>
            ))}
          </svg>
        </div>

        {/* ZONA 4 — FEED + COMPETIDORES */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>

          {/* Feed */}
          <div style={{...S.card, margin:0}}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#F0F2FF' }}>Actividad reciente</span>
              <span style={{...S.badge, background:'rgba(139,123,255,0.15)', color:'#8B7BFF'}}>EN VIVO</span>
            </div>
            {/* Sparkline */}
            <div style={{ marginBottom:12, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:8, padding:'8px 10px' }}>
              <span style={{...S.lbl, marginBottom:4}}>INTENSIDAD DIARIA · ESTA SEMANA</span>
              <svg viewBox="0 0 240 32" style={{ width:'100%', height:'auto' }}>
                {[[4,18,12,'L'],[36,12,18,'M'],[68,20,10,'X'],[100,4,26,'J'],[132,14,16,'V'],[164,8,22,'S'],[196,2,28,'D']].map(([x,y,h,d],i)=>(
                  <g key={i}>
                    <rect x={x} y={y} width="24" height={h} fill={i===3||i===6?'#8B7BFF':`rgba(139,123,255,${i===1||i===4?0.5:0.3})`} rx="2"/>
                    <text x={Number(x)+12} y="30" fill={i===3||i===6?'#8B7BFF':'#5A627A'} fontSize="7" textAnchor="middle" fontFamily="monospace" fontWeight={i===3||i===6?'700':'400'}>{d}</text>
                  </g>
                ))}
              </svg>
            </div>
            {[
              { color:'#FF6B6B', title:'Vorten Capital bajó precios −12%', sub:'Roboadvisor Premium · hace 1h', badge:'PRECIO', bc:'rgba(255,107,107,0.12)', tc:'#FF6B6B' },
              { color:'#8B7BFF', title:'Atlas Núcleo lanzó nueva campaña', sub:'Meta Ads · hace 2h', badge:'CAMPAÑA', bc:'rgba(139,123,255,0.12)', tc:'#8B7BFF' },
              { color:'#5DD4D4', title:'Mercurio Pro contrató 3 PMs', sub:'LinkedIn · hace 4h', badge:'HIRING', bc:'rgba(93,212,212,0.12)', tc:'#5DD4D4' },
              { color:'#F2C063', title:'Línea Norte en Expansión MX', sub:'Medios tier-1 · hace 6h', badge:'MEDIOS', bc:'rgba(242,192,99,0.12)', tc:'#F2C063' },
              { color:'#6EE7A4', title:'Vorten abrió operaciones en CO', sub:'Expansión geo · hace 8h', badge:'GEO', bc:'rgba(110,231,164,0.12)', tc:'#6EE7A4' },
            ].map((item,i)=>(
              <div key={i} style={{...S.row, ...(i===4?{borderBottom:'none'}:{})}}>
                <Dot color={item.color}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#F0F2FF', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.title}</div>
                  <div style={S.muted}>{item.sub}</div>
                </div>
                <span style={{...S.badge, background:item.bc, color:item.tc, flexShrink:0}}>{item.badge}</span>
              </div>
            ))}
          </div>

          {/* Competidores con gauges */}
          <div style={{...S.card, margin:0}}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#F0F2FF' }}>Mapa de competidores</span>
              <span style={{...S.badge, background:'rgba(255,255,255,0.05)', color:'#5A627A'}}>5 activos</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { init:'VC', name:'Vorten Capital', sub:'Internacional · Roboadvisor', threat:9, color:'#FF6B6B', bg:'rgba(255,107,107,0.06)', border:'rgba(255,107,107,0.2)', label:'CRÍTICO' },
                { init:'AN', name:'Atlas Núcleo', sub:'Regional · Wealth', threat:7, color:'#F2C063', bg:'rgba(242,192,99,0.06)', border:'rgba(242,192,99,0.2)', label:'VIGILAR' },
                { init:'MP', name:'Mercurio Pro', sub:'Nacional · Trading', threat:6, color:'#8B7BFF', bg:'rgba(139,123,255,0.06)', border:'rgba(139,123,255,0.15)', label:'MEDIO' },
                { init:'LN', name:'Línea Norte', sub:'Regional · Crédito', threat:3, color:'#6EE7A4', bg:'rgba(255,255,255,0.02)', border:'rgba(255,255,255,0.06)', label:'BAJO' },
              ].map((c,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:c.bg, border:`1px solid ${c.border}`, borderRadius:10 }}>
                  <GaugeCircle value={c.threat} color={c.color}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#F0F2FF' }}>{c.name}</div>
                    <div style={S.muted}>{c.sub}</div>
                    <div style={S.bar}><BarFill pct={c.threat*10} color={c.color}/></div>
                  </div>
                  <span style={{...S.badge, background:`${c.color}20`, color:c.color}}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ZONA 5 — RADAR + TENDENCIA */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>

          {/* Radar */}
          <div style={{...S.card, margin:0}}>
            <span style={S.lbl}>COBERTURA POR ÁREA · RADAR</span>
            <div style={{ fontSize:13, fontWeight:700, color:'#F0F2FF', marginBottom:12 }}>Intensidad de monitoreo activo</div>
            <svg viewBox="0 0 300 240" style={{ width:'100%', height:'auto' }}>
  <g transform="translate(150,120)">
    {[64,43,21].map(r=><polygon key={r} points={`0,-${r} ${r*0.866},-${r*0.5} ${r*0.866},${r*0.5} 0,${r} -${r*0.866},${r*0.5} -${r*0.866},-${r*0.5}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>)}
    {[[0,-64],[55,-32],[55,32],[0,64],[-55,32],[-55,-32]].map(([x2,y2],i)=><line key={i} x1="0" y1="0" x2={x2} y2={y2} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>)}
    <polygon points="0,-58 42,-21 47,27 0,45 -38,22 -33,-19" fill="rgba(139,123,255,0.15)" stroke="#8B7BFF" strokeWidth="1.5"/>
    {[[0,-58],[42,-21],[47,27],[0,45],[-38,22],[-33,-19]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r="3" fill="#8B7BFF"/>)}
    <text x="0" y="-74" fill="#C4C9E2" fontSize="7" textAnchor="middle" fontWeight="700">Precios 90%</text>
    <text x="65" y="-28" fill="#C4C9E2" fontSize="7" textAnchor="start" fontWeight="700">Campañas 75%</text>
    <text x="65" y="44" fill="#C4C9E2" fontSize="7" textAnchor="start" fontWeight="700">Medios 85%</text>
    <text x="0" y="82" fill="#C4C9E2" fontSize="7" textAnchor="middle" fontWeight="700">Social 70%</text>
    <text x="-65" y="44" fill="#C4C9E2" fontSize="7" textAnchor="end" fontWeight="700">Lanzamientos 80%</text>
    <text x="-65" y="-28" fill="#C4C9E2" fontSize="7" textAnchor="end" fontWeight="700">Industrias 60%</text>
  </g>
</svg>
          </div>

          {/* Tendencia 30 días */}
          <div style={{...S.card, margin:0}}>
            <span style={S.lbl}>TENDENCIA · ÚLTIMOS 30 DÍAS</span>
            <div style={{ fontSize:13, fontWeight:700, color:'#F0F2FF', marginBottom:12 }}>Ritmo competitivo con eventos clave</div>
            <svg viewBox="0 0 280 160" style={{ width:'100%', height:'auto' }}>
              <defs>
                <linearGradient id="gt" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#8B7BFF" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#8B7BFF" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {[20,60,100,130].map(y=><line key={y} x1="30" x2="270" y1={y} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>)}
              <path d="M30 120 L50 110 L70 100 L90 85 L110 95 L130 60 L150 75 L170 50 L190 65 L210 40 L230 55 L250 30 L270 45 L270 130 L30 130 Z" fill="url(#gt)"/>
              <path d="M30 120 L50 110 L70 100 L90 85 L110 95 L130 60 L150 75 L170 50 L190 65 L210 40 L230 55 L250 30 L270 45" fill="none" stroke="#8B7BFF" strokeWidth="1.8"/>
              <circle cx="130" cy="60" r="4" fill="#FF6B6B" stroke="#0D0F1A" strokeWidth="2"/>
              <line x1="130" x2="130" y1="64" y2="130" stroke="#FF6B6B" strokeWidth="1" strokeDasharray="3 3" opacity="0.4"/>
              <rect x="88" y="38" width="84" height="16" fill="rgba(255,107,107,0.12)" rx="4"/>
              <text x="130" y="49" fill="#FF6B6B" fontSize="7" textAnchor="middle" fontWeight="700" fontFamily="monospace">Vorten baja precios</text>
              <circle cx="210" cy="40" r="4" fill="#F2C063" stroke="#0D0F1A" strokeWidth="2"/>
              <line x1="210" x2="210" y1="44" y2="130" stroke="#F2C063" strokeWidth="1" strokeDasharray="3 3" opacity="0.4"/>
              <rect x="168" y="18" width="84" height="16" fill="rgba(242,192,99,0.12)" rx="4"/>
              <text x="210" y="29" fill="#F2C063" fontSize="7" textAnchor="middle" fontWeight="700" fontFamily="monospace">Atlas lanza campaña</text>
              {['Día 1','Día 10','Día 20','Hoy'].map((l,i)=>(
                <text key={l} x={[30,100,170,270][i]} y="150" fill={i===3?'#8B7BFF':'#5A627A'} fontSize="7" textAnchor="middle" fontFamily="monospace" fontWeight={i===3?'700':'400'}>{l}</text>
              ))}
            </svg>
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.05)', marginTop:10, paddingTop:10, display:'flex', flexDirection:'column', gap:6 }}>
              {[
                { color:'#FF6B6B', text:'Vorten Capital bajó precios −12%', day:'Día 10' },
                { color:'#F2C063', text:'Atlas Núcleo lanzó nueva campaña', day:'Día 20' },
                { color:'#8B7BFF', text:'Mercurio Pro contrató 3 PMs clave', day:'Día 24' },
                { color:'#6EE7A4', text:'Vorten abrió operaciones en Colombia', day:'Día 28' },
              ].map((e,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:e.color, flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:'#C4C9E2', flex:1 }}>{e.text}</span>
                  <span style={{ fontSize:10, color:'#5A627A', fontFamily:'monospace', flexShrink:0 }}>{e.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ZONA 6 — PRÓXIMO REPORTE */}
        <div style={{...S.card, background:'rgba(139,123,255,0.06)', borderColor:'rgba(139,123,255,0.2)'}}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <span style={{...S.lbl, color:'#8B7BFF'}}>PRÓXIMO REPORTE · EDICIÓN 002</span>
              <div style={{ fontSize:16, fontWeight:800, color:'#F0F2FF' }}>Inteligencia Semanal · Nova Studio</div>
              <div style={{...S.muted, marginTop:3}}>Lunes 07:00 · Email + WhatsApp · 6 áreas activas</div>
              <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
                {['Precios','Campañas','Lanzamientos','Medios','Social','Industrias'].map(a=>(
                  <span key={a} style={{...S.badge, background:'rgba(139,123,255,0.15)', color:'#8B7BFF'}}>{a}</span>
                ))}
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0, paddingLeft:20 }}>
              <span style={S.lbl}>TIEMPO RESTANTE</span>
              <div style={{ fontSize:28, fontWeight:900, color:'#8B7BFF' }}>2d 14h</div>
              <div style={S.muted}>Generación automática</div>
            </div>
          </div>
        </div>

        {/* ZONA 7 — PANEL USUARIO */}
        <div style={{ background:'linear-gradient(135deg,rgba(139,123,255,0.08),rgba(93,212,212,0.04))', border:'1px solid rgba(139,123,255,0.2)', borderRadius:16, padding:'20px 22px', marginBottom:14 }}>

          {/* Usuario */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.06)', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:'#0D0F1A' }}>
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:'#F0F2FF' }}>{user?.email || 'usuario@email.com'}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
                  <span style={{...S.badge, background:'rgba(110,231,164,0.12)', color:'#6EE7A4'}}>Trial 7 días</span>
                  <span style={{ fontSize:10, color:'#5A627A' }}>· Plan Semanal</span>
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ fontSize:11, fontWeight:600, color:'#8B7BFF', background:'rgba(139,123,255,0.1)', border:'1px solid rgba(139,123,255,0.2)', borderRadius:20, padding:'6px 14px', cursor:'pointer' }}>Editar perfil</button>
              <button style={{ fontSize:11, fontWeight:600, color:'#9CA3AF', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'6px 14px', cursor:'pointer' }}>Cambiar contraseña</button>
            </div>
          </div>

          {/* Acciones principales */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
            {[
              { label:'Editar Configuración para Reportes', color:'#8B7BFF', bg:'rgba(139,123,255,0.12)', border:'rgba(139,123,255,0.3)', href:'/onboarding',
                icon:<path d="M12 20h9M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4z"/> },
              { label:'Agregar / Editar Competidores', color:'#5DD4D4', bg:'rgba(93,212,212,0.08)', border:'rgba(93,212,212,0.2)', href:'/onboarding',
                icon:<><path d="M12 5v14M5 12h14"/></> },
              { label:'Ver Reportes', color:'#F2C063', bg:'rgba(242,192,99,0.08)', border:'rgba(242,192,99,0.2)', href:'#',
                icon:<path d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/> },
              { label:'Invitar Colegas', color:'#9CA3AF', bg:'rgba(255,255,255,0.04)', border:'rgba(255,255,255,0.1)', href:'#',
                icon:<><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></> },
            ].map((a,i)=>(
              <a key={i} href={a.href} style={{ padding:'16px 14px', background:a.bg, border:`1px solid ${a.border}`, borderRadius:14, color:a.color, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'flex-start', gap:10, textDecoration:'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth="2">{a.icon}</svg>
                {a.label}
              </a>
            ))}
          </div>
        </div>

        {/* ZONA 8 — MOTORES IA */}
        <div style={{ border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'18px 20px', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#8B7BFF' }}/>
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.14em', color:'#5A627A', textTransform:'uppercase' }}>Motores IA — Automation Intelligence PRO Reports</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
            {[
              { icon:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18"/></>, title:'Inteligencia Competitiva', sub:'Precios, campañas y movimientos', color:'#8B7BFF', active:true },
              { icon:<path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/>, title:'Salud Corporativa RRHH', sub:'Clima laboral y bienestar', color:'#6EE7A4', active:false },
              { icon:<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>, title:'Radar Ciberseguridad', sub:'Vulnerabilidades y alertas', color:'#F2C063', active:false },
              { icon:<><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>, title:'Perfil Clave · Personality', sub:'Análisis de personalidad ejecutiva', color:'#5DD4D4', active:false },
            ].map((m,i)=>(
              <div key={i} style={{ padding:'14px 12px', background: m.active ? 'rgba(139,123,255,0.08)' : 'rgba(255,255,255,0.02)', border:`1px solid ${m.active ? 'rgba(139,123,255,0.25)' : 'rgba(255,255,255,0.06)'}`, borderRadius:12, opacity: m.active ? 1 : 0.5 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <div style={{ width:30, height:30, borderRadius:8, background: m.active ? `${m.color}20` : 'rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={m.active ? m.color : '#5A627A'} strokeWidth="2">{m.icon}</svg>
                  </div>
                  <span style={{...S.badge, background: m.active ? 'rgba(110,231,164,0.12)' : 'rgba(255,255,255,0.05)', color: m.active ? '#6EE7A4' : '#5A627A'}}>{m.active ? 'ACTIVO' : 'PRÓXIMO'}</span>
                </div>
                <div style={{ fontSize:11, fontWeight:700, color: m.active ? '#F0F2FF' : '#9CA3AF', marginBottom:3 }}>{m.title}</div>
                <div style={{ fontSize:10, color:'#5A627A' }}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}