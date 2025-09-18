<script lang="ts">
	import type { Image, RemoteImage } from "$lib/types";
	import SubmitProgress from "../../component/widget/SubmitProgress.svelte";
	import { _ } from "svelte-i18n";
	import { redirect } from "@sveltejs/kit";
	import { Alert, Label, Select, Button, Card } from "flowbite-svelte";

	let files: FileList;
	let category: string = "public";
	let placeholder: Boolean = true;
	let uploading: Boolean = false;
	let uploaded = 0;
	let alert: string | null = null;
	let images: Image[] = [];

	function onChange() {
		if (files) {
			placeholder = false;
			uploaded = 0;
			for (const file of files) {
				const reader = new FileReader();
				reader.addEventListener("load", function () {
					const image: Image = {
						src: reader.result,
						file: file,
					};
					images = [...images, image];
				});
				reader.readAsDataURL(file);
			}
		}
	}

	async function doUpload() {
		if (images) {
			uploading = true;
			let uploaded_cnt = 0;
			for (const image of images) {
				const formData = new FormData();
				formData.append("file", image.file);
				let resp: Response = await fetch(`/upload/${category}`, {
					method: "PUT",
					body: formData,
				});
				// let remoteImage: RemoteImage = await resp.json();
				// if (remoteImage.uuid) {
				uploaded_cnt += 1;
				uploaded = Math.floor((uploaded_cnt / files.length) * 100);
				// }
				//  else {
				// 	alert = $_("page.upload.images_upload_failed", {
				// 		values: { name: image.file.name },
				// 	});
				// 	uploading = false;
				// 	return;
				// }
			}
			uploading = false;
			images = [];
			redirect(301, `/images/${category}`);
		}
	}
</script>

<h1 class="title-page text-center my-6">{$_("page.upload.upload")}</h1>
{#if alert}
	<Alert color="red" class="mb-4">{alert}</Alert>
{/if}
<div class="mb-4 card">
	<div class="card-body">
	<Label for="upload-category" class="mb-2">{$_("term.category")}</Label>
	<Select id="upload-category" bind:value={category} class="w-full">
		<option value="public">public</option>
		<option value="private">private</option>
	</Select>
	</div>
</div>
<div class="action-bar justify-center">
	<label for="uploads" class="cursor-pointer">
		<Button size="sm" pill>{$_("page.upload.select")}</Button>
	</label>
	<a href={`/images`}>
		<Button size="sm" pill color="light">{$_("term.gallery")}</Button>
	</a>
	<Button size="sm" pill color="green" on:click={doUpload}>
		{$_("page.upload.upload")}
	</Button>
	<input
		multiple
		class="hidden"
		type="file"
		bind:files
		on:change={onChange}
		id="uploads"
		accept="*"
	/>
	>
</div>
<div class="card">
	<div class="card-body">
		{#if placeholder}
			<label for="uploads" class="block w-full cursor-pointer h-96 flex items-center justify-center text-muted">
				{$_("page.upload.images_placeholder")}
			</label>
		{:else}
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 h-96 w-full overflow-y-auto">
				{#each images as image}
					<div>
						<figure>
							<img src={String(image.src)} alt="" class="rounded-md" />
						</figure>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<SubmitProgress doing={uploading} done={uploaded} />
