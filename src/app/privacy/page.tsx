import React from "react";
import Head from "next/head";

export const metadata = {
  title: "Privacy Policy | Briki AI",
  description: "Read Briki's Privacy Policy to understand how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12 text-neutral-900 dark:text-white">
      <Head>
        <title>Privacy Policy | Briki AI</title>
        <meta name="description" content="Read Briki's Privacy Policy to understand how we collect, use, and protect your data." />
        <link rel="canonical" href="https://www.brikiapp.com/privacy" />
      </Head>
      <h1 className="text-3xl md:text-4xl font-bold mb-6">Privacy Policy</h1>
      <p className="mb-2 font-medium">Effective Date: July 12, 2025</p>
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold mt-8 mb-2">1. Introduction</h2>
        <p>Welcome to Briki, an AI-powered learning and project-building platform designed to help non-technical users, students, and aspiring creators bring their ideas to life using artificial intelligence. Your privacy is important to us. This Privacy Policy explains how we collect, use, share, and protect your personal information when you interact with Briki through our website, mobile applications, and associated services.</p>
        <h2 className="text-2xl font-semibold mt-8 mb-2">2. Who We Are</h2>
        <p>Briki is operated by Briki Technologies S.A.S., a company registered in Colombia.</p>
        <ul className="list-disc ml-6">
          <li>Email: <a href="mailto:privacy@brikiapp.com" className="underline">privacy@brikiapp.com</a></li>
          <li>Address: Calle 123 #45-67, Bogotá, Colombia</li>
        </ul>
        <h2 className="text-2xl font-semibold mt-8 mb-2">3. Information We Collect</h2>
        <h3 className="text-xl font-semibold mt-4 mb-1">3.1 Information You Provide to Us</h3>
        <ul className="list-disc ml-6">
          <li>Name, email address, and profile photo when you sign in (e.g., via Google OAuth)</li>
          <li>Project descriptions and learning goals</li>
          <li>Messages and content you share with the Briki assistant</li>
          <li>Feedback, survey responses, and support inquiries</li>
        </ul>
        <h3 className="text-xl font-semibold mt-4 mb-1">3.2 Information We Collect Automatically</h3>
        <ul className="list-disc ml-6">
          <li>IP address and browser type</li>
          <li>Device information and operating system</li>
          <li>Usage data, such as time spent on platform, clicks, and pages visited</li>
          <li>AI interactions for product improvement and safety monitoring</li>
        </ul>
        <h3 className="text-xl font-semibold mt-4 mb-1">3.3 Information from Third Parties</h3>
        <ul className="list-disc ml-6">
          <li>OAuth providers (e.g., Google) may provide name, email, and profile picture</li>
          <li>Analytics tools like Vercel Insights or PostHog</li>
        </ul>
        <h2 className="text-2xl font-semibold mt-8 mb-2">4. How We Use Your Information</h2>
        <ul className="list-disc ml-6">
          <li>Provide and maintain the Briki platform</li>
          <li>Personalize your experience and learning journey</li>
          <li>Improve our AI assistant and roadmap generation features</li>
          <li>Monitor usage trends and optimize performance</li>
          <li>Respond to user inquiries and provide support</li>
          <li>Ensure safety, security, and legal compliance</li>
        </ul>
        <h2 className="text-2xl font-semibold mt-8 mb-2">5. Sharing Your Information</h2>
        <p>We do not sell your personal data. We may share your information in the following circumstances:</p>
        <ul className="list-disc ml-6">
          <li>With service providers (e.g., Supabase, Vercel, Render) for hosting and analytics</li>
          <li>With legal authorities if required by law or to protect rights and safety</li>
          <li>In business transfers if Briki is involved in a merger or acquisition</li>
        </ul>
        <h2 className="text-2xl font-semibold mt-8 mb-2">6. Data Storage and Security</h2>
        <p>We store data on secure servers hosted by Supabase and Vercel. We implement industry-standard security practices including encryption in transit, secure authentication protocols, and role-based access control (RLS) for data access.</p>
        <h2 className="text-2xl font-semibold mt-8 mb-2">7. Your Rights and Choices</h2>
        <p>You have the right to:</p>
        <ul className="list-disc ml-6">
          <li>Access the personal data we hold about you</li>
          <li>Request correction or deletion of your data</li>
          <li>Object to or restrict certain types of data processing</li>
          <li>Withdraw consent where applicable</li>
        </ul>
        <p>To exercise these rights, please contact us at <a href="mailto:privacy@brikiapp.com" className="underline">privacy@brikiapp.com</a>.</p>
        <h2 className="text-2xl font-semibold mt-8 mb-2">8. Data Retention</h2>
        <p>We retain your information as long as your account is active or as needed to provide services. We may also retain certain information to comply with legal obligations or resolve disputes.</p>
        <h2 className="text-2xl font-semibold mt-8 mb-2">9. Children’s Privacy</h2>
        <p>Briki is not intended for children under 13. We do not knowingly collect personal data from children. If we learn that we have collected data from a child without parental consent, we will delete it.</p>
        <h2 className="text-2xl font-semibold mt-8 mb-2">10. Cookies and Tracking Technologies</h2>
        <p>We use cookies and similar technologies to:</p>
        <ul className="list-disc ml-6">
          <li>Keep you signed in</li>
          <li>Analyze usage and performance</li>
          <li>Customize content delivery</li>
        </ul>
        <p>You may modify cookie settings through your browser.</p>
        <h2 className="text-2xl font-semibold mt-8 mb-2">11. International Users</h2>
        <p>Briki is based in Colombia, but we may process data in other countries. By using our platform, you consent to the transfer and processing of your information outside of your country of residence.</p>
        <h2 className="text-2xl font-semibold mt-8 mb-2">12. Updates to This Policy</h2>
        <p>We may update this Privacy Policy periodically. We will notify you of material changes through the app or by email. Please review this policy regularly.</p>
        <h2 className="text-2xl font-semibold mt-8 mb-2">13. Contact Information</h2>
        <ul className="list-disc ml-6">
          <li>Privacy Officer: Natalia Rodríguez</li>
          <li>Email: <a href="mailto:privacy@brikiapp.com" className="underline">privacy@brikiapp.com</a></li>
          <li>Phone: +57 1 800 123 4567</li>
          <li>Briki Technologies S.A.S., Calle 123 #45-67, Bogotá, Colombia</li>
        </ul>
        <p className="mt-8 text-sm text-neutral-500">All rights reserved © 2025</p>
      </section>
    </main>
  );
} 