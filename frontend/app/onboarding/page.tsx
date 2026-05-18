'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  { id: 1, label: 'Tu empresa' },
  { id: 2, label: 'Posicionamiento' },
  { id: 3, label: 'Competidores directos' },
  { id: 4, label: 'Competidores indirectos' },
  { id: 5, label: 'Áreas a monitorear' },
  { id: 6, label: 'Frecuencia y entrega' },
  { id: 7, label: 'Confirmación y activación' },
]

const TAGS_LIB = [
  // Manufactura
  'Manufactura','Industria 4.0','Automatización','Cadena de suministro','Control de calidad',
  // Comercio / Retail
  'Retail','E-commerce','Marketplace','Omnicanal','D2C','POS',
  // Tecnología
  'SaaS B2B','SaaS B2C','Inteligencia Artificial','Ciberseguridad','Cloud','DevOps','API-first',
  // Finanzas
  'Fintech','Banking','Crédito','Pagos','Insurtech','Wealth','Roboadvisor','Web3','Trading',
  // Salud
  'Salud digital','Telemedicina','MedTech','Farmacia online','BioTech',
  // Educación
  'EdTech','E-learning','Upskilling','Educación K-12','Universidad',
  // Alimentos
  'FoodTech','Restaurantes','Agro-alimentos','Bebidas','Delivery de comida',
  // Construcción
  'PropTech','Inmobiliaria','Construcción','Infraestructura','Smart buildings',
  // Logística
  'Logística','Last-mile','Transporte','Flota','Supply chain',
  // Turismo
  'Turismo','Hospitalidad','TravelTech','Hoteles','Experiencias',
  // Servicios profesionales
  'Consultoría','Legal','Contabilidad','RR.HH.','Marketing digital',
  // Automotriz
  'Automotriz','Movilidad eléctrica','Fleet management','AutoTech',
  // Energía
  'Energía renovable','Oil & Gas','CleanTech','Utilities',
  // Telecomunicaciones
  'Telecomunicaciones','Medios digitales','Streaming','AdTech',
  // Farmacéutica
  'Farmacéutica','BioTech','Dispositivos médicos','CRO',
  // Agro
  'AgriTech','Agroindustria','Ganadería','Acuicultura',
  // Gobierno
  'GovTech','ONG','Sector público','Smart city',
  // Moda
  'Moda','Retail de lujo','Consumo masivo','Belleza',
  // Entretenimiento
  'Entretenimiento','Deportes','GameTech','eSports','Eventos',
]
const INDUSTRY_GROUPS = [
  { group: 'Marketing & Medios', options: ['Agencia de Marketing Digital','Publicidad y Medios Tradicionales','Relaciones Públicas y Comunicación','Producción de Contenido y Video','Diseño Gráfico y Branding','SEO / SEM / Performance'] },
  { group: 'Tecnología', options: ['Software y SaaS','Desarrollo Web y Apps','Inteligencia Artificial y Machine Learning','Ciberseguridad','Cloud Computing','E-commerce y Plataformas Digitales','Fintech','Edtech','Healthtech','Proptech'] },
  { group: 'Comercio & Retail', options: ['Retail y Tiendas Físicas','E-commerce y Ventas Online','Distribución y Mayoreo','Importación y Exportación','Franquicias','Comercialización de Productos y/o Servicios'] },
  { group: 'Servicios Profesionales', options: ['Consultoría de Negocios','Consultoría Legal','Contabilidad y Finanzas','Recursos Humanos y Reclutamiento','Capacitación y Desarrollo','Arquitectura y Diseño de Interiores'] },
  { group: 'Salud & Bienestar', options: ['Clínicas y Consultorios Médicos','Farmacéutica y Biotecnología','Bienestar y Fitness','Nutrición y Salud Natural','Odontología','Salud Mental y Psicología'] },
  { group: 'Educación', options: ['Educación Básica y Media','Educación Superior','Cursos Online y E-learning','Idiomas y Certificaciones','Tutorías y Clases Particulares'] },
  { group: 'Alimentos & Bebidas', options: ['Restaurantes y Cafeterías','Bares y Entretenimiento Nocturno','Catering y Eventos','Producción de Alimentos','Bebidas y Licores','Franquicias de Comida'] },
  { group: 'Manufactura & Industria', options: ['Manufactura General','Industria Automotriz','Plásticos y Empaques','Textil y Moda','Construcción y Materiales','Maquinaria e Industria Pesada','Energía y Petróleo'] },
  { group: 'Finanzas & Seguros', options: ['Banca y Servicios Financieros','Seguros','Inversiones y Fondos','Bienes Raíces e Inmobiliaria','Crédito y Financiamiento'] },
  { group: 'Turismo & Hospitalidad', options: ['Hoteles y Hospedaje','Agencias de Viaje','Turismo y Experiencias','Aerolíneas y Transporte','Renta de Autos'] },
  { group: 'Logística & Transporte', options: ['Logística y Cadena de Suministro','Transporte de Carga','Última Milla y Delivery','Almacenamiento y Bodegas'] },
  { group: 'Entretenimiento & Cultura', options: ['Entretenimiento y Eventos','Música y Artes','Deportes y Recreación','Medios de Comunicación','Videojuegos y Gaming'] },
  { group: 'Gobierno & Social', options: ['Gobierno y Sector Público','ONG y Organizaciones Sociales','Fundaciones y Filantropía'] },
]
const DIFFS_LIB = ['Precio competitivo','Alta calidad','Servicio al cliente excepcional','Entrega rápida','Atención personalizada','Innovación constante','Tecnología avanzada','Experiencia comprobada','Especialización en el sector','Soluciones a medida','Rapidez de respuesta','Confianza y reputación','Garantía y respaldo','Cobertura nacional','Cobertura internacional','Procesos eficientes','Flexibilidad operativa','Personal altamente capacitado','Cumplimiento normativo','Seguridad y protección de datos','Sustentabilidad / enfoque ecológico','Soporte postventa','Excelente relación calidad-precio','Atención 24/7','Resultados medibles']
const AREAS = [
  { id:'industries', code:'A.01', label:'Industrias a monitorear', desc:'Movimientos macro de los sectores que elegiste como foco.', meta:'12 sources', on:true },
  { id:'prices',     code:'A.02', label:'Precios de competidores', desc:'Cambios de tarifa, descuentos, paquetes y ofertas activas.', meta:'Real-time', on:true },
  { id:'campaigns',  code:'A.03', label:'Campañas de competidores', desc:'Activaciones de marketing en paid, orgánico y prensa.', meta:'Daily sweep', on:true },
  { id:'launches',   code:'A.04', label:'Lanzamientos de competidores', desc:'Productos nuevos, betas, expansiones de SKU y partnerships.', meta:'Weekly', on:true },
  { id:'hiring',     code:'A.05', label:'Hiring & talento', desc:'Contrataciones clave, equipos y señales de expansión.', meta:'Weekly', on:false },
  { id:'media',      code:'A.06', label:'Medios & prensa', desc:'Cobertura editorial, op-eds y reportajes en medios tier-1.', meta:'240 outlets', on:true },
  { id:'social',     code:'A.07', label:'Redes sociales de competidores', desc:'Engagement, sentimiento y picos virales en sus canales.', meta:'6 networks', on:true },
  { id:'geo',        code:'A.08', label:'Expansión geográfica', desc:'Aperturas, retiros y movimientos territoriales de la competencia.', meta:'Mapped', on:false },
  { id:'data',       code:'A.09', label:'Datos relevantes de industria', desc:'Indicadores, encuestas, reportes públicos y benchmarks.', meta:'Aggregated', on:false },
]
const PLANS = [
  { id:'DAILY',    label:'Diario',    tag:'PRO · DAILY',    price:29.99, priceAnnual:23.99, features:['22 reportes / mes','Alertas en tiempo real','10 competidores · 9 áreas'] },
  { id:'WEEKLY',   label:'Semanal',   tag:'PRO · WEEKLY',   price:25.00, priceAnnual:20.00, features:['4 reportes / mes + alertas','10 competidores · 9 áreas','Briefings ad-hoc'], popular:true },
  { id:'BIWEEKLY', label:'Quincenal', tag:'PRO · BIWEEKLY', price:22.00, priceAnnual:17.60, features:['2 reportes / mes','Hasta 7 competidores','6 áreas'] },
  { id:'MONTHLY',  label:'Mensual',   tag:'PRO · MONTHLY',  price:20.00, priceAnnual:16.00, features:['1 reporte / mes','Hasta 5 competidores','4 áreas'] },
]
const DAYS  = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const TIMES = ['06:00','07:00','08:00','09:00','12:00','15:00','18:00','21:00']
const COUNTRIES = ['MX','CO','PE','CL','AR','BR','ES','US','UY','EC']

const emptyCompetitor = () => ({ name:'', url:'', products:'', presence:'Nacional', threat:5, ig:'', fb:'', x:'', li:'' })
const emptyIndirect   = () => ({ id: Math.random().toString(36).slice(2), name:'', industry:'', threat:5, relevance:5 })
const emptyProduct    = () => ({ name:'', category:'', priceFrom:'', priceTo:'' })

