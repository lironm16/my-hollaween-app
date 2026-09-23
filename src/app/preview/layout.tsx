export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh overflow-y-auto overscroll-contain">
      {children}
    </div>
  );
}
