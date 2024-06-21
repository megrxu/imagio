<script lang="ts">
	import {
		Center,
		Flex,
		Button,
		Alert,
		Notification,
	} from "@svelteuidev/core";
	import { _ } from "svelte-i18n";
	import type { LayoutServerData } from "../$types";
	import EditMeta from "../../../../component/widget/EditMeta.svelte";
	import { Check } from "radix-icons-svelte";
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

<Center class="m-8 text-xl font-black">{$_("page.image.edit.title")}</Center>

<EditMeta {meta} />
<Flex class="m-8" justify="center" align="center" gap="xl">
	<Button type="submit" ripple on:click={onClick}
		>{$_("page.image.edit.do_edit")}</Button
	>
</Flex>

<code>
	<pre>{#if image}{JSON.stringify(image, null, 2)}{/if}</pre>
</code>