const S: Record<string, React.CSSProperties> = {
  card:    { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'22px 20px', marginBottom:16 },
  label:   { fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'#5A627A', display:'block', marginBottom:6 },
  input:   { width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 14px', color:'#F0F2FF', fontSize:13, outline:'none', boxSizing:'border-box' as const, scrollbarWidth:'none' as const },
  section: { fontSize:13, fontWeight:700, color:'#F0F2FF', marginBottom:16, display:'flex', alignItems:'center', gap:10 },
  pill:    { fontSize:11, fontWeight:600, padding:'5px 12px', borderRadius:20, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'#9CA3AF', cursor:'pointer' },
  pillOn:  { fontSize:11, fontWeight:600, padding:'5px 12px', borderRadius:20, border:'1px solid rgba(139,123,255,0.5)', background:'rgba(139,123,255,0.15)', color:'#8B7BFF', cursor:'pointer' },
}

function SectionNum({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
      <div style={{ width:28, height:28, borderRadius:8, background:'rgba(139,123,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#8B7BFF', flexShrink:0 }}>{n}</div>
      <span style={{ fontSize:16, fontWeight:700, color:'#F0F2FF' }}>{label}</span>
    </div>
  )
}

// ──────────────────────────────────────────
// PASO 1
// ──────────────────────────────────────────
function Step1({ data, set }: any) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', color:'#8B7BFF', marginBottom:10 }}>01 / 07 · IDENTIDAD CORPORATIVA</div>
      <h1 style={{ fontSize:38, fontWeight:900, letterSpacing:'-0.03em', color:'#F0F2FF', lineHeight:1.1, marginBottom:8 }}>
        Háblanos de <span style={{ color:'#8B7BFF' }}>tu empresa</span>
      </h1>
      <p style={{ fontSize:14, color:'#9CA3AF', marginBottom:28, lineHeight:1.6 }}>Esta información ancla todos los reportes. Cuanto más preciso seas aquí, más relevante es lo que entregamos cada semana.</p>

      {/* Identidad */}
      <div style={S.card}>
        <SectionNum n="01" label="Identidad" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:14 }}>
          <div>
            <label style={S.label}>Nombre legal</label>
            <input style={S.input} value={data.companyName} onChange={e=>set('companyName',e.target.value)} placeholder="Empresa S.A. de C.V." />
          </div>
          <div>
            <label style={S.label}>Marca comercial</label>
            <input style={S.input} value={data.brand} onChange={e=>set('brand',e.target.value)} placeholder="Mi Marca" />
          </div>
          <div>
            <label style={S.label}>Sitio web</label>
            <input style={S.input} value={data.website} onChange={e=>set('website',e.target.value)} placeholder="https://tuempresa.com" />
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
          <div>
            <label style={S.label}>Industria</label>
            <select style={{...S.input, appearance:'none' as const}} value={data.industry} onChange={e=>set('industry',e.target.value)}>
              <option value="">Seleccionar industria...</option>
              {INDUSTRY_GROUPS.map(g=>(
                <optgroup key={g.group} label={`── ${g.group} ──`}>
                  {g.options.map(o=><option key={o} value={o}>{o}</option>)}
                </optgroup>
              ))}
              <option value="Otro">Otro (especificar)</option>
            </select>
{data.industry === 'Otro' && (
  <input style={{...S.input, marginTop:8}} value={data.industryCustom||''} onChange={e=>set('industryCustom',e.target.value)} placeholder="Describe el giro de tu negocio..." />
)}
          </div>
          <div>
            <label style={S.label}>Tamaño (Personal)</label>
            <div style={{ display:'flex', gap:6 }}>
              {[['1-10','1-10'],['11-50','11-50'],['51-200','51-200'],['200+','200+']].map(([v,l])=>(
                <button key={v} onClick={()=>set('companySize',v)} style={{ flex:1, padding:'9px 4px', borderRadius:8, border:'1px solid', fontSize:11, fontWeight:600, cursor:'pointer', background: data.companySize===v ? 'rgba(139,123,255,0.2)' : 'rgba(255,255,255,0.04)', borderColor: data.companySize===v ? 'rgba(139,123,255,0.5)' : 'rgba(255,255,255,0.1)', color: data.companySize===v ? '#8B7BFF' : '#9CA3AF' }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={S.label}>Mercado objetivo</label>
            <input style={S.input} value={data.targetMarket} onChange={e=>set('targetMarket',e.target.value)} placeholder="Ej: B2B mid-market LATAM" />
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:14 }}>
          <div>
            <label style={S.label}>Ciudad</label>
            <input style={S.input} value={data.ciudad||''} onChange={e=>set('ciudad',e.target.value)} placeholder="Ej: Monterrey, Ciudad de México..." />
          </div>
          <div>
            <label style={S.label}>País</label>
            <select style={{...S.input, appearance:'none' as const}} value={data.pais||'México'} onChange={e=>set('pais',e.target.value)}>
              {['México','Colombia','Argentina','Chile','Perú','Ecuador','Guatemala','Costa Rica','Panamá','República Dominicana','España','Estados Unidos','Otro'].map(p=>(
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {/* Presencia digital */}
      <div style={S.card}>
        <SectionNum n="02" label="Presencia digital" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {[['IG','ig','instagram.com/...'],['FB','fb','facebook.com/...'],['TT','tt','tiktok.com/@...'],['YT','yt','youtube.com/@...'],['LI','li','linkedin.com/co...'],['X','x','x.com/...']].map(([icon,key,ph])=>(
            <div key={key} style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'8px 12px' }}>
              <span style={{ fontSize:10, fontWeight:800, color:'#8B7BFF', width:20, flexShrink:0 }}>{icon}</span>
              <input style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'#F0F2FF', fontSize:12 }} value={data.socialMedia?.[key]||''} onChange={e=>set('socialMedia',{...data.socialMedia,[key]:e.target.value})} placeholder={ph} />
            </div>
          ))}
        </div>
      </div>

      

      {/* Catálogo */}
      <div style={S.card}>
        <SectionNum n="03" label="Catálogo y enfoque sectorial" />
        <div style={{ marginBottom:14 }}>
          <label style={S.label}>Principales productos / servicios <span style={{ color:'#5A627A', fontWeight:400 }}>separados por coma</span></label>
          <textarea style={{...S.input, minHeight:80, resize:'vertical' as const}} value={data.mainProducts} onChange={e=>set('mainProducts',e.target.value)} placeholder="Roboadvisor Norte, Fondos institucionales, Cuenta Norte Premium..." />
        </div>
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <label style={S.label}>Tags activos</label>
            <span style={{ fontSize:10, color:'#5A627A' }}>{(data.tags||[]).length}/10</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {TAGS_LIB.map(tag=>{
              const on=(data.tags||[]).includes(tag)
              return <button key={tag} onClick={()=>set('tags', on ? data.tags.filter((t:string)=>t!==tag) : data.tags?.length<10 ? [...(data.tags||[]),tag] : data.tags)} style={on?{...S.pillOn}:{...S.pill}}>{tag}{on&&' ×'}</button>
            })}
          </div>
        </div>
      </div>
    </div>
    
  )
}

