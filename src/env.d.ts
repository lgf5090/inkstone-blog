/// <reference types="astro/client" />
import type { BlogRuntimeConfig } from './server/site-config'

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare global {
	namespace App {
		interface Locals extends Runtime {
			blog: BlogRuntimeConfig
			blogError: string | null
		}
	}
}

export {}
