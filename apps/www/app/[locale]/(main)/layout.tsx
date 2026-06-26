import { MainLayoutContent } from "@/components/layout/main-layout-content";

type MainLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function MainLayout({
  children,
  params,
}: MainLayoutProps) {
  await params;

  return <MainLayoutContent>{children}</MainLayoutContent>;
}