// ──────────────────────────────────────────
// PASO 2
// ──────────────────────────────────────────
function Step2({ data, set }: any) {
  const products: any[] = data.products || [emptyProduct()]
  const addProduct = () => products.length < 10 && set('products',[...products, emptyProduct()])
  const removeProduct = (i:number) => set('products', products.filter((_:any,idx:number)=>idx!==i))
  const updateProduct = (i:number, field:string, val:string) => set('products', products.map((p:any,idx:number)=>idx===i?{...p,[field]:val}:p))

  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', color:'#8B7BFF', marginBottom:10 }}>02 / 07 · POSICIONAMIENTO</div>
      <h1 style={{ fontSize:38, fontWeight:900, letterSpacing:'-0.03em', color:'#F0F2FF', lineHeight:1.1, marginBottom:8 }}>
        Cómo te <span style={{ color:'#8B7BFF' }}>diferencias</span>
      </h1>
      <p style={{ fontSize:14, color:'#9CA3AF', marginBottom:28, lineHeight:1.6 }}>Tu propuesta de valor calibra cómo el motor compara mensajes, ofertas y narrativas competitivas.</p>

      {/* Diferenciadores */}
      <div style={S.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <SectionNum n="01" label="Propuesta de valor" />
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ ...S.label, marginBottom:8 }}>Propuesta de valor <span style={{ color:'#5A627A', fontWeight:400 }}>1 frase, máx 160 char.</span></label>
          <textarea style={{...S.input, minHeight:80, resize:'vertical' as const}} maxLength={160} value={data.pitch||''} onChange={e=>set('pitch',e.target.value)} placeholder="Wealth management automatizado para mid-market latinoamericano..." />
        </div>
        <label style={{ ...S.label, marginBottom:10 }}>Diferenciadores clave · {data.industry||'Tu industria'} <span style={{ color:'#5A627A', fontWeight:400 }}>auto-curado por industria</span></label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {DIFFS_LIB.map(d=>{
            const on=(data.differentiators||[]).includes(d)
            return <button key={d} onClick={()=>set('differentiators', on ? data.differentiators.filter((x:string)=>x!==d) : [...(data.differentiators||[]),d])} style={on?{...S.pillOn}:{...S.pill}}>{d}{on&&' ×'}</button>
          })}
        </div>
      </div>

      {/* Productos */}
      <div style={S.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <SectionNum n="02" label="Catálogo Clave (Productos / Servicios)" />
        </div>
        {products.map((p:any, i:number)=>(
          <div key={i} style={{ display:'grid', gridTemplateColumns:'auto 1fr 1fr 1fr auto', gap:10, alignItems:'center', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize:10, fontWeight:800, color:'#5A627A', fontFamily:'monospace' }}>P{String(i+1).padStart(2,'0')}</span>
<input style={S.input} value={p.name} onChange={e=>updateProduct(i,'name',e.target.value)} placeholder="Nombre del producto o servicio" />
<input style={S.input} value={p.category} onChange={e=>updateProduct(i,'category',e.target.value)} placeholder="Detalle" />
<div style={{ display:'flex', alignItems:'center', gap:6 }}>
  <div style={{ position:'relative', flex:1 }}>
    <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#5A627A', fontSize:13 }}>$</span>
    <input style={{...S.input, paddingLeft:22}} value={p.priceFrom||''} onChange={e=>updateProduct(i,'priceFrom',e.target.value)} placeholder="Precio Desde" />
  </div>
  <span style={{ color:'#5A627A', fontSize:12, flexShrink:0 }}>—</span>
  <div style={{ position:'relative', flex:1 }}>
    <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#5A627A', fontSize:13 }}>$</span>
    <input style={{...S.input, paddingLeft:22}} value={p.priceTo||''} onChange={e=>updateProduct(i,'priceTo',e.target.value)} placeholder="Precio Hasta" />
  </div>
</div>
            {products.length>1&&<button onClick={()=>removeProduct(i)} style={{ background:'rgba(255,107,107,0.1)', border:'1px solid rgba(255,107,107,0.2)', borderRadius:8, width:28, height:28, cursor:'pointer', color:'#FF6B6B', fontSize:14 }}>×</button>}
          </div>
        ))}
        {products.length<10&&(
          <button onClick={addProduct} style={{ display:'flex', alignItems:'center', gap:8, marginTop:12, background:'rgba(139,123,255,0.08)', border:'1px dashed rgba(139,123,255,0.3)', borderRadius:10, padding:'10px 16px', color:'#8B7BFF', fontSize:13, fontWeight:600, cursor:'pointer', width:'100%' }}>
            <span style={{ fontSize:18 }}>+</span> Añadir producto · {products.length}/10
          </button>
        )}
      </div>

      {/* Presencia */}
<div style={S.card}>
  <SectionNum n="03" label="Presencia geográfica" />
  <div style={{ display:'grid', gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 ? '1fr' : '1fr 1fr', gap:20, alignItems:'start' }}>
    
    {/* Controles izquierda */}
<div style={{ paddingTop:8 }}>
      <div style={{ marginBottom:16 }}>
        <label style={S.label}>Alcance</label>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {['Local','Regional','Nacional','Internacional'].map(v=>(
            <button key={v} onClick={()=>set('presenceScope',v)} style={{ padding:'8px 16px', borderRadius:20, border:'1px solid', fontSize:12, fontWeight:600, cursor:'pointer', background: data.presenceScope===v ? '#8B7BFF' : 'rgba(255,255,255,0.04)', borderColor: data.presenceScope===v ? '#8B7BFF' : 'rgba(255,255,255,0.1)', color: data.presenceScope===v ? '#fff' : '#9CA3AF' }}>{v}</button>
          ))}
        </div>
      </div>
      <div>
        <label style={S.label}>Países activos <span style={{ color:'#5A627A', fontWeight:400 }}>· toca para activar en el mapa</span></label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {COUNTRIES.map(c=>{
            const on=(data.countries||[]).includes(c)
            return <button key={c} onClick={()=>set('countries', on ? (data.countries||[]).filter((x:string)=>x!==c) : [...(data.countries||[]),c])} style={{ padding:'5px 10px', borderRadius:20, border:'1px solid', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all 0.2s', background: on ? 'rgba(139,123,255,0.2)' : 'rgba(255,255,255,0.04)', borderColor: on ? 'rgba(139,123,255,0.5)' : 'rgba(255,255,255,0.1)', color: on ? '#8B7BFF' : '#9CA3AF' }}>{on?`${c} ×`:c}</button>
          })}
        </div>
      </div>
    </div>

    {/* Mapa derecha */}
<div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'8px 10px 6px', position:'relative', overflow:'hidden' }}>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'#5A627A', marginBottom:2 }}>PRESENCIA · {(data.countries||[]).length} PAÍSES ACTIVOS</div>
<svg viewBox="0 0 500 260" style={{ width:'75%', height:'auto', maxHeight:150, display:'block', margin:'-6px 0 0 auto', verticalAlign:'top' }}>
        <rect width="500" height="260" fill="#0A0B14" rx="8"/>
        {/* Grid sutil */}
        {[52,104,156,208].map(y=><line key={y} x1="0" x2="500" y1={y} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>)}
        {[100,200,300,400].map(x=><line key={x} x1={x} x2={x} y1="0" y2="260" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>)}

        {/* ── NORTEAMÉRICA ── */}
        <path d="M 52 28 L 72 22 L 95 24 L 118 20 L 138 28 L 148 38 L 152 52 L 148 68 L 138 80 L 128 90 L 118 96 L 105 98 L 92 94 L 80 86 L 68 74 L 58 60 L 48 44 Z"
          fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>
        {/* Baja California */}
        <path d="M 82 98 L 78 108 L 74 122 L 76 126 L 80 120 L 84 106 L 86 98 Z"
          fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6"/>

        {/* ── CENTROAMÉRICA ── */}
        <path d="M 118 96 L 128 98 L 132 104 L 128 112 L 122 116 L 116 112 L 112 104 Z"
          fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6"/>

        {/* ── SUDAMÉRICA ── */}
        <path d="M 108 122 L 122 118 L 138 118 L 152 122 L 162 132 L 168 148 L 170 164 L 166 182 L 158 198 L 148 212 L 136 222 L 122 226 L 110 222 L 100 210 L 94 194 L 92 176 L 94 158 L 100 140 Z"
          fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>

        {/* ── GROENLANDIA ── */}
        <path d="M 148 12 L 168 8 L 182 14 L 178 26 L 162 30 L 148 24 Z"
          fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>

        {/* ── EUROPA ── */}
        <path d="M 218 28 L 232 22 L 250 20 L 264 22 L 274 30 L 278 42 L 272 54 L 260 62 L 246 66 L 232 64 L 220 56 L 212 44 Z"
          fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>
        {/* Península ibérica */}
        <path d="M 218 60 L 226 56 L 232 64 L 228 72 L 220 74 L 214 68 Z"
          fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
        {/* Escandinavia */}
        <path d="M 242 14 L 250 10 L 258 14 L 260 22 L 250 20 L 242 20 Z"
          fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>

        {/* ── ÁFRICA ── */}
        <path d="M 218 78 L 238 72 L 260 70 L 278 74 L 290 86 L 296 102 L 298 120 L 296 140 L 288 158 L 274 174 L 258 184 L 242 186 L 226 180 L 214 164 L 206 144 L 204 122 L 206 100 Z"
          fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>
        {/* Cuerno de África */}
        <path d="M 296 110 L 308 106 L 312 114 L 302 120 L 296 118 Z"
          fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>

        {/* ── ASIA ── */}
        <path d="M 288 18 L 320 12 L 360 10 L 400 14 L 430 20 L 448 32 L 452 48 L 444 64 L 428 76 L 408 84 L 380 88 L 350 86 L 320 80 L 298 68 L 284 52 L 282 36 Z"
          fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>
        {/* Península arábiga */}
        <path d="M 290 86 L 304 82 L 314 90 L 318 106 L 308 116 L 296 112 L 288 100 Z"
          fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6"/>
        {/* India */}
        <path d="M 342 88 L 358 86 L 366 96 L 364 114 L 354 126 L 340 120 L 336 104 Z"
          fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6"/>
        {/* Japón */}
        <path d="M 438 44 L 444 40 L 450 46 L 448 56 L 440 58 L 436 50 Z"
          fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
        {/* SEA / Indonesia simplificada */}
        <path d="M 390 106 L 410 102 L 424 108 L 426 118 L 412 122 L 396 118 Z"
          fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>

        {/* ── OCEANÍA ── */}
        <path d="M 400 148 L 426 142 L 450 146 L 462 158 L 460 174 L 446 184 L 424 186 L 406 178 L 396 164 Z"
          fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>
        {/* Nueva Zelanda */}
        <path d="M 462 182 L 468 178 L 472 186 L 468 192 L 462 190 Z"
          fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>

        {/* ── PUNTOS DE PAÍSES ── */}
        {[
          { code:'MX', x:96,  y:82  },
          { code:'CO', x:124, y:136 },
          { code:'PE', x:116, y:162 },
          { code:'CL', x:118, y:202 },
          { code:'AR', x:126, y:214 },
          { code:'BR', x:148, y:172 },
          { code:'ES', x:222, y:64  },
          { code:'US', x:88,  y:58  },
          { code:'UY', x:136, y:216 },
          { code:'EC', x:110, y:148 },
        ].map(p=>{
          const on=(data.countries||[]).includes(p.code)
          return (
            <g key={p.code} onClick={()=>set('countries', (data.countries||[]).includes(p.code) ? (data.countries||[]).filter((x:string)=>x!==p.code) : [...(data.countries||[]),p.code])} style={{ cursor:'pointer' }}>
              {on && <circle cx={p.x} cy={p.y} r="12" fill="rgba(139,123,255,0.12)" stroke="rgba(139,123,255,0.25)" strokeWidth="1"/>}
              <circle cx={p.x} cy={p.y} r={on?5:3} fill={on?'#8B7BFF':'rgba(255,255,255,0.18)'} stroke={on?'rgba(180,170,255,0.8)':'rgba(255,255,255,0.08)'} strokeWidth="1.5"/>
              {on && <text x={p.x} y={p.y-9} textAnchor="middle" fill="#A89BFF" fontSize="7" fontWeight="700" fontFamily="monospace">{p.code}</text>}
              {on && (
                <circle cx={p.x} cy={p.y} r="8" fill="none" stroke="rgba(139,123,255,0.4)" strokeWidth="0.8">
                  <animate attributeName="r" from="5" to="14" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite"/>
                </circle>
              )}
            </g>
          )
        })}
      </svg>
      <div style={{ display:'flex', gap:10, marginTop:10, flexWrap:'wrap' }}>
        {(data.countries||[]).map((c:string)=>(
          <span key={c} style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:12, background:'rgba(139,123,255,0.15)', border:'1px solid rgba(139,123,255,0.3)', color:'#8B7BFF' }}>{c}</span>
        ))}
        {(data.countries||[]).length===0 && <span style={{ fontSize:10, color:'#3D4458' }}>Toca un país para activarlo en el mapa</span>}
      </div>
    </div>
  </div>
</div>
    </div>
  )
}

