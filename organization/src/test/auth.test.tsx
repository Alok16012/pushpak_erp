import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

describe("authenticated application boundary",()=>{
  beforeEach(()=>localStorage.clear());
  it("redirects anonymous users to sign in",()=>{render(<MemoryRouter initialEntries={["/"]}><AuthProvider><Routes><Route path="/login" element={<p>Secure sign in</p>}/><Route element={<ProtectedRoute/>}><Route path="/" element={<p>Private ERP</p>}/></Route></Routes></AuthProvider></MemoryRouter>);expect(screen.getByText("Secure sign in")).toBeInTheDocument();expect(screen.queryByText("Private ERP")).not.toBeInTheDocument();});
  it("allows a persisted authenticated session",()=>{localStorage.setItem("erp-user",JSON.stringify({id:"u1",name:"Admin",email:"admin@example.com",role:"ORGANIZATION_ADMIN"}));render(<MemoryRouter initialEntries={["/"]}><AuthProvider><Routes><Route path="/login" element={<p>Secure sign in</p>}/><Route element={<ProtectedRoute/>}><Route path="/" element={<p>Private ERP</p>}/></Route></Routes></AuthProvider></MemoryRouter>);expect(screen.getByText("Private ERP")).toBeInTheDocument();});
});
