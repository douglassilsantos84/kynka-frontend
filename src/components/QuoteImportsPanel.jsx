import {useEffect,useRef,useState} from "react";
import {approveQuoteImport,getInventory,getQuoteImports,getSuppliers,matchQuoteImportItem,previewQuoteImport} from "../api/kynkaApi";

export default function QuoteImportsPanel(){
 const [suppliers,setSuppliers]=useState([]),[materials,setMaterials]=useState([]),[history,setHistory]=useState([]);
 const [supplierId,setSupplierId]=useState(""),[quote,setQuote]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const fileRef=useRef(null);
 async function load(){try{const [s,m,h]=await Promise.all([getSuppliers(),getInventory(),getQuoteImports()]);setSuppliers(s);setMaterials(m);setHistory(h)}catch(e){setError(msg(e))}}
 useEffect(()=>{load()},[]);
 async function importFile(e){e.preventDefault();const f=fileRef.current?.files?.[0];if(!f){setError("Selecione .xlsx, .csv ou PDF digital.");return}
  setBusy(true);setError("");setSuccess("");try{setQuote(await previewQuoteImport(f,supplierId?Number(supplierId):null));setSuccess("Cotação lida. Confira antes de aprovar.");await load()}catch(e){setError(msg(e))}finally{setBusy(false)}}
 async function match(id,code){if(!code)return;setBusy(true);try{setQuote(await matchQuoteImportItem(quote.id,id,code))}catch(e){setError(msg(e))}finally{setBusy(false)}}
 async function approve(){setBusy(true);setError("");try{setQuote(await approveQuoteImport(quote.id));setSuccess("Cotação aprovada. Catálogo e histórico atualizados.");await load()}catch(e){setError(msg(e))}finally{setBusy(false)}}
 const unresolved=quote?.items?.filter(x=>!x.matched_material_code).length??0;
 return <section className="dashboard quote-imports-panel">
  <div className="page-header"><div><span className="page-eyebrow">Etapa 21</span><h2>Importar cotações</h2><p>Excel, CSV e PDF digital com revisão humana antes de atualizar preços.</p></div></div>
  {error&&<div className="inventory-error">{error}</div>}{success&&<div className="inventory-success">{success}</div>}
  <form className="quote-import-card" onSubmit={importFile}><div className="quote-import-grid">
   <label>Fornecedor<select value={supplierId} onChange={e=>setSupplierId(e.target.value)}><option value="">Detectar automaticamente</option>{suppliers.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}</select></label>
   <label>Arquivo<input ref={fileRef} type="file" accept=".xlsx,.csv,.pdf"/></label>
  </div><button className="primary-button" disabled={busy}>{busy?"Analisando...":"Ler cotação"}</button></form>
  {quote&&<div className="quote-review"><div className="purchase-order-section-header"><div><h4>Cotação #{quote.id} — {quote.supplier_name}</h4><p>{quote.file_name} · {quote.items.length} item(ns) · {unresolved} pendente(s)</p></div><span className="purchase-order-count">{quote.status==="approved"?"Aprovada":"Em revisão"}</span></div>
   <div className="project-table-wrapper"><table className="project-table"><thead><tr><th>Ref.</th><th>Descrição</th><th>Material Kynka</th><th>Anterior</th><th>Novo</th><th>Variação</th><th>Confiança</th></tr></thead><tbody>
   {quote.items.map(x=><tr key={x.id}><td>{x.supplier_reference||"—"}</td><td>{x.description||"—"}</td><td>{quote.status==="approved"?x.matched_material_code:<select value={x.matched_material_code||""} onChange={e=>match(x.id,e.target.value)}><option value="">Revisar...</option>{materials.map(m=><option key={m.code} value={m.code}>{m.code} — {m.name}</option>)}</select>}</td><td>{money(x.previous_price)}</td><td><strong>{money(x.unit_price)}</strong></td><td>{pct(x.variation_percent)}</td><td>{x.matched_material_code?`${Math.round(Number(x.confidence||0)*100)}%`:"Revisão"}</td></tr>)}
   </tbody></table></div>
   {quote.status!=="approved"&&<div className="quote-approval-bar"><p>Só a aprovação grava preços no catálogo.</p><button type="button" className="primary-button" onClick={approve} disabled={busy||unresolved>0}>{unresolved?`Resolver ${unresolved} item(ns)`:"Aprovar e atualizar preços"}</button></div>}
  </div>}
  <div className="quote-history"><h3>Importações recentes</h3>{history.length===0?<p className="purchase-order-empty">Nenhuma cotação importada.</p>:history.slice(0,10).map(x=><button type="button" className="quote-history-row" key={x.id} onClick={()=>setQuote(x)}><span>#{x.id} · {x.supplier_name||"Fornecedor"}</span><span>{x.file_name}</span><strong>{x.status==="approved"?"Aprovada":"Revisão"}</strong></button>)}</div>
 </section>
}
function money(v){return v==null?"—":Number(v).toLocaleString("pt-PT",{style:"currency",currency:"EUR"})}
function pct(v){if(v==null)return"—";const n=Number(v);return`${n>=0?"+":""}${n.toFixed(2)}%`}
function msg(e){return e instanceof Error?e.message:"Erro inesperado."}
