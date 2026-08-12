import { demoRequest, isDemoMode } from "./demo";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
export class ApiError extends Error { constructor(message:string, public status:number, public details?:unknown){super(message)} }
let refreshPromise: Promise<string> | null = null;
async function refreshAccessToken(){
  if(!refreshPromise)refreshPromise=(async()=>{const refreshToken=localStorage.getItem("erp-refresh-token");if(!refreshToken)throw new ApiError("Session expired",401);const response=await fetch(`${API_URL}/auth/refresh`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refreshToken})});if(!response.ok)throw new ApiError("Session expired",401);const body=await response.json();localStorage.setItem("erp-access-token",body.data.accessToken);return body.data.accessToken as string})().finally(()=>{refreshPromise=null});
  return refreshPromise;
}
export async function api<T>(path:string, options:RequestInit={}, retry=true):Promise<T> {
  if(isDemoMode())return demoRequest<T>(path,options);
  const token=localStorage.getItem("erp-access-token");
  const response=await fetch(`${API_URL}${path}`,{...options,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{ }),...options.headers}});
  if(response.status===401&&retry&&path!=="/auth/login"&&path!=="/auth/refresh"){try{await refreshAccessToken();return api<T>(path,options,false)}catch{localStorage.removeItem("erp-access-token");localStorage.removeItem("erp-refresh-token");localStorage.removeItem("erp-user");window.dispatchEvent(new Event("erp-session-expired"));throw new ApiError("Your session has expired. Please sign in again.",401)}}
  if(response.status===204)return undefined as T;
  const body=await response.json().catch(()=>({message:"Unexpected server response"}));
  if(!response.ok)throw new ApiError(body.message||"Request failed",response.status,body.errors);
  return body.data as T;
}
