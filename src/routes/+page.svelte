<script lang="ts">
	import { Center, Flex, Grid } from "@svelteuidev/core";
	import { ActionIcon } from "@svelteuidev/core";
	import {
		Copy,
		MagnifyingGlass,
		InfoCircled,
		Pencil2,
		Cross2,
	} from "radix-icons-svelte";
	import type { UploadResResp } from "$lib/types";
	import { onMount } from "svelte";
	import { clipboard } from "@svelteuidev/composables";
	import { getUUID, getVariant, listImages } from "$lib";

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
				<ActionIcon use={[[clipboard, getUUID(image.variants[0])]]}>
					<Copy />
				</ActionIcon>
				<ActionIcon root="a" href={`/api/images/${image.id}/blob`}>
					<MagnifyingGlass /></ActionIcon
				>
				<ActionIcon><InfoCircled /></ActionIcon>
				<ActionIcon root="a" href={`/images/${image.id}`}
					><Pencil2 /></ActionIcon
				>
				<ActionIcon
					on:click={async () => {
						await fetch(`/api/images/${image.id}`, {
							method: "DELETE",
						});
						images = images.filter((i) => i.id !== image.id);
					}}><Cross2 /></ActionIcon
				>
			</Flex>
		</Grid.Col>
	{/each}
</Grid>
