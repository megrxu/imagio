<script>
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import "../app.css";
	import { Container, Loader } from "@svelteuidev/core";
	import { error } from "@sveltejs/kit";

	let mounted = false;

	onMount(() => {
		mounted = true;
	});
</script>

{#if mounted}
	{#if $page.error}
		<div
			style="display: flex; height: 100vh; flex-direction: column; align-items: center; justify-content: center;"
		>
			<slot />
		</div>
	{:else}
		<Container class="md:w-2/3 w-full mx-4">
			<slot />
		</Container>
	{/if}
{:else}
	<div
		style="display: flex; height: 100vh; flex-direction: column; align-items: center; justify-content: center;"
	>
		<Loader />
	</div>
{/if}
