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
	import { clipboard } from "@svelteuidev/composables";
	import type { PageData } from "./$types";
	import { _ } from "svelte-i18n";

	export let data: PageData;

	$: ({ image_ids } = data);
</script>

<Center class="m-8 text-xl font-black">{$_('page.images.title')}</Center>
<Grid>
	{#each image_ids as image_id}
		<Grid.Col sm={12} md={6} lg={3}>
			<figure class="my-2">
				<img
					class="cursor-pointer"
					src={`/delivery/${image_id}/square`}
					alt={image_id}
				/>
			</figure>
			<Flex align="left">
				<ActionIcon use={[[clipboard, image_id]]}>
					<Copy />
				</ActionIcon>
				<ActionIcon root="a" href={`/images/${image_id}/blob`}>
					<MagnifyingGlass /></ActionIcon
				>
				<ActionIcon><InfoCircled /></ActionIcon>
				<ActionIcon root="a" href={`/images/${image_id}`}
					><Pencil2 /></ActionIcon
				>
				<ActionIcon
					on:click={async () => {
						await fetch(`/images/${image_id}`, {
							method: "DELETE",
						});
						image_ids = image_ids.filter((i) => i !== image_id);
					}}><Cross2 /></ActionIcon
				>
			</Flex>
		</Grid.Col>
	{/each}
</Grid>
