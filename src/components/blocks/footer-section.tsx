'use client';
import React from 'react';
import Link from 'next/link';
import { LinkedinIcon } from 'lucide-react';

export function Footer() {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="relative w-full border-t bg-white dark:bg-black">
			<div className="max-w-6xl mx-auto px-6 py-8">
				{/* Main footer content */}
				<div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
					{/* Logo */}
					<Link href="/" className="inline-block">
						<h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-400">
							briki
						</h1>
					</Link>

					{/* Copyright */}
					<p className="text-sm text-gray-500 dark:text-gray-400 order-3 md:order-2">
						© {currentYear} Briki. All rights reserved.
					</p>

					{/* Contact links */}
					<div className="flex flex-col gap-2 order-2 md:order-3">
						<span className="text-sm font-medium text-gray-600 dark:text-gray-300">Contact:</span>
						<div className="flex flex-col gap-2">
							<a
								href="https://www.linkedin.com/company/brikiapp"
								className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
								target="_blank"
								rel="noopener noreferrer"
							>
								<LinkedinIcon className="w-5 h-5" />
								<span className="text-sm">LinkedIn</span>
							</a>
							<a
								href="mailto:contact@brikiapp.com"
								className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
							>
								contact@brikiapp.com
							</a>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}