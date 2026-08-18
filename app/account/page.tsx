import type { Metadata } from "next";
import Link from "next/link";

import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "@/app/chatgpt-auth";
import { AccountCenter } from "@/components/account-center";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: "Cuenta", description: "Acceso, perfil y sincronización opcional de Hypermociones." };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getChatGPTUser();
  return <AppShell active="account">
    <section className="page-header account-hero"><div><p className="eyebrow">Cuenta opcional</p><h1>{user ? `Hola, ${user.displayName}` : "Lleva tu equipo contigo."}</h1><p>{user ? "Gestiona tu perfil y decide cuándo sincronizar tus datos." : "Sigue usando Hypermociones sin cuenta o accede para mantener una copia entre dispositivos."}</p></div>{user ? <a className="button" href={chatGPTSignOutPath("/")}>Cerrar sesión</a> : <Link className="button button-primary" href={chatGPTSignInPath("/account")}>Crear cuenta o acceder con ChatGPT</Link>}</section>
    {user ? <AccountCenter email={user.email} initialName={user.displayName} signOutHref={chatGPTSignOutPath("/")} /> : <section className="account-benefits"><article><strong>Sin contraseñas nuevas</strong><p>El acceso utiliza tu identidad de ChatGPT y Hypermociones no recibe tu contraseña.</p></article><article><strong>Control explícito</strong><p>La sincronización solo ocurre cuando la solicitas y puedes eliminar la copia.</p></article><article><strong>Modo invitado intacto</strong><p>Las herramientas continúan funcionando localmente aunque no inicies sesión.</p></article></section>}
  </AppShell>;
}
