import {useEffect,useState} from "react";
import {bootstrapAdmin,getBootstrapStatus,getMe,login,setAuthToken} from "../api/kynkaApi";
export default function AuthGate({children}){
 const [loading,setLoading]=useState(true),[bootstrap,setBootstrap]=useState(false),[user,setUser]=useState(null),[error,setError]=useState("");
 const [form,setForm]=useState({organization_name:"Kynka",name:"",email:"",password:""});
 useEffect(()=>{(async()=>{try{const s=await getBootstrapStatus();if(s.required){setBootstrap(true);return}try{setUser(await getMe())}catch{setAuthToken("")}}catch(e){setError(e.message)}finally{setLoading(false)}})()},[]);
 async function submit(e){e.preventDefault();setLoading(true);setError("");try{const x=bootstrap?await bootstrapAdmin(form):await login(form.email,form.password);setAuthToken(x.access_token);setUser(x.user);setBootstrap(false)}catch(e){setError(e.message)}finally{setLoading(false)}}
 if(loading&&!user)return <div className="auth-screen"><div className="auth-card"><h1>KYNKA</h1><p>A carregar...</p></div></div>;
 if(user)return children;
 return <div className="auth-screen"><form className="auth-card" onSubmit={submit}><div className="auth-logo">K</div><h1>KYNKA</h1><p>{bootstrap?"Criar ambiente administrativo":"Entrar na Agentic Platform"}</p>{error&&<div className="auth-error">{error}</div>}{bootstrap&&<><label>Organizacao<input required value={form.organization_name} onChange={e=>setForm({...form,organization_name:e.target.value})}/></label><label>Nome<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label></>}<label>Email<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Senha<input required minLength="8" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label><button>{bootstrap?"Criar ambiente":"Entrar"}</button></form></div>
}