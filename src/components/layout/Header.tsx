import Link from "next/link";

export function Header() {
  return (
    <header className="app-header">
      <div className="header-inner header-brand-only">
        <Link href="/" className="platform-brand platform-brand-text-only" aria-label="红塘村可持续发展平台首页">
          <span className="brand-copy"><strong>红塘村可持续发展平台</strong></span>
        </Link>
      </div>
    </header>
  );
}
