<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import "../app.css";
	import { Footer } from "flowbite-svelte";
	import NotificationHost from "$lib/ui/NotificationHost.svelte";

	onMount(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const applyTheme = (isDark: boolean) => {
			document.documentElement.classList.toggle("dark", isDark);
		};
		applyTheme(media.matches);
		const onChange = (event: MediaQueryListEvent) => applyTheme(event.matches);
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	});
</script>


{#if $page.error}
	<div class="flex min-h-screen flex-col items-center justify-center">
		<slot />
	</div>
{:else}
	<div class="container-app">
		<slot />
		<!-- Global notifications -->
		<div class="pointer-events-none">
			<!-- pointer-events restored inside toast cards -->
			<svelte:component this={NotificationHost} />
		</div>
		<Footer class="my-4">
			<div
				class="flex items-center justify-center py-4 text-sm text-muted w-full"
			>
				<strong class="mr-1">Imagio</strong> | Build with ♥️ at
				<a
					class="ml-1 underline"
					href="https://github.com/megrxu/imagio"
					target="_blank"
					rel="noreferrer">GitHub</a
				>
			</div>
		</Footer>
	</div>
{/if}
