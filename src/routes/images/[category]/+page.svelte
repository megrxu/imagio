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
	import EditMeta from "../../../component/widget/EditMeta.svelte";
	import Pagination from "../../../component/widget/Pagination.svelte";

	let checked_ids: Record<string, boolean> = {};

	export let data: PageServerData;

	data.remote_images.forEach((remote_image) => {
		checked_ids[remote_image.uuid] = false;
	});

	$: ({ remote_images, page, category, path } = data);

	$: meta = {
		category: category,
		tags: [],
	};

	const doEdit = async (image_id: string) => {
		fetch(`./${category}/${image_id}/edit`, {
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
	<Button ripple href="/upload">{$_("page.upload.upload")}</Button>
	<Button
		type="submit"
		ripple
		on:click={() => {
			remote_images.forEach(async (remote_image) => {
				if (checked_ids[remote_image.uuid]) {
					await doEdit(remote_image.uuid);
				}
			});
		}}>{$_("page.images.batch_edit")}</Button
	>
	<Button
		type="submit"
		color="red"
		ripple
		on:click={() => {
			remote_images.forEach(async (remote_image) => {
				if (checked_ids[remote_image.uuid]) {
					await fetch(`./${category}/${remote_image.uuid}`, {
						method: "DELETE",
					});
					remote_images = remote_images.filter(
						(image) => image.uuid !== remote_image.uuid,
					);
				}
			});
		}}>{$_("page.images.batch_delete")}</Button
	>
</Flex>
<Pagination {path} {page} />
<Grid>
	{#each remote_images as remote_image}
		<Grid.Col sm={12} md={6} lg={3}>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
			<figure
				class="my-2"
				on:click={() => {
					checked_ids[remote_image.uuid] =
						!checked_ids[remote_image.uuid];
				}}
			>
				<img
					class="cursor-pointer"
					src={`/delivery/${remote_image.uuid}/square`}
					alt={remote_image.uuid}
				/>
			</figure>
			<Flex align="left">
				<Checkbox
					size="xs"
					class="mr-2"
					bind:checked={checked_ids[remote_image.uuid]}
					on:change={() => {
						checked_ids[remote_image.uuid] =
							!checked_ids[remote_image.uuid];
					}}
				/>
				<Tooltip
					position="bottom"
					label={$_("page.images.action.copy_id")}
				>
					<ActionIcon use={[[clipboard, remote_image.uuid]]}>
						<Copy />
					</ActionIcon>
				</Tooltip>
				<Tooltip
					position="bottom"
					label={$_("page.images.action.blob")}
				>
					<ActionIcon
						root="a"
						href={`/delivery/${remote_image.uuid}/original`}
					>
						<MagnifyingGlass /></ActionIcon
					></Tooltip
				>
				<Tooltip
					position="bottom"
					label={$_("page.images.action.view")}
				>
					<ActionIcon
						root="a"
						href={`./${category}/${remote_image.uuid}`}
						><InfoCircled /></ActionIcon
					></Tooltip
				>
				<Tooltip
					position="bottom"
					label={$_("page.images.action.edit")}
				>
					<ActionIcon
						root="a"
						href={`./${category}/${remote_image.uuid}/edit`}
						><Pencil2 /></ActionIcon
					></Tooltip
				>
				<Tooltip
					position="bottom"
					label={$_("page.images.action.delete")}
				>
					<ActionIcon
						on:click={async () => {
							await fetch(`./${category}/${remote_image.uuid}`, {
								method: "DELETE",
							});
							remote_images = remote_images.filter(
								(i) => i.uuid !== remote_image.uuid,
							);
						}}><Cross2 /></ActionIcon
					></Tooltip
				>
			</Flex>
		</Grid.Col>
	{/each}
</Grid>
