<script lang="ts">
	import type { Image, UploadResp } from "$lib/types";
	import { uploadImage } from "$lib";
	import { Center, Grid, Flex, Tabs } from "@svelteuidev/core";
	import { Button } from "@svelteuidev/core";
	import { Alert } from "@svelteuidev/core";
	import SubmitProgress from "../../component/widget/SubmitProgress.svelte";

	let files: FileList;
	let placeholder: Boolean = true;
	let images: Image[] = [];
	let uploading: Boolean = false;
	let uploaded = 0;
	let uploadedImages: UploadResp[] = [];
	let alert: string | null = null;

	function onChange() {
		if (files) {
			placeholder = false;
			uploaded = 0;
			images = [];
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
			images.forEach(async (image: Image) => {
				let resp: Response = await uploadImage(image);
				let res = await resp.text();
				let uploadedImage: UploadResp = JSON.parse(res);
				if (uploadedImage.success == true) {
					uploaded_cnt += 1;
					uploaded = (uploaded_cnt / files.length) * 100;
					uploadedImages = [...uploadedImages, uploadedImage];
				} else {
					alert = `Image ${image.file.name} did not uploaded.`;
				}
			});
		}
	}
</script>

<Center class="m-8 text-xl font-black">Upload Images</Center>
{#if alert}
	<Alert title="Alert!">
		{alert}
	</Alert>
{/if}
<Flex class="m-8" justify="center" align="center" gap="xl">
	<Button ripple class="p-0">
		<input
			multiple
			class="hidden"
			type="file"
			bind:files
			on:change={onChange}
			id="uploads"
			accept="image/png, image/jpeg, image/gif"
		/>
		<label for="uploads" class="w-full cursor-pointer">Select</label>
	</Button>
	<Button type="submit" color="teal" ripple on:click={doUpload}>Upload</Button
	>
</Flex>
{#if placeholder}
	<label for="uploads" class="h-96 w-full">
		<Flex
			class="h-96 w-full border-dashed border-zinc-300 border-2 rounded-lg text-lg text-slate-300"
			justify="center"
			align="center"
			direction="column"
		>
			Image Placeholder
		</Flex>
	</label>
{:else}
	<Grid class="h-96 w-full overflow-y-auto ">
		{#each images as image}
			<Grid.Col span={3}>
				<figure>
					<img src={String(image.src)} alt="" />
				</figure>
			</Grid.Col>
		{/each}
	</Grid>
{/if}
<SubmitProgress doing={uploading} done={uploaded} />
