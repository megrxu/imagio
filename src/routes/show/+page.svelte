<script lang="ts">
	import { Container, Center, Flex, Grid } from "@svelteuidev/core";
	import type { UploadResResp, ListResp } from "$lib/types";
	import { onMount } from "svelte";

	let images: UploadResResp[] = [];

	async function listImages() {
		let resp = await fetch("/api/list");
		let imagesResp: ListResp = JSON.parse(await resp.text());
		images = imagesResp.result.images;
	}

	onMount(async () => {
		await listImages();
	});
</script>

<Container class="w-2/3">
	<Center class="m-8 text-xl font-black">Show</Center>
	<Grid class="w-full">
		{#each images as image}
			<Grid.Col span={3}>
				<figure>
					<a href={image.variants[0]} target="_blank">
						<img src={image.variants[0]} alt={image.filename} />
					</a>
				</figure>
			</Grid.Col>
		{/each}
	</Grid>
</Container>
