<script lang="ts">
	import { Container, Center, Flex, Grid } from "@svelteuidev/core";
	import type { UploadResResp, ListResp } from "$lib/types";
	import { onMount } from "svelte";
	import { clickToCopy } from "$lib";

	let images: UploadResResp[] = [];

	async function listImages() {
		let resp = await fetch("/api/list");
		let imagesResp: ListResp = JSON.parse(await resp.text());
		images = imagesResp.result.images;
	}

	onMount(async () => {
		await listImages();
	});

	function getUUID(url: string): string | undefined {
		return url.split("/").at(-2);
	}

	function getVariant(url: string, variant: string): string {
		let segs = url.split("/");
		segs.pop();
		segs.push(variant);
		return segs.join("/");
	}
</script>

<Container class="w-2/3">
	<Center class="m-8 text-xl font-black">Show</Center>
	<Grid class="w-full">
		{#each images as image}
			<Grid.Col span={3}>
				<figure>
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
					<img
						class="cursor-pointer"
						on:click={async () =>
							await clickToCopy(getUUID(image.variants[0]))}
						src={getVariant(image.variants[0], "square")}
						alt={image.filename}
					/>
				</figure>
			</Grid.Col>
		{/each}
	</Grid>
</Container>
