<script lang="ts">
	import { _ } from "svelte-i18n";
	import { goto } from "$app/navigation";
	import EditMeta from "../../../../component/widget/EditMeta.svelte";
	import type { ImageMetaData } from "$lib/types";
	import { notify } from "$lib/ui/notifications";
	import { Alert, Button } from "flowbite-svelte";
	import type { PageData } from "./$types";
	export let data: PageData;

	$: ({ image } = data);
	let saving = false;
	let saveError = "";
	let initializedFromImageId: string | null = null;
	let meta: ImageMetaData = {
		tags: [],
		category: "public",
		originalName: "",
		uploadedAt: "",
	};

	$: if (image && image.uuid !== initializedFromImageId) {
		meta = {
			tags: [...(image.meta?.tags ?? [])],
			category: image.meta?.category ?? image.category,
			originalName: image.meta?.originalName ?? image.name ?? image.uuid,
			uploadedAt: image.meta?.uploadedAt ?? image.uploadedAt ?? "",
			takenAt: image.meta?.takenAt,
			createdAt: image.meta?.createdAt,
			exif: image.meta?.exif,
		};
		initializedFromImageId = image.uuid;
	}

	const onClick = async () => {
		if (!image) return;
		saving = true;
		saveError = "";
		try {
			const response = await fetch(`/images/${image.uuid}/metadata`, {
				method: "PATCH",
				headers: {
					"content-type": "application/json; charset=utf-8",
				},
				body: JSON.stringify(meta),
			});
			if (!response.ok) {
				throw new Error(await response.text());
			}
			notify.success($_("page.image.edit.edit_ok"));
			await goto(`/images/${image.uuid}`);
		} catch (error) {
			saveError = error instanceof Error ? error.message : $_("page.image.edit.edit_error");
			notify.error($_("page.image.edit.edit_error"));
		} finally {
			saving = false;
		}
	};
</script>

<h1 class="title-page text-center my-6">{$_("page.image.edit.title")}</h1>

{#if image}
	<EditMeta bind:meta showCustomFields={true} />
	{#if saveError}
		<Alert color="red" class="mb-4">{saveError}</Alert>
	{/if}
	<div class="action-bar justify-center">
		<Button
			size="sm"
			color="blue"
			class="min-w-32 shadow-sm"
			on:click={onClick}
			disabled={saving}
		>
			{saving ? "保存中..." : $_("page.image.edit.do_edit")}
		</Button>
	</div>
{:else}
	<Alert color="gray" class="mb-4">未找到该图片，无法编辑。</Alert>
{/if}
