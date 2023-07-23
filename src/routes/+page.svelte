<script lang="ts">
	import { Container, Center, Grid, Flex } from "@svelteuidev/core";
	import { Button } from "@svelteuidev/core";
	import { Progress } from "@svelteuidev/core";
	import type { Image } from "$lib/types";
	import { nanoid } from "nanoid";
	import { upload_proxy as uploadImage } from "$lib/proxy";

	let files: FileList;
	let placeholder: Boolean = true;
	let images: Image[] = [];
	let uploading: Boolean = false;
	let uploaded = 0;

	function onChange() {
		if (files) {
			placeholder = false;
			uploaded = 0;
			images = [];
			for (const file of files) {
				const reader = new FileReader();
				reader.addEventListener("load", function () {
					const fileExt = file.name.split(".").pop();
					const image: Image = {
						src: reader.result,
						file: file,
						alt: nanoid(),
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
				let resp = await uploadImage(image);
				uploaded_cnt += 1;
				uploaded = (uploaded_cnt / files.length) * 100;
			});
		}
	}
</script>

<Container class="w-2/3">
	<Flex class="h-screen" justify="center" align="center" direction="column">
		<Center class="m-8 text-xl font-black">Upload Images</Center>
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
				<label for="uploads" class="w-full cursor-pointer">Select</label
				>
			</Button>
			<Button type="submit" color="teal" ripple on:click={doUpload}
				>Upload</Button
			>
		</Flex>
		{#if placeholder}
			<label for="uploads" class="h-64 w-full">
				<Flex
					class="h-64 w-full border-dashed border-zinc-300 border-2 rounded-lg text-lg text-slate-300"
					justify="center"
					align="center"
					direction="column"
				>
					Image Placeholder
				</Flex>
			</label>
		{:else}
			<Grid class="h-64 w-full overflow-y-auto ">
				{#each images as image}
					<Grid.Col span={3}>
						<figure>
							<img src={String(image.src)} alt={image.alt} />
						</figure>
					</Grid.Col>
				{/each}
			</Grid>
		{/if}
		{#if uploading}
			<Progress class="w-full my-4" size="lg" tween value={uploaded} />
		{/if}
	</Flex>
</Container>
