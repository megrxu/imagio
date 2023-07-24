<script>
	import { onMount } from "svelte";
	import "../app.css";
	import { Loader } from "@svelteuidev/core";

	let mounted = false;

	onMount(() => {
		mounted = true;
	});
</script>

{#if mounted}
	<slot />
{:else}
	<div
		style="display: flex; height: 100vh; flex-direction: column; align-items: center; justify-content: center;"
	>
		<Loader />
	</div>
{/if}
