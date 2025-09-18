<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import "../app.css";
	import { GithubLogo, Underline } from "radix-icons-svelte";
	import { Footer } from "flowbite-svelte";

	let mounted = false;

	onMount(() => {
		mounted = true;
	});
</script>

{#if mounted}
	{#if $page.error}
		<div class="flex min-h-screen flex-col items-center justify-center">
			<slot />
		</div>
	{:else}
		<div class="container-app">
			<slot />
			<Footer class="my-4">
				<div
					class="flex items-center justify-center py-4 text-sm text-gray-600 dark:text-gray-400 w-full"
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
{:else}
	<div class="flex min-h-screen flex-col items-center justify-center"></div>
{/if}
