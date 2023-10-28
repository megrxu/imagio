<script lang="ts">
	import {
		Center,
		Chip,
		Flex,
		Button,
		NativeSelect,
		Input,
	} from "@svelteuidev/core";
	import { _ } from "svelte-i18n";
	import type { LayoutServerData } from "../$types";
	import EditMeta from "../../../../component/widget/EditMeta.svelte";

	export let data: LayoutServerData;

	$: ({ image } = data);

	$: meta = data.image?.meta ?? {
		tags: [],
		category: "private",
	};

	const onClick = async () => {
		fetch("./edit", {
			method: "PATCH",
			body: JSON.stringify(meta),
		}).then((response) => {
			console.log(response);
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
	<pre>{JSON.stringify(meta, null, 2)}</pre>
</code>
<code>
	<pre>{#if image}{JSON.stringify(image, null, 2)}{/if}</pre>
</code>
