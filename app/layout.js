import './globals.css'

export const metadata = {
  title: 'Code-Cure AI — Debug. Fix. Learn.',
  description: 'AI-powered coding assistant with multilingual explanations',
}

export default function RootLayout({ children }) {
  return (
    <html lang="hi">
      <body>{children}</body>
    </html>
  )
}
