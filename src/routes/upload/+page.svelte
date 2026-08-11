<script lang="ts">
	import type { Image } from "$lib/types";
	import SubmitProgress from "../../component/widget/SubmitProgress.svelte";
	import { _ } from "svelte-i18n";
	import { goto } from "$app/navigation";
	import { Alert, Button, Spinner } from "flowbite-svelte";
	import { notify } from "$lib/ui/notifications";

	let files: FileList | undefined;
	const uploadCategory = "public";
	let placeholder: boolean = true;
	let uploading = false;
	let uploaded = 0;
	let alert: string | null = null;
	let images: Image[] = [];
	let isDragging = false;
	let uploadError: string | null = null;
	let selectedCount = 0;

	function resetPreview() {
		images = [];
		placeholder = true;
		selectedCount = 0;
		uploaded = 0;
		alert = null;
		uploadError = null;
	}

	function onChange() {
		if (files && files.length > 0) {
			placeholder = false;
			uploaded = 0;
			images = [];
			selectedCount = files.length;
			for (const file of Array.from(files)) {
				const reader = new FileReader();
				reader.addEventListener("load", function () {
					const image: Image = {
						src: reader.result,
						file,
					};
					images = [...images, image];
				});
				reader.readAsDataURL(file);
			}
		} else {
			resetPreview();
		}
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		if (event.dataTransfer?.files?.length) {
			files = event.dataTransfer.files;
			onChange();
		}
	}

	async function doUpload() {
		if (!files || files.length === 0) {
			uploadError = $_("page.upload.images_upload_failed", {
				values: { name: "" },
			});
			return;
		}

		uploading = true;
		alert = null;
		uploadError = null;
		let uploadedCnt = 0;
		try {
			for (const image of images) {
				const formData = new FormData();
				formData.append("file", image.file);
				const resp = await fetch(`/upload/${uploadCategory}`, {
					method: "PUT",
					body: formData,
				});
				if (!resp.ok) {
					throw new Error((await resp.text()) || image.file.name);
				}
				uploadedCnt += 1;
				uploaded = Math.floor((uploadedCnt / files.length) * 100);
			}
			notify.success(`已成功上传 ${uploadedCnt} 张图片`);
			await goto(`/images?category=${uploadCategory}`);
		} catch (error) {
			uploadError = error instanceof Error ? error.message : String(error);
			notify.error("上传失败，请检查图片格式或 Cloudflare 配置。");
		} finally {
			uploading = false;
		}
	}
</script>

<h1 class="title-page text-center my-6">{$_("page.upload.upload")}</h1>
{#if alert}
	<Alert color="red" class="mb-4">{alert}</Alert>
{/if}
<div class="action-bar justify-center">
	<label for="uploads" class="cursor-pointer">
		<Button size="sm" color="alternative">{$_("page.upload.select")}</Button>
	</label>
	<Button tag="a" href={`/images?category=${uploadCategory}`} size="sm" color="alternative">
		{$_("term.gallery")}
	</Button>
	<Button size="sm" color="green" on:click={doUpload} disabled={uploading}>
		{#if uploading}
			<Spinner size="4" class="mr-2" />
		{/if}
		{$_("page.upload.upload")}
	</Button>
	<input
		multiple
		class="hidden"
		type="file"
		bind:files
		on:change={onChange}
		id="uploads"
		accept="image/*"
	/>
</div>
{#if uploadError}
	<Alert color="red" class="mb-4">{uploadError}</Alert>
{/if}
<div
	class={`card transition ${isDragging ? "ring-2 ring-blue-500" : ""}`}
	role="region"
	aria-label="图片上传拖拽区域"
	on:dragover|preventDefault={() => (isDragging = true)}
	on:dragleave|preventDefault={() => (isDragging = false)}
	on:drop|preventDefault={onDrop}
>
	<div class="card-body">
		{#if placeholder}
			<label for="uploads" class="block w-full cursor-pointer h-96 flex flex-col items-center justify-center text-muted gap-2 panel-muted">
				<span class="text-lg font-medium">拖拽图片到这里，或点击选择</span>
				<span class="text-sm text-muted">支持 JPG、PNG、WebP 和 GIF</span>
			</label>
		{:else}
			<div class="flex items-center justify-between mb-3 text-sm text-muted">
				<span>已选择 {selectedCount} 张图片</span>
				<Button size="xs" color="alternative" on:click={resetPreview}>清空</Button>
			</div>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 h-96 w-full overflow-y-auto">
				{#each images as image}
					<div>
						<figure>
							<img src={String(image.src)} alt="" class="rounded-sm object-cover h-32 w-full" />
						</figure>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<SubmitProgress doing={uploading} done={uploaded} />
