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

	import { clipboard, sleep } from "@svelteuidev/composables";
	import type { PageServerData } from "./$types";
	import { _ } from "svelte-i18n";
	import EditMeta from "../../../component/widget/EditMeta.svelte";
	import Pagination from "../../../component/widget/Pagination.svelte";
	import { json } from "@sveltejs/kit";
	import type { RemoteImage } from "$lib/types";

	let checked_ids: Record<string, boolean> = {};

	export let data: PageServerData;

	data.remote_images.forEach((remote_image) => {
		checked_ids[remote_image.uuid] = false;
	});

	$: ({ remote_images: remoteImages, page, category, path } = data);

	$: meta = {
		category: category,
		tags: [],
	};

	let appendImages: RemoteImage[] = [];

	const doEdit = async (image_id: string) => {
		fetch(`./${category}/${image_id}/edit`, {
			method: "PATCH",
			body: JSON.stringify(meta),
		}).then((response) => {
			console.log(response);
		});
	};

	const fetchMore = async (more: number) => {
		appendImages = await (
			await fetch(`/delivery?limit=${more}&skip=${page * 24 - more}`)
		).json();
		remoteImages = remoteImages.concat(appendImages);
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
			remoteImages.forEach(async (remote_image) => {
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
		on:click={async () => {
			var more = 0;
			for (const remote_image of remoteImages) {
				if (checked_ids[remote_image.uuid]) {
					fetch(`./${category}/${remote_image.uuid}`, {
						method: "DELETE",
					});
					remoteImages = remoteImages.filter(
						(image) => image.uuid !== remote_image.uuid,
					);
					more += 1;
				}
			}
			await sleep(500);
			await fetchMore(more);
		}}>{$_("page.images.batch_delete")}</Button
	>
</Flex>
<Pagination {path} {page} />
<Grid class="my-2">
	{#each remoteImages as remote_image}
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
							remoteImages = remoteImages.filter(
								(i) => i.uuid !== remote_image.uuid,
							);
							fetchMore(1);
						}}><Cross2 /></ActionIcon
					></Tooltip
				>
			</Flex>
		</Grid.Col>
	{/each}
</Grid>
<Pagination {path} {page} />
