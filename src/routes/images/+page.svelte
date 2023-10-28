<script lang="ts">
	import {
		Center,
		Flex,
		Grid,
		Checkbox,
		Button,
		Tooltip,
	} from "@svelteuidev/core";
	import { ActionIcon } from "@svelteuidev/core";
	import {
		Copy,
		MagnifyingGlass,
		InfoCircled,
		Pencil2,
		Cross2,
	} from "radix-icons-svelte";

	import { clipboard } from "@svelteuidev/composables";
	import type { PageServerData } from "./$types";
	import { _ } from "svelte-i18n";
	import EditMeta from "../../component/widget/EditMeta.svelte";

	let checked_ids: Record<string, boolean> = {};

	export let data: PageServerData;

	data.image_ids.forEach((id) => {
		checked_ids[id] = false;
	});

	$: ({ image_ids } = data);

	let meta = {
		category: "private",
		tags: [],
	};

	const doEdit = async (image_id: string) => {
		fetch(`./images/${image_id}/edit`, {
			method: "PATCH",
			body: JSON.stringify(meta),
		}).then((response) => {
			console.log(response);
		});
	};
</script>

<Center class="m-8 text-xl font-black">{$_("page.images.title")}</Center>

<EditMeta {meta} />
<Flex class="m-8" justify="center" align="center" gap="xl">
	<Button
		type="submit"
		color="red"
		ripple
		on:click={() => {
			image_ids.forEach(async (image_id) => {
				if (checked_ids[image_id]) {
					await fetch(`/images/${image_id}`, {
						method: "DELETE",
					});
					image_ids = image_ids.filter((i) => i !== image_id);
				}
			});
		}}>{$_("page.images.batch_delete")}</Button
	>
	<Button
		type="submit"
		ripple
		on:click={() => {
			image_ids.forEach(async (image_id) => {
				if (checked_ids[image_id]) {
					await doEdit(image_id);
				}
			});
		}}>{$_("page.images.batch_edit")}</Button
	>
</Flex>
<Grid>
	{#each image_ids as image_id}
		<Grid.Col sm={12} md={6} lg={3}>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
			<figure
				class="my-2"
				on:click={() => {
					checked_ids[image_id] = !checked_ids[image_id];
				}}
			>
				<img
					class="cursor-pointer"
					src={`/delivery/${image_id}/square`}
					alt={image_id}
				/>
			</figure>
			<Flex align="left">
				<Checkbox
					size="xs"
					class="mr-2"
					bind:checked={checked_ids[image_id]}
					on:change={() => {
						checked_ids[image_id] = !checked_ids[image_id];
					}}
				/>
				<Tooltip
					position="bottom"
					label={$_("page.images.action.copy_id")}
				>
					<ActionIcon use={[[clipboard, image_id]]}>
						<Copy />
					</ActionIcon>
				</Tooltip>
				<Tooltip
					position="bottom"
					label={$_("page.images.action.blob")}
				>
					<ActionIcon root="a" href={`/images/${image_id}/blob`}>
						<MagnifyingGlass /></ActionIcon
					></Tooltip
				>
				<Tooltip
					position="bottom"
					label={$_("page.images.action.view")}
				>
					<ActionIcon root="a" href={`/images/${image_id}`}
						><InfoCircled /></ActionIcon
					></Tooltip
				>
				<Tooltip
					position="bottom"
					label={$_("page.images.action.edit")}
				>
					<ActionIcon root="a" href={`/images/${image_id}/edit`}
						><Pencil2 /></ActionIcon
					></Tooltip
				>
				<Tooltip
					position="bottom"
					label={$_("page.images.action.delete")}
				>
					<ActionIcon
						on:click={async () => {
							await fetch(`/images/${image_id}`, {
								method: "DELETE",
							});
							image_ids = image_ids.filter((i) => i !== image_id);
						}}><Cross2 /></ActionIcon
					></Tooltip
				>
			</Flex>
		</Grid.Col>
	{/each}
</Grid>
