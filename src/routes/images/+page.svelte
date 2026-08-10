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
	import { Button, Checkbox, Spinner, Alert } from "flowbite-svelte";
	import { Modal } from "flowbite-svelte";
	import { notify } from "$lib/ui/notifications";

	let checked_ids: Record<string, boolean> = {};

	export let data: PageServerData;

	// 顯式本地狀態：避免透過 reactive 解構造成 Svelte 無法追蹤重新指派
	let remoteImages: RemoteImage[] = [...data.remoteImages];
	let category = data.category;
	let path = data.path;
	let cursor = data.cursor;
	let nextCursor = data.nextCursor;
	let prevHref = data.prevHref;
	let nextHref = data.nextHref;
	let source = data.source;
	let limit = data.limit;

	// 如果進行了路由參數切換（例如分頁或分類導航），同步重置本地狀態
	$: if (
		data.category !== category ||
		data.path !== path ||
		data.cursor !== cursor ||
		data.nextCursor !== nextCursor ||
		data.prevHref !== prevHref ||
		data.nextHref !== nextHref
	) {
		category = data.category;
		path = data.path;
		cursor = data.cursor;
		nextCursor = data.nextCursor;
		prevHref = data.prevHref;
		nextHref = data.nextHref;
		source = data.source;
		limit = data.limit;
		remoteImages = [...data.remoteImages];
		checked_ids = {};
	}

	$: meta = {
		category: category,
		tags: [],
	};

	let confirmOpen = false;
	let confirmBatch = false;
	let pendingSingle: string | null = null;
	let deleting = false; // 防止重入

	function openConfirmSingle(id: string) {
		pendingSingle = id;
		confirmBatch = false;
		confirmOpen = true;
	}

	function openConfirmBatch() {
		pendingSingle = null;
		confirmBatch = true;
		confirmOpen = true;
	}

	async function executeDelete() {
		if (deleting) return;
		deleting = true;
		try {
			if (confirmBatch) {
				const toDelete = remoteImages.filter(
					(r) => checked_ids[r.uuid],
				);
				if (toDelete.length === 0) return;
				for (const img of toDelete) {
					await fetch(`/images/${img.uuid}`, { method: "DELETE" });
				}
				// 本地同步移除
				remoteImages = remoteImages.filter((r) => !checked_ids[r.uuid]);
				// 清理勾選狀態
				for (const id of Object.keys(checked_ids)) {
					if (checked_ids[id]) delete checked_ids[id];
				}
				const count = toDelete.length;
				notify.success(
					`${count} ${$_("general.notification.delete_ok")}`,
				);
			} else if (pendingSingle) {
				const delId = pendingSingle;
				await fetch(`/images/${delId}`, { method: "DELETE" });
				remoteImages = remoteImages.filter((i) => i.uuid !== delId);
				if (checked_ids[delId]) delete checked_ids[delId];
				notify.success($_("general.notification.delete_ok"));
			}
		} catch (e) {
			notify.error($_("general.notification.delete_failed"));
		} finally {
			confirmOpen = false;
			pendingSingle = null;
			confirmBatch = false;
			deleting = false;
		}
	}

	const doEdit = async (imageUUID: string) => {
		fetch(`./${category}/${imageUUID}/edit`, {
			method: "PATCH",
			body: JSON.stringify(meta),
		}).then((response) => {
			console.log(response);
		});
	};

	const preload = async (src: string) => {
		try {
			const resp = await fetch(src, { cache: "force-cache" });
			if (!resp.ok) throw new Error("Failed to load image");
			const blob = await resp.blob();
			return await new Promise<string>((resolve) => {
				const reader = new FileReader();
				reader.readAsDataURL(blob);
				reader.onload = () => resolve(reader.result?.toString() || "");
				reader.onerror = () => resolve("");
			});
		} catch {
			return "";
		}
	};
</script>

<h1 class="title-page my-6 text-center">{$_("page.images.title")}</h1>

<EditMeta bind:meta />

