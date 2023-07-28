<script lang="ts">
	import { Container, Center, Flex, Grid, Button } from "@svelteuidev/core";
	import { ActionIcon } from "@svelteuidev/core";
	import {
		Copy,
		MagnifyingGlass,
		InfoCircled,
		Pencil2,
	} from "radix-icons-svelte";
	import type { UploadResResp } from "$lib/types";
	import { onMount } from "svelte";
	import { clipboard } from "@svelteuidev/composables";
	import { getUUID, getVariant, listImages, imageURL } from "$lib";

	let images: UploadResResp[] = [];

	onMount(async () => {
		images = await listImages();
	});
</script>

<Center class="m-8 text-xl font-black">Show</Center>
<Grid>
	{#each images as image}
		<Grid.Col sm={12} md={6} lg={3}>
			<figure class="my-2">
				<img
					class="cursor-pointer"
					src={getVariant(image.variants[0], "square")}
					alt={image.filename}
				/>
			</figure>
			<Flex align="left">
				<ActionIcon
					class="inline-block"
					use={[[clipboard, getUUID(image.variants[0])]]}
				>
					<Copy />
				</ActionIcon>
				<ActionIcon
					root="a"
					href={imageURL(image.id, "download")}
					class="inline-block"><MagnifyingGlass /></ActionIcon
				>
				<ActionIcon class="inline-block"><InfoCircled /></ActionIcon>
				<ActionIcon class="inline-block"><Pencil2 /></ActionIcon>
			</Flex>
		</Grid.Col>
	{/each}
</Grid>