// ──────────────────────────────────────────
// PASO 3
// ──────────────────────────────────────────
function Step3({ data, set }: any) {
  const list: any[] = data.directCompetitors || [emptyCompetitor()]
  const update = (i:number, field:string, val:any) => set('directCompetitors', list.map((c:any,idx:number)=>idx===i?{...c,[field]:val}:c))
  const add    = () => list.length<10 && set('directCompetitors',[...list, emptyCompetitor()])
  const remove = (i:number) => set('directCompetitors', list.filter((_:any,idx:number)=>idx!==i))

  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', color:'#8B7BFF', marginBottom:10 }}>03 / 07 · MAPA DE AMENAZAS</div>
      <h1 style={{ fontSize:38, fontWeight:900, letterSpacing:'-0.03em', color:'#F0F2FF', lineHeight:1.1, marginBottom:8 }}>
        Quiénes te <span style={{ color:'#8B7BFF' }}>disputan el mercado</span>
      </h1>
      <p style={{ fontSize:14, color:'#9CA3AF', marginBottom:28, lineHeight:1.6 }}>Hasta 10 competidores directos. Asigna un nivel de amenaza — el motor pondera la cobertura de cada uno en el reporte.</p>

      <div style={S.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <SectionNum n="01" label="Mapa de amenaza - Competidores Nivel 1" />
          <button onClick={add} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(139,123,255,0.1)', border:'1px solid rgba(139,123,255,0.3)', borderRadius:20, padding:'6px 14px', color:'#8B7BFF', fontSize:12, fontWeight:600, cursor:'pointer' }}>+ Competidor</button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {list.map((c:any, i:number)=>(
            <div key={i} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'rgba(139,123,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#8B7BFF', flexShrink:0 }}>{c.name?c.name[0].toUpperCase():'?'}</div>
                <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  <input style={S.input} value={c.name} onChange={e=>update(i,'name',e.target.value)} placeholder="Nombre del competidor" />
                  <input style={S.input} value={c.url} onChange={e=>update(i,'url',e.target.value)} placeholder="sitio.com" />
                  <input style={S.input} value={c.products} onChange={e=>update(i,'products',e.target.value)} placeholder="Productos en competencia" />
                </div>
                {list.length>1&&<button onClick={()=>remove(i)} style={{ background:'rgba(255,107,107,0.1)', border:'1px solid rgba(255,107,107,0.2)', borderRadius:8, width:28, height:28, cursor:'pointer', color:'#FF6B6B', fontSize:14 }}>×</button>}
              </div>

<div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#5A627A', flexShrink:0 }}>PRESENCIA</span>
                  {['Local','Regional','Nacional','Internacional'].map(v=>(
                    <button key={v} onClick={()=>update(i,'presence',v)} style={{ padding:'5px 10px', borderRadius:16, border:'1px solid', fontSize:11, fontWeight:600, cursor:'pointer', background: c.presence===v ? 'rgba(139,123,255,0.2)' : 'transparent', borderColor: c.presence===v ? 'rgba(139,123,255,0.5)' : 'rgba(255,255,255,0.1)', color: c.presence===v ? '#8B7BFF' : '#5A627A' }}>{v}</button>
                  ))}
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {[['IG','ig'],['FB','fb'],['X','x'],['LI','li']].map(([icon,key])=>(
                    <div key={key} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'6px 10px', flex:1, minWidth:100 }}>
                      <span style={{ fontSize:10, fontWeight:800, color:'#8B7BFF', flexShrink:0 }}>{icon}</span>
                      <input style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'#F0F2FF', fontSize:12 }} value={c[key]||''} onChange={e=>update(i,key,e.target.value)} placeholder="@usuario" />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:10, fontWeight:700, color:'#5A627A', width:60 }}>AMENAZA</span>
                <input type="range" min={1} max={10} value={c.threat} onChange={e=>update(i,'threat',+e.target.value)} style={{ flex:1, accentColor:'#8B7BFF' }} />
                <span style={{ fontSize:14, fontWeight:800, color: c.threat>=8?'#FF6B6B':c.threat>=5?'#F2C063':'#6EE7A4', minWidth:40 }}>{c.threat}/10</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// PASO 4
