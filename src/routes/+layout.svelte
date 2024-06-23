<script lang="ts">
	import { onMount, setContext } from "svelte";
	import { page } from "$app/stores";
	import "../app.css";
	import { Box, Center, Container, Footer, Loader } from "@svelteuidev/core";
	import { GithubLogo, Underline } from "radix-icons-svelte";

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
		<Container class="md:w-2/3 w-full mx-auto">
			<slot />
			<Footer height={48} class="my-4">
				<Center>
					<Box class="my-4"
						><strong>Imagio</strong> | Build with ♥️ at
						<a
							href="https://github.com/megrxu/imagio"
							target="_blank"><u>GitHub</u></a
						></Box
					>
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
