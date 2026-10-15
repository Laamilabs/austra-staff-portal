import Logo from "../ui/Logo";

export default function PortalHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-16 max-w-400 items-center justify-between px-6 lg:px-8">
        <Logo />

        <div className="text-sm font-medium text-zinc-500">
          Portal
        </div>
      </div>
    </header>
  );
}