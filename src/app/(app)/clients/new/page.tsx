import Link from "next/link";
import { ClientForm } from "@/features/recruiter/clients/ui/ClientForm";
import { crearClienteAction } from "@/features/recruiter/clients/actions";

export default function NewClientPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-sm text-muted">
        <Link href="/clients" className="hover:text-text">
          Clientes
        </Link>
        <span aria-hidden>/</span>
        <span className="text-text">Nuevo</span>
      </nav>
      <h1 className="font-display text-xl font-bold text-text">Agregar cliente</h1>
      <ClientForm action={crearClienteAction} submitLabel="Crear cliente" />
    </div>
  );
}
