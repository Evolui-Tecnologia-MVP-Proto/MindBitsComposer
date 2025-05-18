export default function Logo() {
  return (
    <svg
      className="h-8 w-auto mr-3"
      viewBox="0 0 100 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="8" fill="#1a56db" />
      <rect x="48" y="10" width="44" height="8" rx="4" fill="#10b981" />
      <rect x="48" y="22" width="44" height="8" rx="4" fill="#10b981" />
      <rect x="48" y="34" width="28" height="8" rx="4" fill="#10b981" />
      <path d="M18 15L25 25L18 35" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="25" r="4" fill="white" />
    </svg>
  );
}
