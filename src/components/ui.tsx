import Link from "next/link";

export function PageHeader({ title, back, subtitle }: { title: string; back?: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      {back && (
        <Link href={back} className="text-sm text-neutral-500 hover:underline">
          ← 뒤로
        </Link>
      )}
      <h1 className="mt-1 text-2xl font-bold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
    </header>
  );
}

export function Card({ children, href }: { children: React.ReactNode; href?: string }) {
  const className =
    "block rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
  if (href) {
    return (
      <Link href={href} className={`${className} transition hover:border-emerald-500`}>
        {children}
      </Link>
    );
  }
  return <div className={className}>{children}</div>;
}

export function Notice({ kind, children }: { kind: "error" | "success"; children: React.ReactNode }) {
  const color =
    kind === "error"
      ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  return <p className={`mb-4 rounded-xl px-4 py-3 text-sm ${color}`}>{children}</p>;
}

export const buttonClass =
  "rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300 dark:disabled:bg-neutral-700";
