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

<div class="m-8 text-xl font-black text-center">
	{$_("page.image.edit.title")}
</div>

<EditMeta {meta} />
<div class="m-8 flex items-center justify-center gap-4">
	<Button size="sm" pill on:click={onClick}
		>{$_("page.image.edit.do_edit")}</Button
	>
</div>

<code>
	<pre>{#if image}{JSON.stringify(image, null, 2)}{/if}</pre>
</code>
