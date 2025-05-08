import './globals.css'

export const metadata = {
  title: 'Chat-Sec-1: Secure Chat Application',
  description: 'A secure chat application with end-to-end encryption and digital signatures',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
