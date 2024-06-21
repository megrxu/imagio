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
	import EditMeta from "../../component/widget/EditMeta.svelte";
	import Pagination from "../../component/widget/Pagination.svelte";
	import { json } from "@sveltejs/kit";
	import type { RemoteImage } from "$lib/types";
	import { onMount } from "svelte";

	let checked_ids: Record<string, boolean> = {};

	export let data: PageServerData;

	$: ({ remoteImages, page, category, path } = data);

	$: meta = {
		category: category,
		tags: [],
	};

	let appendImages: RemoteImage[];

	const fetchMore = async (more: number) => {
		console.log(more);
		console.log(
			`/delivery?category=${category}&limit=${more}&skip=${page * 24 - more}`,
		);
		appendImages = await (
			await fetch(
				`/delivery?category=${category}&limit=${more}&skip=${page * 24 - more}`,
			)
		).json();
		console.log(appendImages);
		remoteImages = remoteImages.concat(appendImages);
	};

	const doEdit = async (image_id: string) => {
		fetch(`./${category}/${image_id}/edit`, {
			method: "PATCH",
			body: JSON.stringify(meta),
		}).then((response) => {
			console.log(response);
		});
	};

	onMount(async () => {
		appendImages = [];
		remoteImages.forEach((remote_image) => {
			checked_ids[remote_image.uuid] = false;
		});
	});
</script>

<Center class="m-8 text-xl font-black">{$_("page.images.title")}</Center>

<EditMeta bind:meta />
<Flex class="m-auto my-8" justify="center" align="center" gap="xl">
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
			for (const remoteImage of remoteImages) {
				if (checked_ids[remoteImage.uuid]) {
					fetch(`/images/${remoteImage.uuid}`, {
						method: "DELETE",
					});
					remoteImages = remoteImages.filter(
						(image) => image.uuid !== remoteImage.uuid,
					);
					more += 1;
				}
			}
			console.log(more);
			await sleep(500);
			await fetchMore(more);
		}}>{$_("page.images.batch_delete")}</Button
	>
</Flex>
<Pagination {path} {page} />
<Grid class="my-2">
	{#if remoteImages.length === 0}
		<Flex
			class="h-96 w-full border-dashed border-zinc-300 border-2 rounded-lg text-lg text-slate-600"
			justify="center"
			align="center"
			direction="column"
		>
			{$_("page.images.no_images")}
		</Flex>
	{/if}
	{#each remoteImages as remoteImage}
		<Grid.Col sm={6} md={4} lg={3}>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
			<figure
				class="my-2 mx-0"
				on:click={() => {
					checked_ids[remoteImage.uuid] =
						!checked_ids[remoteImage.uuid];
				}}
			>
				<img
					class="cursor-pointer w-full"
					src={`/delivery/${remoteImage.uuid}/square`}
					alt={remoteImage.uuid}
				/>
			</figure>
			<Flex align="left">
				<Checkbox
					size="xs"
					class="mr-2"
					bind:checked={checked_ids[remoteImage.uuid]}
					on:change={() => {
						checked_ids[remoteImage.uuid] =
							!checked_ids[remoteImage.uuid];
					}}
				/>
				<Tooltip
					position="bottom"
					label={$_("page.images.action.copy_id")}
				>
					<ActionIcon use={[[clipboard, remoteImage.uuid]]}>
						<Copy />
					</ActionIcon>
				</Tooltip>
				<Tooltip
					position="bottom"
					label={$_("page.images.action.blob")}
				>
					<ActionIcon
						root="a"
						href={`/delivery/${remoteImage.uuid}/original`}
					>
						<MagnifyingGlass /></ActionIcon
					></Tooltip
				>
				<Tooltip
					position="bottom"
					label={$_("page.images.action.view")}
				>
					<ActionIcon root="a" href={`/images/${remoteImage.uuid}`}
						><InfoCircled /></ActionIcon
					></Tooltip
				>
				<Tooltip
					position="bottom"
					label={$_("page.images.action.edit")}
				>
					<ActionIcon
						root="a"
						href={`/images/${remoteImage.uuid}/edit`}
						><Pencil2 /></ActionIcon
					></Tooltip
				>
				<Tooltip
					position="bottom"
					label={$_("page.images.action.delete")}
				>
					<ActionIcon
						on:click={async () => {
							await fetch(`/images/${remoteImage.uuid}`, {
								method: "DELETE",
							});
							remoteImages = remoteImages.filter(
								(i) => i.uuid !== remoteImage.uuid,
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
