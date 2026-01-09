"use client";

import { useSession, signOut } from "next-auth/react";

export default function GlobalAuthBar() {
  const { data: session, status } = useSession();

  if (status !== "authenticated" || !session?.user) {
    return null;
  }

  const user = session.user as any;

  return (
    <div className="fixed top-2 right-2 z-[1000]">
      <div className="flex items-center gap-2 rounded-lg bg-white/90 backdrop-blur px-3 py-2 shadow border border-slate-200">
        <span className="text-sm text-slate-700">
          {user?.name || user?.email} · {user?.role}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm px-2 py-1 bg-slate-700 text-white rounded hover:bg-slate-800"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
