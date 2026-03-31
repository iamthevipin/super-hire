export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "linear-gradient(121deg, #fff5f0 0%, #f0faf7 100%)",
      }}
    >
      {children}
    </div>
  );
}
