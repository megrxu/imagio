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
	import EditMeta from "../../../../../component/widget/EditMeta.svelte";
	import { Check } from "radix-icons-svelte";
	export let data: LayoutServerData;

	$: ({ image, category } = data);

	let meta = data.image?.meta ?? {
		tags: [],
		category: category,
	};

	let alert: string | null = null;
	let info: string | null = null;

	const onClick = async () => {
		fetch("./edit", {
			method: "PATCH",
			body: JSON.stringify(meta),
		}).then(async (response) => {
			const text = await response.text();
			let resp = JSON.parse(text);
			if (!resp.success) {
				alert = $_("page.image.edit.edit_error");
			} else {
				info = $_("page.image.edit.edit_ok");
			}
		});
	};
</script>

<Center class="m-8 text-xl font-black">{$_("page.image.edit.title")}</Center>
{#if alert}
	<Alert title={$_("general.notification.alert")}>
		{alert}
	</Alert>
{/if}
{#if info}
	<Notification>
		{info}
	</Notification>
{/if}
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
