<script lang="ts">
	import { Container, Center, Flex, Grid } from "@svelteuidev/core";

	import type { UploadResp, UploadResResp } from "$lib/types";
	import { onMount } from "svelte";
	import { page } from "$app/stores";

	let image: UploadResResp;

	onMount(async () => {
		let resp: UploadResp = JSON.parse(
			await (await fetch(`/api/images/${$page.params["id"]}`)).text()
		);
		image = resp.result;
		console.log(image);
	});
</script>

<Center class="m-8 text-xl font-black">Edit</Center>
{#if image}
	{#each image.variants as variant}
		<figure class="my-2">
			<img class="cursor-pointer" src={variant} alt={image.filename} />
		</figure>
	{/each}
{/if}
