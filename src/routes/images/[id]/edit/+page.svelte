<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { LayoutServerData } from "../$types";
	import EditMeta from "../../../../component/widget/EditMeta.svelte";
	import { Check } from "radix-icons-svelte";
	import { Button } from "flowbite-svelte";
	export let data: LayoutServerData;

	$: ({ image } = data);

	$: meta = {
		tags: [],
		category: image.category,
	};

	const onClick = async () => {
		fetch("./edit", {
			method: "PATCH",
			body: JSON.stringify(meta),
		}).then(async (response) => {
			const text = await response.text();
			let resp = JSON.parse(text);
		});
	};
</script>

<h1 class="title-page text-center my-6">{$_("page.image.edit.title")}</h1>

<EditMeta {meta} />

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
