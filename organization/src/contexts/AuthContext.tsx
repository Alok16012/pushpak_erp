import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { demoUser, disableDemoMode, enableDemoMode, isDemoMode } from "@/lib/demo";
type User={id:string;name:string;email:string;role:string;organizationId?:string;branchId?:string};
type Auth={user:User|null;demo:boolean;login:(identifier:string,password:string)=>Promise<void>;loginDemo:()=>void;logout:()=>Promise<void>};
const Context=createContext<Auth|null>(null);
export function AuthProvider({children}:{children:React.ReactNode}){const [user,setUser]=useState<User|null>(()=>{try{return JSON.parse(localStorage.getItem("erp-user")||"null")}catch{return null}});const [demo,setDemo]=useState(isDemoMode);
 useEffect(()=>{const expire=()=>setUser(null);window.addEventListener("erp-session-expired",expire);return()=>window.removeEventListener("erp-session-expired",expire)},[]);
 const login=async(identifier:string,password:string)=>{const data=await api<{accessToken:string;refreshToken:string;user:User}>("/auth/login",{method:"POST",body:JSON.stringify({identifier,password})});localStorage.setItem("erp-access-token",data.accessToken);localStorage.setItem("erp-refresh-token",data.refreshToken);localStorage.setItem("erp-user",JSON.stringify(data.user));setUser(data.user)};
 const loginDemo=()=>{enableDemoMode();localStorage.setItem("erp-user",JSON.stringify(demoUser));setDemo(true);setUser(demoUser)};
 const logout=async()=>{const refreshToken=localStorage.getItem("erp-refresh-token");try{await api("/auth/logout",{method:"POST",body:JSON.stringify({refreshToken})})}catch{}disableDemoMode();localStorage.removeItem("erp-access-token");localStorage.removeItem("erp-refresh-token");localStorage.removeItem("erp-user");setDemo(false);setUser(null)};
 return <Context.Provider value={{user,demo,login,loginDemo,logout}}>{children}</Context.Provider>}
export const useAuth=()=>{const value=useContext(Context);if(!value)throw new Error("AuthProvider missing");return value};
