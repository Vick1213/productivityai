"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ClerkProvider,
  SignedOut,
  SignInButton,
  SignedIn,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Marketing / Landing page (/) for **SocialScape App**
 * Inspired by modern social productivity platforms
 */
export default function HomePage() {
  return (
    <ClerkProvider>
      {/* NAVBAR */}
      <header className="sticky top-0 z-20 w-full bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto flex items-center justify-between py-4 px-6">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <Image src="/logo.svg" alt="SocialScape App" width={32} height={32} />
            SocialScape App
          </Link>

          {/* Auth */}
          <div>
            <SignedOut>
              <SignInButton mode="modal">
                <Button>Sign&nbsp;In</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton
                appearance={{ elements: { userButtonAvatarBox: "w-10 h-10" } }}
              />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-[#26D16D]/5 py-24">
        <div className="container mx-auto grid md:grid-cols-2 gap-12 px-6 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center md:text-left"
          >
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
              Connect, Collaborate &amp; <span className="text-[#26D16D]">Create Together</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto md:mx-0">
              SocialScape App combines social networking with powerful productivity tools, creating 
              collaborative workspaces where teams can connect, share ideas, and achieve more together.
            </p>
            <Link href="/dashboard" passHref>
              <Button size="lg" className="px-8 py-6 text-lg">
                Join the Community <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>

          {/* Screenshot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="shadow-2xl rounded-xl overflow-hidden border"
          >
            <Image
              src="/dashboard-screenshot.png"
              alt="SocialScape App dashboard screenshot"
              width={960}
              height={600}
              placeholder="blur"
              blurDataURL="/placeholder-blur.png"
              priority
            />
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything you need for social productivity</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-16">
            From team collaboration to social networking, SocialScape App brings together 
            communication, project management, and community building in one unified platform.
          </p>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Smart task inbox",
                desc: "Capture ideas anywhere. AI prioritises and categorises them automatically.",
                icon: "inbox",
              },
              {
                title: "Adaptive scheduling",
                desc: "Auto-blocks time for tasks based on your energy levels and calendar load.",
                icon: "calendar",
              },
              {
                title: "Contextual reminders",
                desc: "Get nudges only when they’re relevant—no more notification overload.",
                icon: "bell",
              },
              {
                title: "Progress analytics",
                desc: "Visualise focus trends and completion rates to improve week over week.",
                icon: "bar-chart-2",
              },
              {
                title: "AI delegation",
                desc: "Let the assistant draft emails, find documents, or create subtasks for you.",
                icon: "sparkles",
              },
              {
                title: "Cross-platform sync",
                desc: "Web, iOS, Android, macOS &amp; Windows—your data follows you everywhere.",
                icon: "sync",
              },
            ].map((f) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="p-6 bg-muted/50 rounded-2xl shadow-sm h-full"
              >
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#00A82D]/10 py-24">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to reclaim your focus?
          </h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
            Sign in and plan your most productive week yet—free forever for individual users.
          </p>

          <SignedOut>
            <SignInButton mode="modal">
              <Button size="lg" className="px-8 py-6 text-lg">
                Create your free account <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <Button size="lg" className="px-8 py-6 text-lg">
                Go to dashboard <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t bg-background">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row justify-between gap-6 text-sm">
          <p className="text-muted-foreground">© {new Date().getFullYear()} SocialScape App. All rights reserved.</p>
          <nav className="flex gap-4">
            <Link className="hover:underline" href="/privacy">Privacy</Link>
            <Link className="hover:underline" href="/terms">Terms</Link>
            <Link className="hover:underline" href="mailto:hello@socialscape.app">Contact</Link>
          </nav>
        </div>
      </footer>
    </ClerkProvider>
  );
}
