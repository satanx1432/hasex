import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { UxQuestionnaireProvider } from "@/components/ux/questionnaire-context";
import { UxQuestionnaireModal } from "@/components/ux/questionnaire-modal";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: "Behavioral Operating System",
  description: "AI-driven goal achievement through behavioral science",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <UxQuestionnaireProvider>
            {children}
            <UxQuestionnaireModal />
          </UxQuestionnaireProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
