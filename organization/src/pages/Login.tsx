import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { viewForRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";import { Input } from "@/components/ui/input";import { Label } from "@/components/ui/label";import { AlertCircle, ArrowLeft, ArrowRight, LockKeyhole, Loader2 } from "lucide-react";

type User = { id: string; name: string; email: string; role: string; organizationId?: string; branchId?: string };

/** The website's "Student Login" and "Franchise Login" links arrive with
 *  `?as=`. It only changes the wording: the workspace is still decided by the
 *  account that signs in. */
const PORTALS = {
  student: { title: "Student Login", intro: "Sign in with the login ID and password your institute gave you." },
  franchise: { title: "Franchise Login", intro: "Sign in with your franchise (branch) account to manage your centre." },
} as const;

export default function Login(){
  const location=useLocation();
  // Set by ProtectedRoute when it turns an unauthenticated visit away, so a
  // reload of a deep page returns there instead of dropping onto the dashboard.
  const from=(location.state as {from?:{pathname:string;search:string}}|null)?.from;
  const portal=PORTALS[new URLSearchParams(location.search).get("as") as keyof typeof PORTALS];
  const [user,setUser]=useState<User|null>(null);
  const [identifier,setIdentifier]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    const saved=localStorage.getItem("erp-user");
    if(saved) setUser(JSON.parse(saved));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(session?.user){
        const meta=session.user.user_metadata||{};
        const u:User={id:session.user.id,name:meta.name||session.user.email||"",email:session.user.email||"",role:meta.role||"STAFF",organizationId:meta.organizationId||null,branchId:meta.branchId||null};
        setUser(u);
        localStorage.setItem("erp-user",JSON.stringify(u));
      }else{
        setUser(null);
        localStorage.removeItem("erp-user");
      }
    });
    return()=>{subscription.unsubscribe()};
  },[]);

  if(user){
    const view=viewForRole(user.role);
    const home=view==="student"?"/me":"/";
    // Students always land in their own portal; a remembered admin/franchise
    // path wins over the generic dashboard.
    const target=view==="student"?home:(from?`${from.pathname}${from.search||""}`:home);
    return <Navigate to={target} replace/>;
  }

  const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError("");try{
    const email=identifier.includes("@")?identifier:`${identifier}@pushpak.local`;
    const{error:err}=await supabase.auth.signInWithPassword({email,password});
    if(err) throw new Error(err.message);
  }catch(err){setError(err instanceof Error?err.message:"Unable to sign in")}finally{setBusy(false)}};
return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#020617] p-5 text-white">
  <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_-8%,hsl(221_83%_53%/.28),transparent_38rem),radial-gradient(circle_at_10%_100%,hsl(243_75%_59%/.18),transparent_32rem)]"/>
  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[.35] [background-image:linear-gradient(hsl(214_60%_80%/.05)_1px,transparent_1px),linear-gradient(90deg,hsl(214_60%_80%/.05)_1px,transparent_1px)] [background-size:64px_64px]"/>
  <div className="relative w-full max-w-md"><div className="mb-8 flex items-center gap-3.5"><img src={`${import.meta.env.BASE_URL}idealdigiskills-logo.png`} alt="" className="h-14 w-14 rounded-2xl bg-white object-contain"/><div><p className="text-lg font-semibold tracking-[-.02em]">Idealdigiskills ERP</p><p className="text-[11px] font-semibold uppercase tracking-[.13em] text-white/40">Secure institutional workspace</p></div></div><form onSubmit={submit} className="rounded-[1.4rem] border border-white/10 bg-white/[.05] p-6 shadow-2xl backdrop-blur-xl sm:p-8"><div className="mb-7 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#4f46e5] text-white"><LockKeyhole/></div><h1 className="text-3xl font-semibold tracking-[-.04em]">{portal?.title??"Welcome back"}</h1><p className="mt-2 text-sm text-white/55">{portal?.intro??"Sign in with your authorised account — administrator, franchise or student. Your workspace is decided by that authorisation."}</p>{error&&<div className="mt-5 flex gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</div>}<div className="mt-7 space-y-5"><div className="space-y-2"><Label htmlFor="identifier">Email or username</Label><Input id="identifier" autoComplete="username" value={identifier} onChange={e=>setIdentifier(e.target.value)} required className="border-white/15 bg-white/5 text-white"/></div><div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required className="border-white/15 bg-white/5 text-white"/></div><Button type="submit" disabled={busy} className="w-full">{busy?<Loader2 className="animate-spin"/>:<>Sign in<ArrowRight/></>}</Button></div></form><p className="mt-5 text-center text-xs text-white/35">Access is logged and monitored for institutional security.</p><a href="/" className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-white/55 hover:text-white"><ArrowLeft className="h-3.5 w-3.5"/>Back to website</a></div></main>}
