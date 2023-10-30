<script lang="ts">
	import { onMount, setContext } from "svelte";
	import { page } from "$app/stores";
	import "../app.css";
	import { Box, Center, Container, Footer, Loader } from "@svelteuidev/core";

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
			<Footer height={48}>
				<Center>
					<Box class="my-4">Imageio</Box>
				</Center>
			</Footer>
		</Container>
	{/if}
{:else}
	<div
		style="display: flex; height: 100vh; flex-direction: column; align-items: center; justify-content: center;"
	>
		<Loader />
	</div>
{/if}
