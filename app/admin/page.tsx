import { notFound } from "next/navigation";
import { AdminConsole } from "../../components/admin/AdminConsole";

// Dev-only console for inspecting the apps kids build — source, version history, diff,
// and rollback, across every project. NOT for kids. The v0 gate is NODE_ENV: this route
// 404s in any production build, and its client bundle isn't shipped. Real protection
// rides on Phase-1 Clerk auth (there is no auth in v0 — see docs/adr/0008 + D7).
export default function AdminPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <AdminConsole />;
}