// ──────────────────────────────────────────
function Step4({ data, set }: any) {
  const list: any[] = data.indirectCompetitors || [emptyIndirect()]
  const update = (i:number, field:string, val:any) => set('indirectCompetitors', list.map((c:any,idx:number)=>idx===i?{...c,[field]:val}:c))
  const add    = () => list.length<10 && set('indirectCompetitors',[...list, emptyIndirect()])
  const remove = (i:number) => set('indirectCompetitors', list.filter((_:any,idx:number)=>idx!==i))

  const quad = (t:number,r:number) => t>=6&&r>=6?'🔴 Disruptor real':t>=6&&r<6?'🟡 Vigilar':t<6&&r>=6?'🟣 Friccional':'⚪ Ruido bajo'

  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', color:'#8B7BFF', marginBottom:10 }}>04 / 07 · DISRUPTORES ADYACENTES</div>
      <h1 style={{ fontSize:24, fontWeight:900, letterSpacing:'-0.02em', color:'#F0F2FF', lineHeight:1.2, marginBottom:8 }}>
        Competidores Nivel 2, <span style={{ color:'#8B7BFF' }}>menos participación, los tenemos a la vista</span>
      </h1>
      <p style={{ fontSize:14, color:'#9CA3AF', marginBottom:28, lineHeight:1.6 }}>Sustitutos, adyacentes y disruptores potenciales. El sistema los pondera con menor frecuencia pero alta sensibilidad a movimientos atípicos.</p>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
        {[
          { label:'AMENAZA PROM.', value: list.length ? (list.reduce((a:number,c:any)=>a+c.threat,0)/list.length).toFixed(1)+'/10' : '—' },
          { label:'RELEVANCIA PROM.', value: list.length ? (list.reduce((a:number,c:any)=>a+c.relevance,0)/list.length).toFixed(1)+'/10' : '—' },
          { label:'SLOTS', value: `${list.length}/10` },
        ].map((m,i)=>(
          <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'#5A627A', marginBottom:6 }}>{m.label}</div>
            <div style={{ fontSize:20, fontWeight:800, color:'#F0F2FF' }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <SectionNum n="02" label="Competidores Nivel 2" />
          <button onClick={add} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(139,123,255,0.1)', border:'1px solid rgba(139,123,255,0.3)', borderRadius:20, padding:'6px 14px', color:'#8B7BFF', fontSize:12, fontWeight:600, cursor:'pointer' }}>+ Competidor</button>
        </div>

        {list.map((c:any,i:number)=>(
          <div key={c.id||i} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'16px', marginBottom:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'auto 1fr 1fr auto', gap:10, alignItems:'center', marginBottom:14 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'rgba(93,212,212,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#5DD4D4' }}>{c.name?c.name[0].toUpperCase():'?'}</div>
              <input style={S.input} value={c.name} onChange={e=>update(i,'name',e.target.value)} placeholder="Nombre del competidor" />
              <input style={S.input} value={c.industry} onChange={e=>update(i,'industry',e.target.value)} placeholder="Industria / Categoría" />
              {list.length>1&&<button onClick={()=>remove(i)} style={{ background:'rgba(255,107,107,0.1)', border:'1px solid rgba(255,107,107,0.2)', borderRadius:8, width:28, height:28, cursor:'pointer', color:'#FF6B6B', fontSize:14 }}>×</button>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'#5A627A' }}>AMENAZA</span>
                  <span style={{ fontSize:12, fontWeight:800, color:'#F2C063' }}>{c.threat}/10</span>
                </div>
                <input type="range" min={0} max={10} value={c.threat} onChange={e=>update(i,'threat',+e.target.value)} style={{ width:'100%', accentColor:'#F2C063' }} />
              </div>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'#5A627A' }}>RELEVANCIA</span>
                  <span style={{ fontSize:12, fontWeight:800, color:'#5DD4D4' }}>{c.relevance}/10</span>
                </div>
                <input type="range" min={0} max={10} value={c.relevance} onChange={e=>update(i,'relevance',+e.target.value)} style={{ width:'100%', accentColor:'#5DD4D4' }} />
              </div>
            </div>
            <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:12, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'10px 14px' }}>
              {/* Ícono semáforo */}
              <div style={{ display:'flex', flexDirection:'column', gap:3, flexShrink:0 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background: c.threat>=8&&c.relevance>=8 ? '#FF6B6B' : 'rgba(255,107,107,0.15)', border:'1px solid rgba(255,107,107,0.3)', transition:'all 0.3s' }}/>
                <div style={{ width:10, height:10, borderRadius:'50%', background: c.threat>=5&&c.relevance>=5&&!(c.threat>=8&&c.relevance>=8) ? '#F2C063' : 'rgba(242,192,99,0.15)', border:'1px solid rgba(242,192,99,0.3)', transition:'all 0.3s' }}/>
                <div style={{ width:10, height:10, borderRadius:'50%', background: c.threat<5&&c.relevance<5 ? '#6EE7A4' : 'rgba(110,231,164,0.15)', border:'1px solid rgba(110,231,164,0.3)', transition:'all 0.3s' }}/>
              </div>
              {/* Texto */}
              <div>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'#5A627A', marginBottom:3 }}>ALERTA COMPETIDORES INDIRECTOS</div>
                <div style={{ fontSize:12, fontWeight:700, color:
                  c.threat>=8&&c.relevance>=8 ? '#FF6B6B' :
                  c.threat>=6&&c.relevance>=6 ? '#F2C063' :
                  c.threat>=6&&c.relevance<6  ? '#8B7BFF' :
                  '#6EE7A4'
                }}>
                  {c.threat>=8&&c.relevance>=8 ? '🔴 Disruptor real — monitoreo diario' :
                   c.threat>=6&&c.relevance>=6 ? '🟡 Vigilar de cerca — riesgo moderado' :
                   c.threat>=6&&c.relevance<6  ? '🟣 Friccional — impacto parcial' :
                                                 '🟢 Ruido bajo — sin acción inmediata'}
                </div>
              </div>
              {/* Barra de riesgo */}
              <div style={{ marginLeft:'auto', textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:9, color:'#5A627A', marginBottom:4 }}>RIESGO COMBINADO</div>
                <div style={{ width:60, height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${((c.threat+c.relevance)/20)*100}%`, background:
                    c.threat>=8&&c.relevance>=8 ? '#FF6B6B' :
                    c.threat>=6&&c.relevance>=6 ? '#F2C063' :
                    '#6EE7A4', borderRadius:3, transition:'width 0.3s'
                  }}/>
                </div>
                <div style={{ fontSize:11, fontWeight:800, color:'#F0F2FF', marginTop:3 }}>{Math.round((c.threat+c.relevance)/2)}/10</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// PASO 5
// ──────────────────────────────────────────
function Step5({ data, set }: any) {
  const active: string[] = data.monitorAreas || AREAS.filter(a=>a.on).map(a=>a.id)
  const depth: Record<string,number> = data.areaDepth || {}
  const toggle = (id:string) => set('monitorAreas', active.includes(id)?active.filter(x=>x!==id):[...active,id])
  const setDepth = (id:string, v:number) => set('areaDepth',{...depth,[id]:v})

  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', color:'#8B7BFF', marginBottom:10 }}>05 / 07 · ALCANCE DE MONITOREO</div>
      <h1 style={{ fontSize:38, fontWeight:900, letterSpacing:'-0.03em', color:'#F0F2FF', lineHeight:1.1, marginBottom:8 }}>
        Qué debe <span style={{ color:'#8B7BFF' }}>vigilar el motor</span>
      </h1>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <p style={{ fontSize:14, color:'#9CA3AF', lineHeight:1.6, maxWidth:480 }}>Selecciona las áreas que quieres en cada reporte. Cada una activa pipelines independientes de scraping, NLP y verificación.</p>
        <div/>
      </div>

      <div style={S.card}>
        <SectionNum n="01" label="Activar áreas" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {AREAS.map(a=>{
            const on=active.includes(a.id)
            return (
              <button key={a.id} onClick={()=>toggle(a.id)} style={{ textAlign:'left', padding:'18px', borderRadius:14, border:'1px solid', cursor:'pointer', transition:'all 0.2s', background: on ? 'rgba(139,123,255,0.1)' : 'rgba(255,255,255,0.02)', borderColor: on ? 'rgba(139,123,255,0.4)' : 'rgba(255,255,255,0.06)', position:'relative' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'#5A627A', fontFamily:'monospace' }}>{a.code}</span>
                  <div style={{ width:22, height:22, borderRadius:6, background: on ? '#8B7BFF' : 'rgba(255,255,255,0.06)', border:'1px solid', borderColor: on ? '#8B7BFF' : 'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {on&&<span style={{ color:'#fff', fontSize:12, fontWeight:800 }}>✓</span>}
                  </div>
                </div>
                <div style={{ fontSize:14, fontWeight:700, color: on ? '#F0F2FF' : '#9CA3AF', marginBottom:6 }}>{a.label}</div>
                <div style={{ fontSize:12, color:'#5A627A', lineHeight:1.5, marginBottom:12 }}>{a.desc}</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:10, fontFamily:'monospace', color: on ? '#8B7BFF' : '#3D4458' }}>{a.meta}</span>
                  <span style={{ fontSize:10, fontWeight:700, color: on ? '#6EE7A4' : '#3D4458' }}>{on?'ON':'OFF'}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Profundidad */}
      {active.length > 0 && (
        <div style={S.card}>
          <SectionNum n="02" label="Profundidad por área" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {active.slice(0,6).map(id=>{
              const area = AREAS.find(a=>a.id===id)!
              const val = depth[id] || 7
              return (
                <div key={id}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'#5A627A' }}>{area.label.toUpperCase()} · PROFUNDIDAD</span>
                    <div style={{ width:24, height:24, borderRadius:12, background:'#8B7BFF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff' }}>{val}</div>
                  </div>
                  <input type="range" min={1} max={10} value={val} onChange={e=>setDepth(id,+e.target.value)} style={{ width:'100%', accentColor:'#8B7BFF' }} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────
// PASO 6
// ──────────────────────────────────────────
function Step6({ data, set, isMobile }: any) {
  const annual = data.annualBilling || false
  const planId = data.frequency || 'WEEKLY'
  const plan = PLANS.find(p=>p.id===planId)!

  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', color:'#8B7BFF', marginBottom:10 }}>06 / 07 · CADENCIA & CANALES</div>
      <h1 style={{ fontSize:38, fontWeight:900, letterSpacing:'-0.03em', color:'#F0F2FF', lineHeight:1.1, marginBottom:8 }}>
        Cuándo y <span style={{ color:'#8B7BFF' }}>cómo lo recibes</span>
      </h1>
      <p style={{ fontSize:14, color:'#9CA3AF', marginBottom:28, lineHeight:1.6 }}>Elige plan, frecuencia, día, hora y canales. Puedes cambiarlo después sin perder histórico.</p>

      {/* Planes */}
      <div style={S.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <SectionNum n="01" label="Plan de inteligencia" />
          <div style={{ display:'flex', gap:6, background:'rgba(255,255,255,0.05)', borderRadius:20, padding:4 }}>
            <button onClick={()=>set('annualBilling',false)} style={{ padding:'5px 14px', borderRadius:16, border:'none', fontSize:11, fontWeight:700, cursor:'pointer', background:!annual?'#8B7BFF':'transparent', color:!annual?'#fff':'#9CA3AF' }}>Mensual</button>
            <button onClick={()=>set('annualBilling',true)} style={{ padding:'5px 14px', borderRadius:16, border:'none', fontSize:11, fontWeight:700, cursor:'pointer', background:annual?'#8B7BFF':'transparent', color:annual?'#fff':'#9CA3AF', display:'flex', alignItems:'center', gap:6 }}>Anual <span style={{ background:'#6EE7A4', color:'#0D0F1A', padding:'1px 6px', borderRadius:8, fontSize:9, fontWeight:800 }}>-20%</span></button>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {PLANS.map(p=>{
            const on=planId===p.id
            const price=annual?p.priceAnnual:p.price
            return (
              <button key={p.id} onClick={()=>set('frequency',p.id)} style={{ textAlign:'left', padding:'20px', borderRadius:14, border:'1px solid', cursor:'pointer', transition:'all 0.2s', background: on ? 'rgba(139,123,255,0.12)' : 'rgba(255,255,255,0.02)', borderColor: on ? 'rgba(139,123,255,0.5)' : 'rgba(255,255,255,0.06)', position:'relative' }}>
                {p.popular&&<div style={{ position:'absolute', top:-10, right:14, background:'#8B7BFF', color:'#fff', fontSize:9, fontWeight:800, padding:'3px 8px', borderRadius:8, letterSpacing:'0.08em' }}>RECOMENDADO</div>}
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'#5A627A', marginBottom:8, fontFamily:'monospace' }}>{p.tag}</div>
                <div style={{ fontSize:22, fontWeight:900, color: on?'#F0F2FF':'#9CA3AF', marginBottom:2 }}>{p.label}</div>
                <div style={{ fontSize:28, fontWeight:900, color: on?'#8B7BFF':'#5A627A', marginBottom:12 }}>USD {price.toLocaleString()} <span style={{ fontSize:12, fontWeight:500, color:'#5A627A' }}>/ mes</span></div>
                {p.features.map((f,i)=><div key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color: on?'#9CA3AF':'#5A627A', marginBottom:4 }}><span style={{ color: on?'#8B7BFF':'#3D4458' }}>✓</span>{f}</div>)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Día + Hora */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:16, marginBottom:16 }}>
        <div style={S.card}>
          <SectionNum n="02" label="Día de entrega" />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4 }}>
            {DAYS.map((d,i)=>(
              <button key={i} onClick={()=>set('deliveryDay',i)} style={{ padding:'8px 4px', borderRadius:10, border:'1px solid', fontSize:11, fontWeight:700, cursor:'pointer', textAlign:'center' as const, background: data.deliveryDay===i ? '#8B7BFF' : 'rgba(255,255,255,0.04)', borderColor: data.deliveryDay===i ? '#8B7BFF' : 'rgba(255,255,255,0.08)', color: data.deliveryDay===i ? '#fff' : '#5A627A' }}>{d}</button>
            ))}
          </div>
        </div>
        <div style={S.card}>
          <SectionNum n="03" label="Horario · UTC-5" />
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {TIMES.map((t,i)=>(
              <button key={i} onClick={()=>set('deliveryTime',i)} style={{ padding:'8px 12px', borderRadius:10, border:'1px solid', fontSize:12, fontWeight:700, fontFamily:'monospace', cursor:'pointer', background: data.deliveryTime===i ? '#8B7BFF' : 'rgba(255,255,255,0.04)', borderColor: data.deliveryTime===i ? '#8B7BFF' : 'rgba(255,255,255,0.08)', color: data.deliveryTime===i ? '#fff' : '#5A627A' }}>{t}</button>
            ))}
          </div>
          <p style={{ fontSize:11, color:'#3D4458', marginTop:10 }}>🏆 Lunes 07:00 maximiza adopción ejecutiva</p>
        </div>
      </div>

      {/* Canales */}
      <div style={S.card}>
        <SectionNum n="04" label="Canales de entrega" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
          {[['EMAIL','Email','PDF + HTML'],['WHATSAPP','WhatsApp','Resumen + link'],['BOTH','Ambos','Recomendado']].map(([v,l,sub])=>(
            <button key={v} onClick={()=>set('deliveryChannel',v)} style={{ padding:'16px', borderRadius:12, border:'1px solid', cursor:'pointer', background: data.deliveryChannel===v ? 'rgba(139,123,255,0.15)' : 'rgba(255,255,255,0.03)', borderColor: data.deliveryChannel===v ? 'rgba(139,123,255,0.5)' : 'rgba(255,255,255,0.08)', textAlign:'center' as const }}>
              <div style={{ fontSize:13, fontWeight:700, color: data.deliveryChannel===v ? '#F0F2FF' : '#9CA3AF', marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:11, color:'#5A627A' }}>{sub}</div>
            </button>
          ))}
        </div>
        {(data.deliveryChannel==='EMAIL'||data.deliveryChannel==='BOTH') && (
          <div style={{ marginBottom:12 }}>
            <label style={S.label}>Email de entrega</label>
            <input style={S.input} type="email" value={data.deliveryEmail||''} onChange={e=>set('deliveryEmail',e.target.value)} placeholder="director@tuempresa.com" />
          </div>
        )}
        {(data.deliveryChannel==='WHATSAPP'||data.deliveryChannel==='BOTH') && (
          <div>
            <label style={S.label}>WhatsApp</label>
            <input style={S.input} type="tel" value={data.deliveryPhone||''} onChange={e=>set('deliveryPhone',e.target.value)} placeholder="+52 81 1234 5678" />
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// PASO 7
// ──────────────────────────────────────────
function Step7({ data, loading, onActivate, onSave, errorMsg, isEditing, isMobile }: any) {
  const plan = PLANS.find(p=>p.id===(data.frequency||'WEEKLY'))!
  const price = data.annualBilling ? plan.priceAnnual : plan.price
  const directCount = (data.directCompetitors||[]).filter((c:any)=>c.name).length
  const indirectCount = (data.indirectCompetitors||[]).filter((c:any)=>c.name).length
  const activeAreas = (data.monitorAreas||[]).length

  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', color:'#8B7BFF', marginBottom:10 }}>07 / 07 · BRIEFING CONSOLIDADO</div>
      <h1 style={{ fontSize:38, fontWeight:900, letterSpacing:'-0.03em', color:'#F0F2FF', lineHeight:1.1, marginBottom:8 }}>
        Listo para <span style={{ color:'#8B7BFF' }}>activar</span>
      </h1>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <p style={{ fontSize:14, color:'#9CA3AF', lineHeight:1.6, maxWidth:400 }}>Revisa la configuración y dispara la primera ronda de inteligencia. El motor entregará el reporte inicial en aproximadamente 6 horas.</p>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'#5A627A' }}>SCORE</div>
          <div style={{ fontSize:24, fontWeight:900, color:'#6EE7A4' }}>94/100</div>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'#6EE7A4' }}>STATUS READY</div>
        </div>
      </div>

      {/* Resumen ejecutivo */}
      <div style={S.card}>
        <SectionNum n="01" label="Resumen ejecutivo" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {[
            { label:'EMPRESA', title: data.companyName||data.brand||'—', items:[`${data.industry||'—'} · ${data.companySize||'—'} empleados`, data.presenceScope||'—', data.website||'—'] },
            { label:'POSICIONAMIENTO', title: data.pitch ? data.pitch.slice(0,40)+'...' : '—', items:[`${(data.products||[]).filter((p:any)=>p.name).length} productos cargados`, `${(data.differentiators||[]).length} diferenciadores clave`, data.presenceScope ? `Presencia ${data.presenceScope.toLowerCase()}` : '—'] },
            { label:'COMPETIDORES DIRECTOS', title: `${directCount} marcas · amenaza media ${directCount ? ((data.directCompetitors||[]).filter((c:any)=>c.name).reduce((a:number,c:any)=>a+c.threat,0)/Math.max(directCount,1)).toFixed(1) : '0'}`, items: (data.directCompetitors||[]).filter((c:any)=>c.name).slice(0,3).map((c:any)=>`${c.name} · ${c.threat}/10`) },
            { label:'COMPETIDORES INDIRECTOS', title: `${indirectCount} sustitutos · sensibilidad alta`, items: (data.indirectCompetitors||[]).filter((c:any)=>c.name).slice(0,3).map((c:any)=>c.name) },
            { label:'ÁREAS DE MONITOREO', title: `${activeAreas} áreas · ${activeAreas*4} pipelines`, items: (data.monitorAreas||[]).slice(0,3).map((id:string)=>AREAS.find(a=>a.id===id)?.label||id) },
            { label:'ENTREGA', title: `${DAYS[data.deliveryDay||0]} ${TIMES[data.deliveryTime||0]} · ${plan.label.toLowerCase()}`, items:[`${data.deliveryChannel==='BOTH'?'Email + WhatsApp':data.deliveryChannel==='EMAIL'?'Email':'WhatsApp'}`, `Plan ${plan.tag}`, `USD ${price} / mes`] },
          ].map((card,i)=>(
            <div key={i} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'18px' }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:'#5A627A', marginBottom:10 }}>{card.label}</div>
              <div style={{ fontSize:16, fontWeight:800, color:'#F0F2FF', marginBottom:10, lineHeight:1.3 }}>{card.title}</div>
              {card.items.map((item:string,j:number)=>(
                <div key={j} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#9CA3AF', marginBottom:4 }}>
                  <span style={{ width:4, height:4, borderRadius:'50%', background:'#8B7BFF', flexShrink:0 }} />
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={S.card}>
        <SectionNum n="02" label="Vista previa del reporte" />
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:16 }}>

          {/* Portada */}
          <div style={{ background:'#080A12', border:'1px solid rgba(139,123,255,0.2)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'20px 20px 16px' }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:'#5A627A', fontFamily:'monospace', marginBottom:12 }}>
                {plan.label.toUpperCase()} · EDICIÓN 001
              </div>
              <div style={{ fontSize:24, fontWeight:900, color:'#F0F2FF', lineHeight:1.15, marginBottom:4 }}>
                Inteligencia<br/>
                <span style={{ color:'#8B7BFF', fontStyle:'italic' }}>Sectorial</span><br/>
                <span style={{ fontSize:18 }}>{data.companyName||data.brand||'Tu empresa'}</span>
              </div>
              <div style={{ fontSize:11, color:'#5A627A', marginTop:10, lineHeight:1.6 }}>
                Vista previa de la portada. Incluirá movimientos clave, radar competitivo, lectura editorial y feed de señales.
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:'rgba(255,255,255,0.05)', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
              {[
                { label:'MOVIMIENTOS', value:'12', color:'#8B7BFF' },
                { label:'LANZAMIENTOS', value:'3', color:'#5DD4D4' },
                { label:'CAMBIOS DE PRECIO', value:'8', color:'#F2C063' },
                { label:'IMPACTO EN MEDIOS', value:'47', color:'#6EE7A4' },
              ].map((m,i)=>(
                <div key={i} style={{ background:'#080A12', padding:'14px 16px', borderTop: i>=2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'#5A627A', fontFamily:'monospace', marginBottom:6 }}>{m.label}</div>
                  <div style={{ fontSize:26, fontWeight:900, color:m.color }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Benchmark */}
          <div style={{ background:'#080A12', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:20, marginTop: isMobile ? 12 : 0 }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:'#5A627A', marginBottom:4 }}>SECCIÓN · BENCHMARK COMPETITIVO</div>
            <div style={{ fontSize:15, fontWeight:700, color:'#F0F2FF', marginBottom:16 }}>Movimientos clave de la semana</div>

            <div style={{ height:6, background:'rgba(255,255,255,0.08)', borderRadius:3, marginBottom:8, width:'95%' }}/>
            <div style={{ height:6, background:'rgba(255,255,255,0.05)', borderRadius:3, marginBottom:16, width:'70%' }}/>

            <div style={{ background:'rgba(139,123,255,0.05)', border:'1px solid rgba(139,123,255,0.12)', borderRadius:10, padding:12, marginBottom:14 }}>
              <svg viewBox="0 0 300 90" style={{ width:'100%', height:'auto' }}>
                <defs>
                  <linearGradient id="gv2" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#8B7BFF" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#8B7BFF" stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="gc2" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#5DD4D4" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#5DD4D4" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <line x1="0" x2="300" y1="30" y2="30" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                <line x1="0" x2="300" y1="60" y2="60" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                <path d="M0 70 L40 55 L80 60 L120 40 L160 45 L200 30 L240 35 L280 20 L300 25 L300 90 L0 90 Z" fill="url(#gv2)"/>
                <path d="M0 70 L40 55 L80 60 L120 40 L160 45 L200 30 L240 35 L280 20 L300 25" fill="none" stroke="#8B7BFF" strokeWidth="1.8"/>
                <path d="M0 80 L40 72 L80 75 L120 65 L160 68 L200 55 L240 58 L280 50 L300 52 L300 90 L0 90 Z" fill="url(#gc2)"/>
                <path d="M0 80 L40 72 L80 75 L120 65 L160 68 L200 55 L240 58 L280 50 L300 52" fill="none" stroke="#5DD4D4" strokeWidth="1.5"/>
                <circle cx="200" cy="30" r="4" fill="#8B7BFF" stroke="#0D0F1A" strokeWidth="2"/>
                <line x1="200" x2="200" y1="30" y2="90" stroke="#8B7BFF" strokeWidth="1" strokeDasharray="3 3" opacity="0.4"/>
              </svg>
              <div style={{ display:'flex', gap:12, marginTop:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:8, height:2, background:'#8B7BFF', borderRadius:1 }}/>
                  <span style={{ fontSize:9, fontWeight:700, color:'#5A627A' }}>Tu empresa</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:8, height:2, background:'#5DD4D4', borderRadius:1 }}/>
                  <span style={{ fontSize:9, fontWeight:700, color:'#5A627A' }}>Sector</span>
                </div>
              </div>
            </div>

            <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, marginBottom:6, width:'88%' }}/>
            <div style={{ height:6, background:'rgba(255,255,255,0.04)', borderRadius:3, marginBottom:14, width:'55%' }}/>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'#3D4458', fontFamily:'monospace' }}>› CONTINÚA EN P. 04</div>
          </div>

        </div>
      </div>

      {/* Botón activar grande — solo si no tiene suscripción */}
      {!isEditing && (
      <div style={{ background:'linear-gradient(135deg, rgba(139,123,255,0.2), rgba(93,212,212,0.1))', border:'1px solid rgba(139,123,255,0.3)', borderRadius:16, padding:'24px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:'#F0F2FF' }}>Tu primer reporte está listo — actívalo en 5 minutos</div>
          <div style={{ fontSize:12, color:'#9CA3AF', marginTop:4 }}>Sin cargo hoy · Cancela cuando quieras</div>
        </div>
        <button onClick={onActivate} disabled={loading} style={{ background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', border:'none', borderRadius:20, padding:'12px 24px', color:'#0D0F1A', fontSize:13, fontWeight:800, cursor: loading?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:8, opacity: loading?0.7:1 }}>
          {loading ? <div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(0,0,0,0.3)', borderTopColor:'#0D0F1A', animation:'spin 0.8s linear infinite' }} /> : null}
          ACTIVAR INTELIGENCIA — Primer reporte en 5-10 min
        </button>
      </div>
      )}
      {isEditing && (
      <div style={{ background:'rgba(110,231,164,0.06)', border:'1px solid rgba(110,231,164,0.2)', borderRadius:16, padding:'20px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:'#6EE7A4' }}>✓ Suscripción activa</div>
          <div style={{ fontSize:12, color:'#9CA3AF', marginTop:4 }}>Los cambios se guardarán y aplicarán al próximo reporte</div>
        </div>
        <button onClick={onSave} disabled={loading} style={{ background:'#1D9E75', border:'none', borderRadius:20, padding:'12px 24px', color:'#fff', fontSize:13, fontWeight:800, cursor: loading?'not-allowed':'pointer', opacity: loading?0.7:1 }}>
          {loading ? 'Guardando...' : 'Guardar cambios →'}
        </button>
      </div>
      )}

      {errorMsg && (
        <div style={{ background:'rgba(255,107,107,0.1)', border:'1px solid rgba(255,107,107,0.2)', borderRadius:12, padding:'12px 16px', color:'#FF6B6B', fontSize:13 }}>⚠️ {errorMsg}</div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────
// SIDEBAR
// ──────────────────────────────────────────
function Sidebar({ step, setStep }: { step: number; setStep: (n: number) => void }) {
  const progress = Math.round(((step - 1) / 6) * 100)
  return (
    <aside style={{ width:268, minHeight:'100vh', background:'#0D0F1A', borderRight:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', padding:'28px 20px', flexShrink:0 }}>
      <div style={{ marginBottom:32 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', color:'#5A627A', marginBottom:10 }}>WIZARD · 7 PASOS</div>
        <div style={{ fontSize:22, fontWeight:800, color:'#F0F2FF', lineHeight:1.2, letterSpacing:'-0.02em' }}>Inteligencia<br />Competitiva Sectorial</div>
        <div style={{ fontSize:16, fontWeight:700, color:'#8B7BFF', marginTop:2 }}>AI Automated</div>
      </div>
      <nav style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:20 }}>
        {STEPS.map(s=>{
          const done=step>s.id, active=step===s.id
          return (
            <button key={s.id} onClick={()=>setStep(s.id)} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:12, border:'none', cursor:'pointer', textAlign:'left', background:active?'rgba(139,123,255,0.15)':'transparent', transition:'all 0.2s' }}>
              <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, background:done?'#6EE7A4':active?'#8B7BFF':'rgba(255,255,255,0.06)', color:done?'#0D0F1A':active?'#fff':'#5A627A', border:active||done?'none':'1px solid rgba(255,255,255,0.08)' }}>{done?'✓':`0${s.id}`}</div>
              <div style={{ fontSize:13, fontWeight:active?700:500, color:active?'#F0F2FF':done?'#9CA3AF':'#5A627A' }}>{s.label}</div>
              {active&&<div style={{ marginLeft:'auto', color:'#8B7BFF', fontSize:16 }}>→</div>}
            </button>
          )
        })}
      </nav>
      <div style={{ marginTop:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'#5A627A' }}>PROGRESO {progress}%</span>
          <span style={{ fontSize:10, color:'#5A627A' }}>≈ {Math.max(7-step,0)+1} MIN</span>
        </div>
        <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#8B7BFF,#5DD4D4)', borderRadius:4, transition:'width 0.4s' }} />
        </div>
      </div>
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:16, paddingTop:16 }}>
        <a href="/dashboard" style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', textDecoration:'none', transition:'all 0.2s' }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'rgba(139,123,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B7BFF" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </div>
          <span style={{ fontSize:12, fontWeight:700, color:'#8B7BFF' }}>Dashboard</span>
          <span style={{ marginLeft:'auto', color:'#5A627A', fontSize:14 }}>→</span>
        </a>
      </div>
    </aside>
  )
}

// ──────────────────────────────────────────
// BRIEFING PANEL
// ──────────────────────────────────────────
function BriefingPanel({ step, isMobile }: { step: number; isMobile: boolean }) {
  const briefings: Record<number,{title:string;next:string}> = {
    1:{title:'Toda la lógica de monitoreo se ancla aquí. Industria define los corpus de scraping; tamaño calibra benchmarking.',next:'Posicionamiento'},
    2:{title:'El motor compara tu propuesta de valor contra cada competidor para detectar copia, convergencia o diferenciación.',next:'Competidores directos'},
    3:{title:'Más amenaza = más profundidad. Ajusta los sliders con criterio: marca el espacio competitivo real.',next:'Competidores indirectos'},
    4:{title:'Los sustitutos son el 30% de la sorpresa: aquí cae el disruptor que aún no aparece en tu radar.',next:'Áreas a monitorear'},
    5:{title:'Cada área activa pipelines independientes. Activar todas no degrada el reporte; lo enriquece.',next:'Frecuencia y entrega'},
    6:{title:'Lunes a primera hora maximiza adopción ejecutiva. El briefing entra antes del primer comité.',next:'Confirmación y activación'},
    7:{title:'Briefing completo. Al activar, el motor empieza a indexar inmediatamente. Primer reporte en ~6h.',next:'Configuración lista. Activa para empezar.'},
  }
  const b=briefings[step]
  return (
    <aside style={{ width: isMobile ? '100%' : 280, minHeight: isMobile ? 'auto' : '100vh', background:'#0D0F1A', borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)', borderTop: isMobile ? '1px solid rgba(255,255,255,0.06)' : 'none', padding:'28px 20px', flexShrink:0, display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:13, fontWeight:800, color:'#F0F2FF' }}>BRIEFING AI</span>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#6EE7A4' }} />
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'#6EE7A4' }}>ANALYZING</span>
        </div>
      </div>
      <div style={{ background:'rgba(139,123,255,0.08)', border:'1px solid rgba(139,123,255,0.2)', borderRadius:14, padding:'16px 14px' }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'#8B7BFF', marginBottom:8 }}>PASO ACTUAL · 0{step}/07</div>
        <div style={{ fontSize:13, color:'#C4C9E2', lineHeight:1.6 }}>{b.title}</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {[['CONEXIONES','240','activas'],['SCANS / SEM','1.4M',''],['ALERTAS','12','esta sem.'],['AVANCE ONBOARDING','94','%']].map(([label,value,sub],i)=>(
          <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'12px 14px' }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'#5A627A', marginBottom:6 }}>{label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:'#F0F2FF', letterSpacing:'-0.02em', lineHeight:1 }}>{value} <span style={{ fontSize:11, color:'#5A627A', fontWeight:500 }}>{sub}</span></div>
          </div>
        ))}
      </div>
      <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'14px' }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'#5A627A', marginBottom:8 }}>PRÓXIMO</div>
        <div style={{ fontSize:13, fontWeight:600, color:'#F0F2FF' }}>{b.next}</div>
        <div style={{ fontSize:11, color:'#5A627A', marginTop:2 }}>0{Math.min(step+1,7)}/07 · ≈ 1 min</div>
      </div>
      <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'14px' }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'#5A627A', marginBottom:8 }}>AYUDA</div>
        <div style={{ fontSize:12, color:'#9CA3AF', lineHeight:1.6 }}>¿Dudas? El equipo de PRO Reports responde en menos de 2h en horario laboral.</div>
      </div>
      <div style={{ background:'rgba(139,123,255,0.08)', border:'1px solid rgba(139,123,255,0.2)', borderRadius:14, padding:'14px' }}>
  <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'#8B7BFF', marginBottom:10 }}>¿TIENES DUDAS? PREGÚNTANOS</div>
  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
    <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(110,231,164,0.08)', border:'1px solid rgba(110,231,164,0.15)', borderRadius:10, padding:'8px 12px', cursor:'pointer' }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:'#6EE7A4', flexShrink:0 }} />
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:'#6EE7A4' }}>Agente AI</div>
        <div style={{ fontSize:10, color:'#5A627A' }}>Respuestas de inmediato</div>
      </div>
    </div>
    <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'8px 12px', cursor:'pointer' }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:'#8B7BFF', flexShrink:0 }} />
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:'#C4C9E2' }}>Agente Humano</div>
        <div style={{ fontSize:10, color:'#5A627A' }}>1 hora máx</div>
      </div>
    </div>
  </div>
</div>
<div style={{ marginTop:'auto', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
  <span style={{ fontSize:10, fontFamily:'monospace', color:'#3D4458' }}>MODELO PRO-R-04 · LIVE</span>
  <span style={{ fontSize:10, color:'#5A627A', cursor:'pointer' }}>› DOCS</span>
</div>
    </aside>
  )
}

// ──────────────────────────────────────────
// TOP NAV
// ──────────────────────────────────────────
function TopNav() {
  return (
    <div style={{ height:56, borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', background:'#0D0F1A', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:'#0D0F1A' }}>PR</div>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:'#F0F2FF' }}>PRO Reports</div>
          <div style={{ fontSize:11, color:'#5A627A' }}>Inteligencia Competitiva · AI</div>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(110,231,164,0.1)', border:'1px solid rgba(110,231,164,0.2)', borderRadius:20, padding:'5px 12px' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#6EE7A4' }} />
          <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', color:'#6EE7A4' }}>SETUP · LIVE</span>
        </div>
        <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.05)', borderRadius:20, padding:4 }}>
          <button style={{ padding:'4px 10px', borderRadius:16, border:'none', background:'#8B7BFF', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>ES</button>
          <button style={{ padding:'4px 10px', borderRadius:16, border:'none', background:'transparent', color:'#5A627A', fontSize:11, fontWeight:700, cursor:'pointer' }}>EN</button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const isMobile = useIsMobile()
  const mainRef = React.useRef<HTMLElement>(null)
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://reports-pro-production.up.railway.app'

  const [data, setData] = useState<any>({
    companyName:'', brand:'', website:'', industry:'', companySize:'', targetMarket:'', ciudad:'', pais:'México',
    socialMedia:{ ig:'', fb:'', tt:'', yt:'', li:'', x:'' },
    mainProducts:'', tags:[], pitch:'',
    differentiators:[], products:[emptyProduct()], presenceScope:'Nacional', countries:[],
    directCompetitors:[emptyCompetitor()],
    indirectCompetitors:[emptyIndirect()],
    monitorAreas: AREAS.filter(a=>a.on).map(a=>a.id),
    areaDepth:{},
    frequency:'WEEKLY', annualBilling:false,
    deliveryDay:0, deliveryTime:0, deliveryChannel:'EMAIL',
    deliveryEmail:'', deliveryPhone:'',
  })

  const set = (key: string, val: any) => setData((prev: any) => ({ ...prev, [key]: val }))

  // Scroll al top cuando cambia el step
  useEffect(() => {
    const el = document.getElementById('onboarding-main')
    if (el) el.scrollTop = 0
  }, [step])

  // Cargar datos existentes del proyecto y step inicial de URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initialStep = params.get('step')
    if (initialStep) setStep(parseInt(initialStep))

    const loadExisting = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      try {
        const res = await fetch(`${BACKEND}/api/dashboard/${session.user.id}`, {
          headers: { 'Authorization': 'Bearer ' + session.access_token }
        })
        const dash = await res.json()
        if (!dash?.project) { setDataLoaded(true); return }
        // Solo es edición si tiene setup completo con nombre real
        const hasRealSetup = dash?.setup?.companyName && 
          dash.setup.companyName !== 'Sin nombre' && 
          dash.setup.companyName.trim() !== ''
        if (hasRealSetup) setIsEditing(true)
        const s = dash.setup || {}
        const ctx = typeof s.additionalContext === 'string' ? JSON.parse(s.additionalContext || '{}') : (s.additionalContext || {})
        // DAYS y TIMES para convertir strings a índices
        const DAYS_LIST = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
        const TIMES_LIST = ['06:00','07:00','08:00','09:00','12:00','15:00','18:00','21:00']
        const dayIdx = ctx.deliveryDay ? DAYS_LIST.indexOf(ctx.deliveryDay) : -1
        const timeIdx = ctx.deliveryTime ? TIMES_LIST.indexOf(ctx.deliveryTime) : -1

        setData((prev: any) => ({
          ...prev,
          companyName: s.companyName || prev.companyName,
          brand: ctx.brand || prev.brand,
          website: s.website || prev.website,
          industry: s.industry || prev.industry,
          companySize: ctx.companySize || prev.companySize,
          targetMarket: s.targetMarket || ctx.targetMarket || prev.targetMarket,
          ciudad: s.city || prev.ciudad,
          pais: s.country || prev.pais,
          mainProducts: (s.mainProducts || []).join(', ') || prev.mainProducts,
          tags: (ctx.tags && ctx.tags.length > 0) ? ctx.tags : prev.tags,
          pitch: ctx.pitch || prev.pitch,
          differentiators: ctx.differentiators || prev.differentiators,
          products: ctx.products?.length ? ctx.products : prev.products,
          presenceScope: ctx.presenceScope || prev.presenceScope,
          areaDepth: (ctx.areaDepth && Object.keys(ctx.areaDepth).length > 0) ? ctx.areaDepth : prev.areaDepth,
          countries: ctx.countries || prev.countries,
          directCompetitors: ctx.directCompetitors?.length ? ctx.directCompetitors : prev.directCompetitors,
          indirectCompetitors: ctx.indirectCompetitors?.length ? ctx.indirectCompetitors : prev.indirectCompetitors,
          deliveryEmail: dash.project.deliveryEmail || prev.deliveryEmail,
          frequency: dash.project.frequency || prev.frequency,
          monitorAreas: s.focusAreas?.length ? s.focusAreas : prev.monitorAreas,
          deliveryChannel: ctx.deliveryChannel || prev.deliveryChannel,
          deliveryDay: dayIdx >= 0 ? dayIdx : prev.deliveryDay,
          deliveryTime: timeIdx >= 0 ? timeIdx : prev.deliveryTime,
          deliveryPhone: ctx.deliveryPhone || prev.deliveryPhone,
          socialMedia: {
            ig: s.instagramUrl || prev.socialMedia?.ig || '',
            fb: s.facebookUrl || prev.socialMedia?.fb || '',
            tt: s.tiktokUrl || prev.socialMedia?.tt || '',
            yt: prev.socialMedia?.yt || '',
            li: s.linkedinUrl || prev.socialMedia?.li || '',
            x: s.twitterUrl || prev.socialMedia?.x || '',
          },
        }))
      } catch(e) { console.error('Error cargando datos:', e) }
    }
    loadExisting()
  }, [])

  const saveProgress = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch(`${BACKEND}/api/onboarding/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
        body: JSON.stringify({
          userId: session.user.id,
          ...data,
          deliveryDay: DAYS[data.deliveryDay],
          deliveryTime: TIMES[data.deliveryTime],
        })
      })
    } catch(e) { console.error('Error guardando:', e) }
  }

  const handleSave = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      await saveProgress()
      router.push('/dashboard')
    } catch(e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!session || !user) throw new Error('No hay sesión activa')

      // Si ya tiene proyecto real, solo guardar sin generar reporte
      if (isEditing) {
        await saveProgress()
        router.push('/dashboard')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboarding/competitive`, {
        method:'POST',
        headers:{'Content-Type':'application/json', 'Authorization': 'Bearer ' + session.access_token},
        body: JSON.stringify({
          userId: user.id,
          companyName: data.companyName || data.brand,
          ...data,
          deliveryDay: DAYS[data.deliveryDay],
          deliveryTime: TIMES[data.deliveryTime],
        })
      })
      const res = await response.json()
      if (!response.ok) throw new Error(res.error || 'Error al activar')
      if (isEditing) {
        router.push('/dashboard')
      } else {
        router.push('/checkout')
      }
    } catch (err: any) {
      setErrorMsg(err.message)
      setLoading(false)
    }
  }

  const stepContent: Record<number, React.ReactNode> = {
    1: <Step1 data={data} set={set} />,
    2: <Step2 data={data} set={set} />,
    3: <Step3 data={data} set={set} />,
    4: <Step4 data={data} set={set} />,
    5: <Step5 data={data} set={set} />,
    6: <Step6 data={data} set={set} isMobile={isMobile} />,
    7: <Step7 data={data} loading={loading} onActivate={handleActivate} onSave={handleSave} errorMsg={errorMsg} isEditing={isEditing} isMobile={isMobile} />,
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', background:'#0D0F1A', color:'#F0F2FF', fontFamily:'"Plus Jakarta Sans", system-ui, sans-serif', overflowX:'hidden', maxWidth:'100vw' }}>
      <style>{`* { box-sizing: border-box; margin:0; padding:0; } input, textarea, select, button { font-family: inherit; } @keyframes spin { to { transform: rotate(360deg); } } #onboarding-main::-webkit-scrollbar { display: none; } #onboarding-main { -ms-overflow-style: none; scrollbar-width: none; } textarea::-webkit-scrollbar { display: none; } textarea { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
      <TopNav />
      <div style={{ display:'flex', flex:1, flexDirection: isMobile ? 'column' : 'row', overflow: isMobile ? 'visible' : 'hidden', height: isMobile ? 'auto' : 'calc(100vh - 56px)' }}>
        {!isMobile && <Sidebar step={step} setStep={setStep} />}
        {isMobile && (
          <div style={{ position:'sticky', top:56, zIndex:40, background:'#0D0F1A', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'10px 16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#F0F2FF' }}>{STEPS[step-1]?.label}</span>
              <span style={{ fontSize:11, fontWeight:700, color:'#8B7BFF', background:'rgba(139,123,255,0.1)', border:'1px solid rgba(139,123,255,0.2)', borderRadius:20, padding:'3px 10px' }}>Paso {step} de 7</span>
            </div>
            <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${Math.round(((step-1)/6)*100)}%`, background:'linear-gradient(90deg,#8B7BFF,#5DD4D4)', borderRadius:4, transition:'width 0.4s' }} />
            </div>
          </div>
        )}
        <main id='onboarding-main' style={{ flex:1, height: isMobile ? 'auto' : '100%', overflowY: isMobile ? 'visible' : 'scroll', padding: isMobile ? '20px 16px 160px' : '32px 36px' }}>
          <span id='step-top'/>
          {stepContent[step]}
          {/* Navegación */}
          <div style={{ background:'linear-gradient(0deg, #0D0F1A 80%, transparent)', padding:'20px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:32 }}>
            <button onClick={()=>{if(step>1){setStep(step-1)}else{router.push('/dashboard')};}} style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'10px 20px', color:'#9CA3AF', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              ← {step===1?'Cancelar':'Atrás'}
            </button>
            <div style={{ display:'flex', gap:10 }}>

              {step<7 ? (
                <button onClick={async ()=>{
                  await saveProgress();
                  setStep(step+1);
                  setTimeout(()=>{
                    document.getElementById('step-top')?.scrollIntoView({behavior:'smooth'});
                    document.getElementById('onboarding-main')?.scrollTo({top:0,behavior:'smooth'});
                    window.scrollTo({top:0,behavior:'smooth'});
                  },50)
                }} style={{ background:'#8B7BFF', border:'none', borderRadius:20, padding:'10px 24px', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                  Continuar →
                </button>
              ) : (
                <button onClick={()=>{}} disabled style={{ background:'rgba(139,123,255,0.1)', border:'1px solid rgba(139,123,255,0.2)', borderRadius:20, padding:'10px 24px', color:'#8B7BFF', fontSize:13, fontWeight:700, cursor:'default', display:'flex', alignItems:'center', gap:6 }}>
                  ↑ Activa arriba
                </button>
              )}
            </div>
          </div>
        </main>
        <BriefingPanel step={step} isMobile={isMobile} />
      </div>
    </div>
  )
}