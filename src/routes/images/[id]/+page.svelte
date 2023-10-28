<script lang="ts">
	import { Center, Chip } from "@svelteuidev/core";
	import { _ } from "svelte-i18n";
	import type { LayoutServerData } from "./$types";
	export let data: LayoutServerData;

	$: ({ image } = data);
</script>

<Center class="m-8 text-xl font-black">{$_("page.image.view.title")}</Center>

<code>
	<pre>{#if image}{JSON.stringify(image, null, 2)}{/if}</pre>
</code>