<div class="m-auto my-8 flex items-center justify-center gap-4">
	<Button tag="a" href="/upload" size="sm" color="alternative">{$_("page.upload.upload")}</Button>
	<Button
		size="sm"
		color="alternative"
		on:click={() => {
			remoteImages.forEach(async (remote_image) => {
				if (checked_ids[remote_image.uuid]) {
					await doEdit(remote_image.uuid);
				}
			});
		}}>{$_("page.images.batch_edit")}</Button
	>
	<Button size="sm" color="red" on:click={openConfirmBatch}
		>{$_("page.images.batch_delete")}</Button
	>
</div>
<Pagination {prevHref} {nextHref} />
<div class="text-center text-xs text-muted mb-2">source: {source}</div>
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
						class="flex items-center justify-center rounded panel-muted"
					>
						<Spinner size="6" color="gray" />
					</div>
				{:then base64}
					{#if base64}
						<img
							src={base64}
							class="cursor-pointer w-full h-56 object-cover rounded"
							alt={remoteImage.uuid}
						/>
					{:else}
						<div class="flex h-56 items-center justify-center rounded panel-muted text-sm text-muted">
							无法预览
						</div>
					{/if}
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
					><Copy class="text-muted" /></Button
				>
				<Button
					tag="a"
					href={`/delivery/${remoteImage.uuid}/original`}
					color="none"
					size="xs"
					class="p-1 hover:bg-transparent focus:ring-0"
					title={$_("page.images.action.blob")}
					><MagnifyingGlass class="text-muted" /></Button
				>
				<Button
					tag="a"
					href={`/images/${remoteImage.uuid}`}
					color="none"
					size="xs"
					class="p-1 hover:bg-transparent focus:ring-0"
					title={$_("page.images.action.view")}
					><InfoCircled class="text-muted" /></Button
				>
				<Button
					tag="a"
					href={`/images/${remoteImage.uuid}/edit`}
					color="none"
					size="xs"
					class="p-1 hover:bg-transparent focus:ring-0"
					title={$_("page.images.action.edit")}
					><Pencil2 class="text-muted" /></Button
				>
				<Button
					color="none"
					size="xs"
					class="p-1 hover:bg-transparent focus:ring-0"
					title={$_("page.images.action.delete")}
					on:click={() => openConfirmSingle(remoteImage.uuid)}
					><Cross2 class="text-red-600" /></Button
				>
			</div>
			<div class="mt-2 text-xs text-muted space-y-1">
				<div class="truncate">{remoteImage.name ?? remoteImage.uuid}</div>
				<div>{remoteImage.uploadedAt ? new Date(remoteImage.uploadedAt).toLocaleString() : ""}</div>
				{#if remoteImage.meta?.tags?.length}
					<div class="truncate">#{remoteImage.meta.tags.join(" #")}</div>
				{/if}
			</div>
		</div>
	{/each}
</div>
<Pagination {prevHref} {nextHref} />

<!-- Delete Confirmation Modal -->
<Modal size="md" open={confirmOpen} on:close={() => (confirmOpen = false)}>
	<div slot="header" class="text-lg font-heavy">
		{$_("general.notification.delete_confirm_title")}
	</div>
	<div class="text-sm leading-relaxed">
		{#if confirmBatch}
			{$_("general.notification.delete_confirm_message_batch", {
				values: {
					count: Object.values(checked_ids).filter(Boolean).length,
				},
			})}
		{:else}
			{$_("general.notification.delete_confirm_message_single")}
		{/if}
	</div>
	<div slot="footer" class="flex justify-end gap-3">
		<Button color="alternative" size="xs" on:click={() => (confirmOpen = false)}
			>{$_("general.notification.cancel")}</Button
		>
		<Button
			color="red"
			size="xs"
			on:click={executeDelete}
			disabled={deleting}
		>
			{#if deleting}
				<Spinner size="4" class="mr-1" />
			{/if}
			{$_("general.notification.confirm")}
		</Button>
	</div>
</Modal>
