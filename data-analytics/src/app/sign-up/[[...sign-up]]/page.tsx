import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-[#09090b] px-4 py-12">
      <SignUp />
    </div>
  );
}