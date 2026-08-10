<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { LayoutServerData } from "../$types";
	import EditMeta from "../../../../component/widget/EditMeta.svelte";
	import { Button } from "flowbite-svelte";
	export let data: LayoutServerData;

	$: ({ image } = data);

	$: meta = {
		tags: image?.meta?.tags ?? [],
		category: image?.category ?? "public",
		originalName: image?.name ?? "",
		uploadedAt: image?.uploadedAt ?? "",
	};

	const onClick = async () => {
		const payload = {
			tags: meta.tags,
			category: meta.category,
			originalName: meta.originalName?.trim() || undefined,
			uploadedAt: meta.uploadedAt?.trim() || undefined,
		};

		fetch("./edit", {
			method: "PATCH",
			body: JSON.stringify(payload),
		}).then(async (response) => {
			const text = await response.text();
			const resp = JSON.parse(text);
			if (resp) {
				meta = {
					tags: resp.meta?.tags ?? [],
					category: resp.category ?? "public",
					originalName: resp.name ?? "",
					uploadedAt: resp.uploadedAt ?? "",
				};
			}
		});
	};
</script>

<h1 class="title-page text-center my-6">{$_("page.image.edit.title")}</h1>

<EditMeta {meta} showCustomFields={true} />

<div class="action-bar justify-center">
	<Button size="sm" pill on:click={onClick}>
		{$_("page.image.edit.do_edit")}
	</Button>
</div>

<div class="card mb-6">
	<div class="card-body overflow-x-auto">
		<pre class="text-xs whitespace-pre-wrap">{#if image}{JSON.stringify(image, null, 2)}{/if}</pre>
	</div>
</div>
