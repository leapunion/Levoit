import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Levoit GEO Platform",
  description:
    "Reddit VOC + Amazon Rufus GEO unified analytics and operations platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isAuthenticated =
    cookieStore.get("levoit_session")?.value === "authenticated";

  return (
    <html lang="en">
      <body className={inter.className}>
        {isAuthenticated ? (
          <div className="flex h-screen overflow-hidden bg-gray-50">
            {/* Sidebar (fixed 224px) */}
            <Sidebar />

            {/* Main area */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Header (fixed 56px) */}
              <Header />

              {/* Scrollable content */}
              <main className="flex-1 overflow-y-auto px-6 py-5">
                {children}
              </main>
            </div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
