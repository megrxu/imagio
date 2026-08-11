<script lang="ts">
	import {
		Calendar,
		Clock,
		ArrowUp,
		Copy,
		MagnifyingGlass,
		InfoCircled,
		Pencil2,
		Cross2,
	} from "radix-icons-svelte";
	import type { PageServerData } from "./$types";
	import { _ } from "svelte-i18n";
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
	let prevHref = data.prevHref;
	let nextHref = data.nextHref;
	let sort = data.sort;
	let limit = data.limit;
	let currentPage = data.currentPage;
	let totalPages = data.totalPages;
	let totalItems = data.totalItems;
	let imageLoaded: Record<string, boolean> = Object.fromEntries(
		remoteImages.map((item) => [item.uuid, false]),
	);

	function deriveImageLoadedState(images: RemoteImage[], previous: Record<string, boolean>) {
		return Object.fromEntries(
			images.map((item) => [item.uuid, previous[item.uuid] ?? false]),
		);
	}

	function getDisplayTitle(remoteImage: RemoteImage) {
		const title = remoteImage.meta?.originalName ?? remoteImage.name;
		if (!title || title === remoteImage.uuid) {
			return "";
		}
		return title;
	}

	function formatMetaDate(value?: string) {
		if (!value) {
			return "";
		}

		const date = new Date(value);
		if (!Number.isNaN(date.getTime())) {
			return date.toLocaleDateString(undefined, {
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			});
		}

		const matched = value.match(/^(\d{4})[/:.-](\d{1,2})[/:.-](\d{1,2})/);
		if (!matched) {
			return value;
		}

		const [, year, month, day] = matched;
		return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
	}

	function getDisplayMetaRows(remoteImage: RemoteImage) {
		return [
			{
				key: "taken",
				label: "拍摄",
				value: formatMetaDate(remoteImage.meta?.takenAt),
				icon: Calendar,
			},
			{
				key: "created",
				label: "创建",
				value: formatMetaDate(remoteImage.meta?.createdAt),
				icon: Clock,
			},
			{
				key: "uploaded",
				label: "上传",
				value: formatMetaDate(remoteImage.meta?.uploadedAt ?? remoteImage.uploadedAt),
				icon: ArrowUp,
			},
		].filter((item) => item.value);
	}

	// 如果進行了路由參數切換（例如分頁或分類導航），同步重置本地狀態
	$: if (
		data.category !== category ||
		data.sort !== sort ||
		data.path !== path ||
		data.currentPage !== currentPage ||
		data.totalPages !== totalPages ||
		data.totalItems !== totalItems ||
		data.prevHref !== prevHref ||
		data.nextHref !== nextHref
	) {
		category = data.category;
		sort = data.sort;
		path = data.path;
		currentPage = data.currentPage;
		totalPages = data.totalPages;
		totalItems = data.totalItems;
		prevHref = data.prevHref;
		nextHref = data.nextHref;
		limit = data.limit;
		remoteImages = [...data.remoteImages];
		imageLoaded = deriveImageLoadedState(remoteImages, imageLoaded);
		checked_ids = {};
	}

	function markImageLoaded(id: string) {
		imageLoaded = {
			...imageLoaded,
			[id]: true,
		};
	}

	function markIfImageComplete(node: HTMLImageElement, id: string) {
		if (node.complete && node.naturalWidth > 0) {
			markImageLoaded(id);
		}

		return {
			update(nextId: string) {
				if (node.complete && node.naturalWidth > 0) {
					markImageLoaded(nextId);
				}
			},
		};
	}

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
					await fetch(`/images/${img.uuid}/delete`, { method: "DELETE" });
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
				await fetch(`/images/${delId}/delete`, { method: "DELETE" });
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

</script>

<h1 class="title-page my-6 text-center">{$_("page.images.title")}</h1>

<div class="card my-8 mx-auto w-full max-w-6xl">
	<div class="card-body flex flex-wrap items-center justify-between gap-4 !p-4">
		<div class="flex items-center gap-3">
			<Button tag="a" href="/upload" size="sm" color="alternative">{$_("page.upload.upload")}</Button>
			<Button size="sm" color="red" on:click={openConfirmBatch}
				>{$_("page.images.batch_delete")}</Button
			>
		</div>
		<form class="flex items-center gap-2" method="GET" action={path}>
			<input type="hidden" name="category" value={category} />
			<input type="hidden" name="limit" value={String(limit)} />
			<input type="hidden" name="page" value="1" />
			<label for="sort-mode" class="text-sm text-muted">排序方式</label>
			<select
				id="sort-mode"
				name="sort"
				bind:value={sort}
				on:change={(event) => event.currentTarget.form?.requestSubmit()}
				class="rounded border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm"
			>
				<option value="uploaded">上传时间</option>
				<option value="taken">拍摄时间</option>
			</select>
		</form>
	</div>
</div>
<Pagination
	{prevHref}
	{nextHref}
	{path}
	{category}
	{sort}
	{limit}
	{currentPage}
	{totalPages}
	{totalItems}
/>
{#if remoteImages.length === 0}
	<Alert color="gray" class="my-2 w-full text-center"
		>{$_("page.images.no_images")}</Alert
	>
{/if}
<div class="my-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
	{#each remoteImages as remoteImage (remoteImage.uuid)}
		<div>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
			<figure
				class="my-2 mx-0 relative"
				on:click={() => {
					checked_ids = {
						...checked_ids,
						[remoteImage.uuid]: !checked_ids[remoteImage.uuid],
					};
				}}
			>
				<img
					src={`/delivery/${remoteImage.uuid}/square`}
					loading="lazy"
					class={`cursor-pointer w-full h-56 object-cover rounded-sm transition-opacity duration-200 ${imageLoaded[remoteImage.uuid] ? "opacity-100" : "opacity-0"}`}
					alt={remoteImage.uuid}
					use:markIfImageComplete={remoteImage.uuid}
					on:load={() => markImageLoaded(remoteImage.uuid)}
					on:error={() => markImageLoaded(remoteImage.uuid)}
				/>
				{#if !imageLoaded[remoteImage.uuid]}
					<div class="absolute inset-0 flex items-center justify-center rounded-sm bg-black/30 backdrop-blur-[1px]">
						<Spinner size="6" />
					</div>
				{/if}
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
					href={remoteImage.deliveryUrl ?? `/delivery/${remoteImage.uuid}/original`}
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
				{#if getDisplayTitle(remoteImage)}
					<div class="truncate">{getDisplayTitle(remoteImage)}</div>
				{/if}
				<div class="space-y-1">
					{#each getDisplayMetaRows(remoteImage) as metaRow (metaRow.key)}
						<div class="flex items-center gap-2 leading-5">
							<svelte:component this={metaRow.icon} class="h-3.5 w-3.5 shrink-0 text-muted" />
							<span class="w-8 shrink-0 text-[11px] text-muted/80">{metaRow.label}</span>
							<span class="min-w-0 truncate tabular-nums">{metaRow.value}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/each}
</div>
<Pagination
	{prevHref}
	{nextHref}
	{path}
	{category}
	{sort}
	{limit}
	{currentPage}
	{totalPages}
	{totalItems}
/>

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
