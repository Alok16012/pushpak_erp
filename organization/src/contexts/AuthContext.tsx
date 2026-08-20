import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { demoUsers, disableDemoMode, enableDemoMode, isDemoMode } from "@/lib/demo";
import { viewForRole, type View } from "@/lib/roles";
type User={id:string;name:string;email:string;role:string;organizationId?:string;branchId?:string};
type Auth={user:User|null;view:View;demo:boolean;login:(identifier:string,password:string)=>Promise<void>;loginDemo:(view?:View)=>void;logout:()=>Promise<void>};
const Context=createContext<Auth|null>(null);
export function AuthProvider({children}:{children:React.ReactNode}){const [user,setUser]=useState<User|null>(()=>{try{return JSON.parse(localStorage.getItem("erp-user")||"null")}catch{return null}});const [demo,setDemo]=useState(isDemoMode);
 useEffect(()=>{const expire=()=>setUser(null);window.addEventListener("erp-session-expired",expire);return()=>window.removeEventListener("erp-session-expired",expire)},[]);
 const login=async(identifier:string,password:string)=>{const data=await api<{accessToken:string;refreshToken:string;user:User}>("/auth/login",{method:"POST",body:JSON.stringify({identifier,password})});localStorage.setItem("erp-access-token",data.accessToken);localStorage.setItem("erp-refresh-token",data.refreshToken);localStorage.setItem("erp-user",JSON.stringify(data.user));setUser(data.user)};
 /** Demo sign-in still goes through a role: the view is derived from the demo
  *  account's role exactly as it is for a real one. */
 const loginDemo=(view:View="admin")=>{const account=demoUsers[view];enableDemoMode();localStorage.setItem("erp-user",JSON.stringify(account));setDemo(true);setUser(account)};
 const logout=async()=>{const refreshToken=localStorage.getItem("erp-refresh-token");try{await api("/auth/logout",{method:"POST",body:JSON.stringify({refreshToken})})}catch{}disableDemoMode();localStorage.removeItem("erp-access-token");localStorage.removeItem("erp-refresh-token");localStorage.removeItem("erp-user");setDemo(false);setUser(null)};
 return <Context.Provider value={{user,view:viewForRole(user?.role),demo,login,loginDemo,logout}}>{children}</Context.Provider>}
export const useAuth=()=>{const value=useContext(Context);if(!value)throw new Error("AuthProvider missing");return value};
