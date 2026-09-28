import { auth, currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100">
      <header className="flex h-16 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold text-lg text-zinc-900 dark:text-white">
            DataAnalytics
          </Link>
          <span className="text-xs text-zinc-500">| User Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-500 font-mono">ID: {userId}</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-8">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm">
          <h1 className="text-2xl font-bold">
            Welcome, {user?.firstName || user?.emailAddresses[0]?.emailAddress}!
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Authentication is verified. Next step: connect MongoDB Atlas and Vercel Blob to load and persist your datasets under this user account[cite: 1].
          </p>
        </div>
      </main>
    </div>
  );
}