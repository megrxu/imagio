<script lang="ts">
	import {
		Copy,
		MagnifyingGlass,
		InfoCircled,
		Pencil2,
		Cross2,
	} from "radix-icons-svelte";
	import type { PageServerData } from "./$types";
	import { _ } from "svelte-i18n";
	import EditMeta from "../../component/widget/EditMeta.svelte";
	import Pagination from "../../component/widget/Pagination.svelte";
	import type { RemoteImage } from "$lib/types";
	import { onMount } from "svelte";
	import { Button, Checkbox, Spinner, Alert } from "flowbite-svelte";

	let checked_ids: Record<string, boolean> = {};

	export let data: PageServerData;

	$: ({ remoteImages, page, category, path } = data);

	$: meta = {
		category: category,
		tags: [],
	};

	let appendImages: RemoteImage[];

	const fetchMore = async (more: number) => {
		appendImages = await (
			await fetch(
				`/delivery?category=${category}&limit=${more}&skip=${page * 24 - more}`,
			)
		).json();
		remoteImages = remoteImages.concat(appendImages);
	};

	const doEdit = async (imageUUID: string) => {
		fetch(`./${category}/${imageUUID}/edit`, {
			method: "PATCH",
			body: JSON.stringify(meta),
		}).then((response) => {
			console.log(response);
		});
	};

	const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

	const preload = async (src: string) => {
		const resp = await fetch(src);
		const blob = await resp.blob();

		const res: Promise<string> = new Promise(function (resolve) {
			let reader = new FileReader();
			reader.readAsDataURL(blob);
			reader.onload = () => resolve(reader.result?.toString() || "");
		});
		return res;
	};
</script>

<div class="m-8 text-xl font-black text-center">{$_("page.images.title")}</div>

<EditMeta bind:meta />
<div class="m-auto my-8 flex items-center justify-center gap-4">
	<a href="/upload"
		><Button size="sm" pill color="blue">{$_("page.upload.upload")}</Button
		></a
	>
	<Button
		size="sm"
		pill
		color="dark"
		on:click={() => {
			remoteImages.forEach(async (remote_image) => {
				if (checked_ids[remote_image.uuid]) {
					await doEdit(remote_image.uuid);
				}
			});
		}}>{$_("page.images.batch_edit")}</Button
	>
	<Button
		size="sm"
		pill
		color="red"
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
</div>
<Pagination {path} {page} />
{#if remoteImages.length === 0}
	<Alert color="gray" class="my-2 w-full text-center"
		>{$_("page.images.no_images")}</Alert
	>
{/if}
<div class="my-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
	{#each remoteImages as remoteImage}
		<div>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
			<figure
				class="my-2 mx-0"
				on:click={() => {
					checked_ids = {
						...checked_ids,
						[remoteImage.uuid]: !checked_ids[remoteImage.uuid],
					};
				}}
			>
				{#await preload(`/delivery/${remoteImage.uuid}/square`)}
					<div
						style="height: 216px"
						class="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded"
					>
						<Spinner size="6" color="gray" />
					</div>
				{:then base64}
					<img
						src={base64}
						class="cursor-pointer w-full"
						alt={remoteImage.uuid}
					/>
				{/await}
			</figure>
			<div class="flex items-center gap-1">
				<Checkbox
					class="mr-1"
					bind:checked={checked_ids[remoteImage.uuid]}
				/>
				<Button
					color="none"
					size="xs"
					class="p-1 hover:bg-transparent focus:ring-0"
					title={$_("page.images.action.copy_id")}
					on:click={() =>
						navigator.clipboard.writeText(remoteImage.uuid)}
					><Copy class="text-gray-600" /></Button
				>
				<Button
					tag="a"
					href={`/delivery/${remoteImage.uuid}/original`}
					color="none"
					size="xs"
					class="p-1 hover:bg-transparent focus:ring-0"
					title={$_("page.images.action.blob")}
					><MagnifyingGlass class="text-blue-600" /></Button
				>
				<Button
					tag="a"
					href={`/images/${remoteImage.uuid}`}
					color="none"
					size="xs"
					class="p-1 hover:bg-transparent focus:ring-0"
					title={$_("page.images.action.view")}
					><InfoCircled class="text-blue-600" /></Button
				>
				<Button
					tag="a"
					href={`/images/${remoteImage.uuid}/edit`}
					color="none"
					size="xs"
					class="p-1 hover:bg-transparent focus:ring-0"
					title={$_("page.images.action.edit")}
					><Pencil2 class="text-amber-500" /></Button
				>
				<Button
					color="none"
					size="xs"
					class="p-1 hover:bg-transparent focus:ring-0"
					title={$_("page.images.action.delete")}
					on:click={async () => {
						await fetch(`/images/${remoteImage.uuid}`, {
							method: "DELETE",
						});
						remoteImages = remoteImages.filter(
							(i) => i.uuid !== remoteImage.uuid,
						);
						fetchMore(1);
					}}><Cross2 class="text-red-600" /></Button
				>
			</div>
		</div>
	{/each}
</div>
<Pagination {path} {page} />
